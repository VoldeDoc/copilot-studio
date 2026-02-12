import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GoogleGenAI } from '@google/genai';
import { Mistral } from '@mistralai/mistralai';
import { SESSION_CONFIG, COPILOT_COMMANDS, getAIConfig, AIProvider, AI_PROVIDERS, AI_RETRY_CONFIG } from '@/lib/config';

// In-memory session tracking for rate limiting (use Redis in production)
const sessionCommands = new Map<string, { count: number; resetAt: number }>();

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
 * Helper: Check rate limit
 */
function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const userSession = sessionCommands.get(userId);
  
  if (!userSession || now > userSession.resetAt) {
    sessionCommands.set(userId, {
      count: 1,
      resetAt: now + 60 * 1000, // Reset every minute
    });
    return { allowed: true, remaining: SESSION_CONFIG.rateLimitPerMinute - 1, resetIn: 60 };
  }
  
  if (userSession.count >= SESSION_CONFIG.rateLimitPerMinute) {
    const resetIn = Math.ceil((userSession.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, resetIn };
  }
  
  userSession.count++;
  return { 
    allowed: true, 
    remaining: SESSION_CONFIG.rateLimitPerMinute - userSession.count,
    resetIn: Math.ceil((userSession.resetAt - now) / 1000)
  };
}

/**
 * Helper: Sanitize user input to prevent injection
 */
function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .slice(0, 5000);
}

/**
 * POST /api/copilot/execute
 * Execute a Copilot command using a real AI API
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  
  if (!session) {
    return NextResponse.json({
      success: false,
      error: 'Not authenticated',
    }, { status: 401 });
  }

  // Rate limiting
  const rateLimit = checkRateLimit(session.user.id);
  if (!rateLimit.allowed) {
    return NextResponse.json({
      success: false,
      error: `Rate limit exceeded. Try again in ${rateLimit.resetIn} seconds.`,
    }, { 
      status: 429,
      headers: {
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': rateLimit.resetIn.toString(),
      }
    });
  }

  try {
    const body = await request.json();
    const { command, input, context, provider } = body;

    // Validate command
    if (!command || !COPILOT_COMMANDS[command as keyof typeof COPILOT_COMMANDS]) {
      return NextResponse.json({
        success: false,
        error: 'Invalid command',
      }, { status: 400 });
    }

    // Validate and sanitize input
    if (!input || typeof input !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Input is required',
      }, { status: 400 });
    }

    const sanitizedInput = sanitizeInput(input);
    const commandConfig = COPILOT_COMMANDS[command as keyof typeof COPILOT_COMMANDS];

    // Build the prompt from the command template
    const prompt = commandConfig.template
      .replace('{code}', sanitizedInput)
      .replace('{prompt}', sanitizedInput)
      .replace('{error}', context?.error || '');

    // Call the real AI API with the selected provider
    const result = await callAI(command, prompt, context, provider as AIProvider | undefined);

    return NextResponse.json({
      success: true,
      data: {
        command,
        output: result.output,
        changes: result.changes,
        executionTime: result.executionTime,
      },
    }, {
      headers: {
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': rateLimit.resetIn.toString(),
      }
    });
  } catch (error) {
    console.error('Copilot execution error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Command execution failed',
    }, { status: 500 });
  }
}

/**
 * Build a system prompt tailored to the command type
 */
