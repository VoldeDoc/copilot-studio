import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { GoogleGenAI } from '@google/genai';
import ModelClient, { isUnexpected } from '@azure-rest/ai-inference';
import { AzureKeyCredential } from '@azure/core-auth';
import { COPILOT_COMMANDS, getAIConfig, AIProvider, AI_PROVIDERS, AI_RETRY_CONFIG } from '@/lib/config';

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
    const fullPrompt = `${systemPrompt}\n\n${prompt}`;

    // ─── Branch: Gemini (native SDK) vs GitHub Models (OpenAI-compatible) ───
    if (aiConfig.provider === 'gemini') {
      return streamGemini(aiConfig.apiKey, aiConfig.model, fullPrompt, command);
    } else {
      return streamGitHubModels(aiConfig.apiKey, aiConfig.model, systemPrompt, prompt, command);
    }
  } catch (error) {
    console.error('Stream error:', error);
    return new Response(JSON.stringify({ error: 'Stream failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Stream from Gemini using native @google/genai SDK
 */
async function streamGemini(
  apiKey: string,
  model: string,
  prompt: string,
  command: string
): Promise<Response> {
  const ai = new GoogleGenAI({ apiKey });
  const geminiConfig = AI_PROVIDERS.gemini;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start', command })}\n\n`));

      let attempt = 0;
      while (attempt <= AI_RETRY_CONFIG.maxRetries) {
        try {
          const response = await ai.models.generateContentStream({
            model,
            contents: prompt,
            config: {
              maxOutputTokens: geminiConfig.maxOutputTokens,
              temperature: command === 'fix' ? 0.2 : geminiConfig.temperature,
              topP: geminiConfig.topP,
              topK: geminiConfig.topK,
            },
          });

          for await (const chunk of response) {
            const text = chunk.text;
            if (text) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'data', content: text })}\n\n`)
              );
            }
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'end', success: true })}\n\n`));
          controller.close();
          return;
        } catch (error: unknown) {
          const err = error as { status?: number; message?: string };
          if (err.status === 429 && attempt < AI_RETRY_CONFIG.maxRetries) {
            const delayMs = AI_RETRY_CONFIG.initialDelayMs * Math.pow(AI_RETRY_CONFIG.backoffMultiplier, attempt);
            console.log(`Gemini stream rate limited, retrying in ${delayMs}ms (attempt ${attempt + 1}/${AI_RETRY_CONFIG.maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            attempt++;
            continue;
          }
          console.error('Gemini stream error:', err.message || error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'end', success: false, error: err.message || 'Gemini stream failed' })}\n\n`)
          );
          controller.close();
          return;
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

/**
 * Stream from GitHub Models using @azure-rest/ai-inference SDK
 */
async function streamGitHubModels(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  command: string
): Promise<Response> {
  const client = ModelClient(
    AI_PROVIDERS.github.endpoint,
    new AzureKeyCredential(apiKey),
  );
  const encoder = new TextEncoder();

  // Non-streaming call, then simulate streaming by chunking the response
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start', command })}\n\n`));

      let attempt = 0;
      while (attempt <= AI_RETRY_CONFIG.maxRetries) {
        try {
          const response = await client.path('/chat/completions').post({
            body: {
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage },
              ],
              model,
              temperature: command === 'fix' ? 0.2 : 0.4,
              max_tokens: 4096,
            },
          });

          if (isUnexpected(response)) {
            const status = response.status;
            if (status === '429' && attempt < AI_RETRY_CONFIG.maxRetries) {
              const delayMs = AI_RETRY_CONFIG.initialDelayMs * Math.pow(AI_RETRY_CONFIG.backoffMultiplier, attempt);
              console.log(`GitHub Models stream rate limited, retrying in ${delayMs}ms (attempt ${attempt + 1}/${AI_RETRY_CONFIG.maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, delayMs));
              attempt++;
              continue;
            }
            const errorMsg = response.body?.error?.message || `API error (${status})`;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'end', success: false, error: errorMsg })}\n\n`)
            );
            controller.close();
            return;
          }

          const content = response.body.choices[0].message.content || '';
          // Simulate streaming by sending content in chunks
          const chunkSize = 20;
          for (let i = 0; i < content.length; i += chunkSize) {
            const chunk = content.slice(i, i + chunkSize);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'data', content: chunk })}\n\n`)
            );
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'end', success: true })}\n\n`));
          controller.close();
          return;
        } catch (error) {
          if (attempt < AI_RETRY_CONFIG.maxRetries) {
            const delayMs = AI_RETRY_CONFIG.initialDelayMs * Math.pow(AI_RETRY_CONFIG.backoffMultiplier, attempt);
            console.log(`GitHub Models stream error, retrying in ${delayMs}ms (attempt ${attempt + 1}/${AI_RETRY_CONFIG.maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            attempt++;
            continue;
          }
          console.error('GitHub Models stream error:', error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'end', success: false, error: 'GitHub Models stream failed' })}\n\n`)
          );
          controller.close();
          return;
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
