import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { COPILOT_COMMANDS, getAIConfig, AIProvider } from '@/lib/config';

/**
 * Helper: Get session from cookie
 */
async function getSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');
  
  if (!sessionCookie) return null;
  
  try {
    const session = JSON.parse(sessionCookie.value);
    if (Date.now() > session.expiresAt) return null;
    return session;
  } catch {
    return null;
  }
}

/**
 * Build a system prompt for the given command
 */
function buildSystemPrompt(command: string, context?: Record<string, unknown>): string {
  const fileName = (context?.fileName as string) || '';
  const language = (context?.language as string) || 'typescript';
  const baseContext = fileName
    ? `The user is working on "${fileName}" (${language}).`
    : `The user is working with ${language} code.`;

  const prompts: Record<string, string> = {
    explain: `You are an expert code explainer. ${baseContext} Provide a clear, structured markdown explanation of the actual code provided. Be specific, not generic.`,
    generate: `You are an expert code generator. ${baseContext} Generate clean, production-ready code that matches exactly what the user asked for. Wrap code in a markdown code block.`,
    fix: `You are an expert debugging assistant. ${baseContext} Find and fix actual bugs in the provided code. Return the full corrected code in a markdown code block with explanations.`,
    refactor: `You are an expert refactoring assistant. ${baseContext} Refactor the provided code for better readability, performance, and modern patterns. Return the full refactored code in a markdown code block.`,
    test: `You are an expert test writer. ${baseContext} Generate comprehensive unit tests using vitest for the provided code. Return test code in a markdown code block.`,
    docs: `You are an expert documentation writer. ${baseContext} Add thorough JSDoc/TSDoc documentation to the provided code. Return the documented code in a markdown code block.`,
  };

  return prompts[command] || `You are a helpful coding assistant. ${baseContext}`;
}

/**
 * POST /api/copilot/stream
 * Execute a Copilot command with real streaming AI output
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  
  if (!session) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { command, input, context, provider } = body;

    const aiConfig = getAIConfig(provider as AIProvider | undefined);
    if (!aiConfig.apiKey) {
      return new Response(JSON.stringify({ error: 'No AI provider configured. Add GITHUB_TOKEN or GEMINI_API_KEY to your .env file.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate command
    if (!command || !COPILOT_COMMANDS[command as keyof typeof COPILOT_COMMANDS]) {
      return new Response(JSON.stringify({ error: 'Invalid command' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const commandConfig = COPILOT_COMMANDS[command as keyof typeof COPILOT_COMMANDS];
    const fileContent = (context?.fileContent as string) || '';
    const fileName = (context?.fileName as string) || '';
    const language = (context?.language as string) || 'typescript';

    // Build the prompt from the command template
    let prompt = commandConfig.template
      .replace('{code}', input || '')
      .replace('{prompt}', input || '')
      .replace('{error}', context?.error as string || '');

    if (fileContent && !prompt.includes(fileContent)) {
      prompt = `${prompt}\n\nFile: ${fileName}\n\`\`\`${language}\n${fileContent}\n\`\`\``;
    }

    const systemPrompt = buildSystemPrompt(command, context);

    // Call AI API with streaming
    const aiResponse = await fetch(`${aiConfig.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: aiConfig.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: command === 'fix' ? 0.2 : 0.4,
        max_tokens: 4096,
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI stream error:', aiResponse.status, errorText);
      return new Response(JSON.stringify({ error: `AI API error (${aiResponse.status})` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Pipe the AI stream to the client as SSE
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        // Send start event
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start', command })}\n\n`));

        try {
          const reader = aiResponse.body?.getReader();
          if (!reader) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'data', content: 'No response from AI.' })}\n\n`));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'end', success: false })}\n\n`));
            controller.close();
            return;
          }

          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Process complete SSE lines from the AI response
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith('data: ')) continue;

              const data = trimmed.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: 'data', content })}\n\n`)
                  );
                }
              } catch {
                // Skip malformed JSON chunks
              }
            }
          }

          // Send completion event
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'end', success: true })}\n\n`));
        } catch (err) {
          console.error('Stream processing error:', err);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'end', success: false, error: 'Stream interrupted' })}\n\n`)
          );
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Stream error:', error);
    return new Response(JSON.stringify({ error: 'Stream failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