function buildSystemPrompt(command: string, context?: Record<string, unknown>): string {
  const fileName = (context?.fileName as string) || '';
  const language = (context?.language as string) || 'typescript';

  const baseContext = fileName
    ? `The user is working on a file called "${fileName}" (${language}).`
    : `The user is working with ${language} code.`;

  const systemPrompts: Record<string, string> = {
    explain: `You are an expert code explainer. ${baseContext}
Provide a clear, structured explanation of the code the user provides. Include:
- What the code does at a high level
- Key functions/components and their purpose
- Important patterns or techniques used
- Any potential issues or improvements
Use markdown formatting with headers and bullet points. Be specific to the actual code provided — do NOT give a generic explanation.`,

    generate: `You are an expert code generator. ${baseContext}
Generate clean, production-ready code based on the user's request.
- Use modern best practices for the relevant language
- Include TypeScript types where applicable
- Add brief inline comments for complex logic
- Return the generated code wrapped in a single markdown code block with the language specified
- Make sure the code is directly relevant to what the user asked for — do NOT generate unrelated code`,

    fix: `You are an expert debugging assistant. ${baseContext}
Analyze the provided code for bugs, errors, and issues. Then provide:
1. A brief summary of issues found
2. The corrected full file code in a single markdown code block
3. Brief explanation of each fix applied
Focus on actual bugs, not style preferences. Return the complete fixed file content in the code block.`,

    refactor: `You are an expert code refactoring assistant. ${baseContext}
Refactor the provided code to improve:
- Readability and maintainability
- Performance where possible
- Modern language patterns and best practices
- Type safety (for TypeScript)
Provide the complete refactored code in a single markdown code block and list the changes made below it.`,

    test: `You are an expert test writer. ${baseContext}
Generate comprehensive unit tests for the provided code using vitest (or jest).
- Cover main functionality, edge cases, and error handling
- Use descriptive test names
- Include necessary imports and setup
- Return the complete test file in a single markdown code block`,

    docs: `You are an expert documentation writer. ${baseContext}
Generate clear documentation for the provided code including:
- JSDoc/TSDoc comments for all exported functions, classes, and types
- Parameter descriptions and return types
- Usage examples where helpful
Return the fully documented version of the code in a single markdown code block.`,
  };

  return systemPrompts[command] || `You are a helpful coding assistant. ${baseContext}`;
}

/**
 * Call the AI API — uses native Gemini SDK for Gemini, OpenAI-compatible for GitHub Models
 */
async function callAI(
  command: string,
  prompt: string,
  context?: Record<string, unknown>,
  provider?: AIProvider
): Promise<{ output: string; changes: Array<Record<string, unknown>> | null; executionTime: number }> {
  const startTime = Date.now();

  const aiConfig = getAIConfig(provider);
  if (!aiConfig.apiKey) {
    throw new Error(
      'No AI provider configured. Add GEMINI_API_KEY or GITHUB_TOKEN to your .env file.'
    );
  }

  const systemPrompt = buildSystemPrompt(command, context);
  const fileContent = (context?.fileContent as string) || '';
  const fileName = (context?.fileName as string) || 'untitled.ts';
  const filePath = (context?.file as string) || fileName;
  const language = (context?.language as string) || 'typescript';

  // Build the user message — include file content if available
  let userMessage = prompt;
  if (fileContent && !prompt.includes(fileContent)) {
    userMessage = `${prompt}\n\nFile: ${fileName}\n\`\`\`${language}\n${fileContent}\n\`\`\``;
  }

  let aiOutput: string;

  if (aiConfig.provider === 'gemini') {
    // ─── Native Gemini SDK ───
    aiOutput = await callGemini(aiConfig.apiKey, aiConfig.model, systemPrompt, userMessage, command);
  } else {
    // ─── GitHub Models (OpenAI-compatible) ───
    aiOutput = await callGitHubModels(aiConfig.apiKey, aiConfig.model, systemPrompt, userMessage, command);
  }

  const executionTime = Date.now() - startTime;

  // For code-modifying commands, extract the code block to create a diff
  let changes: Array<Record<string, unknown>> | null = null;

  if (['fix', 'refactor', 'generate', 'test', 'docs'].includes(command) && fileContent) {
    const codeBlock = extractCodeBlock(aiOutput);
    if (codeBlock && codeBlock !== fileContent) {
      const diffCounts = countDiffLines(fileContent, codeBlock);
      changes = [{
        file: filePath,
        filename: fileName,
        language,
        before: fileContent,
        after: codeBlock,
        additions: diffCounts.added,
        deletions: diffCounts.removed,
        description: `${command} applied to ${fileName}`,
      }];
    }
  }

  return { output: aiOutput, changes, executionTime };
}

