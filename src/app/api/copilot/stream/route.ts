import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { COPILOT_COMMANDS } from '@/lib/config';

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
 * POST /api/copilot/stream
 * Execute a Copilot CLI command with streaming output
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
    const { command, input, context } = body;

    // Validate command
    if (!command || !COPILOT_COMMANDS[command as keyof typeof COPILOT_COMMANDS]) {
      return new Response(JSON.stringify({ error: 'Invalid command' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Send start event
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start', command })}\n\n`));

        // Simulate streaming AI output
        const chunks = await generateStreamingOutput(command, input);
        
        for (const chunk of chunks) {
          await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'data', content: chunk })}\n\n`));
        }

        // Send completion event
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'end', success: true })}\n\n`));
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

/**
 * Generate streaming output chunks
 */
async function generateStreamingOutput(command: string, input: string): Promise<string[]> {
  const baseChunks = [
    'Analyzing request...',
    'Processing with Copilot AI...',
    '',
  ];

  const commandOutputs: Record<string, string[]> = {
    explain: [
      '## Code Explanation\n',
      '\n',
      'This code implements a ',
      'data processing pipeline ',
      'with the following components:\n',
      '\n',
      '### Key Features:\n',
      '1. **Input validation** - ',
      'Checks data integrity\n',
      '2. **Transformation** - ',
      'Maps input to output format\n',
      '3. **Error handling** - ',
      'Graceful failure recovery\n',
      '\n',
      '✓ Analysis complete',
    ],
    generate: [
      '## Generating Code\n',
      '\n',
      '```typescript\n',
      'export function ',
      'processData<T>(',
      'input: T[]',
      '): T[] {\n',
      '  return input\n',
      '    .filter(Boolean)\n',
      '    .map(item => ({\n',
      '      ...item,\n',
      '      processed: true\n',
      '    }));\n',
      '}\n',
      '```\n',
      '\n',
      '✓ Code generated successfully',
    ],
    fix: [
      '## Analyzing Issues\n',
      '\n',
      'Found 1 potential issue:\n',
      '\n',
      '### Issue: Null Reference\n',
      '- Location: Line 12\n',
      '- Severity: High\n',
      '\n',
      '### Applied Fix:\n',
      '```diff\n',
      '- const value = obj.prop;\n',
      '+ const value = obj?.prop ?? default;\n',
      '```\n',
      '\n',
      '✓ Fix applied successfully',
    ],
    refactor: [
      '## Refactoring Code\n',
      '\n',
      '### Improvements:\n',
      '1. Extracted helper functions\n',
      '2. Improved type safety\n',
      '3. Added early returns\n',
      '4. Optimized performance\n',
      '\n',
      '```typescript\n',
      '// Refactored code\n',
      'export const process = pipe(\n',
      '  validate,\n',
      '  transform,\n',
      '  format\n',
      ');\n',
      '```\n',
      '\n',
      '✓ Refactoring complete',
    ],
    test: [
      '## Generating Tests\n',
      '\n',
      '```typescript\n',
      "describe('Component', () => {\n",
      "  it('renders correctly', () => {\n",
      '    const { getByText } = render(<Component />);\n',
      "    expect(getByText('Hello')).toBeInTheDocument();\n",
      '  });\n',
      '\n',
      "  it('handles user input', () => {\n",
      '    // Test implementation\n',
      '  });\n',
      '});\n',
      '```\n',
      '\n',
      '✓ Tests generated (2 test cases)',
    ],
    docs: [
      '## Generating Documentation\n',
      '\n',
      '```markdown\n',
      '# API Reference\n',
      '\n',
      '## Functions\n',
      '\n',
      '### processData(input)\n',
      '\n',
      'Processes input data array.\n',
      '\n',
      '**Parameters:**\n',
      '- `input` - Array of items\n',
      '\n',
      '**Returns:** Processed array\n',
      '```\n',
      '\n',
      '✓ Documentation generated',
    ],
  };

  return [...baseChunks, ...(commandOutputs[command] || ['Command executed.'])];
}