/**
 * Call Gemini using the native @google/genai SDK with retry on rate limits
 */
async function callGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  command: string
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const geminiConfig = AI_PROVIDERS.gemini;

  for (let attempt = 0; attempt <= AI_RETRY_CONFIG.maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: `${systemPrompt}\n\n${userMessage}`,
        config: {
          maxOutputTokens: geminiConfig.maxOutputTokens,
          temperature: command === 'fix' ? 0.2 : geminiConfig.temperature,
          topP: geminiConfig.topP,
          topK: geminiConfig.topK,
        },
      });

      return response.text || 'No response from Gemini.';
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      if (err.status === 429 && attempt < AI_RETRY_CONFIG.maxRetries) {
        const delayMs = AI_RETRY_CONFIG.initialDelayMs * Math.pow(AI_RETRY_CONFIG.backoffMultiplier, attempt);
        console.log(`Gemini rate limited, retrying in ${delayMs}ms (attempt ${attempt + 1}/${AI_RETRY_CONFIG.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }
      console.error('Gemini API error:', err.message || error);
      if (err.status === 429) {
        throw new Error('Gemini API rate limit exceeded. Please try again in a moment.');
      }
      throw new Error(`Gemini API error: ${err.message || 'Unknown error'}`);
    }
  }
  throw new Error('Max retries exceeded');
}

/**
 * Call GitHub Models using @mistralai/mistralai SDK (Codestral) with retry on rate limits
 */
async function callGitHubModels(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  command: string
): Promise<string> {
  const githubConfig = AI_PROVIDERS.github;
  const client = new Mistral({
    apiKey,
    serverURL: githubConfig.endpoint,
  });

  for (let attempt = 0; attempt <= AI_RETRY_CONFIG.maxRetries; attempt++) {
    try {
      const response = await client.chat.complete({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: command === 'fix' ? 0.2 : githubConfig.temperature,
        maxTokens: githubConfig.maxTokens,
        topP: githubConfig.topP,
      });

      return response.choices?.[0]?.message?.content as string || 'No response from GitHub Models.';
    } catch (error: unknown) {
      const err = error as { statusCode?: number; message?: string };
      if (err.statusCode === 429 && attempt < AI_RETRY_CONFIG.maxRetries) {
        const delayMs = AI_RETRY_CONFIG.initialDelayMs * Math.pow(AI_RETRY_CONFIG.backoffMultiplier, attempt);
        console.log(`GitHub Models rate limited, retrying in ${delayMs}ms (attempt ${attempt + 1}/${AI_RETRY_CONFIG.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }
      if (err.statusCode === 401) {
        throw new Error('Invalid GITHUB_TOKEN. Check your .env file.');
      }
      if (err.statusCode === 429) {
        throw new Error('GitHub Models rate limit exceeded. Please try again in a moment.');
      }
      console.error('GitHub Models API error:', err.message || error);
      throw new Error(`GitHub Models API error: ${err.message || 'Unknown error'}`);
    }
  }
  throw new Error('Max retries exceeded');
}

/**
 * Extract the first code block from AI output
 */
function extractCodeBlock(text: string): string | null {
  const match = text.match(/```[\w]*\n([\s\S]*?)```/);
  return match ? match[1].trim() : null;
}

/**
 * Count added/removed lines between two strings
 */
function countDiffLines(before: string, after: string): { added: number; removed: number } {
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  const beforeSet = new Set(beforeLines.map(l => l.trim()));
  const afterSet = new Set(afterLines.map(l => l.trim()));
  let added = 0;
  let removed = 0;
  for (const line of afterLines) {
    if (line.trim() && !beforeSet.has(line.trim())) added++;
  }
  for (const line of beforeLines) {
    if (line.trim() && !afterSet.has(line.trim())) removed++;
  }
  return { added: added || 1, removed: removed || 0 };
}
