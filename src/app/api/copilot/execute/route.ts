import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_CONFIG, COPILOT_COMMANDS } from '@/lib/config';

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
  // Remove potentially dangerous characters/sequences
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .slice(0, 5000); // Limit input length
}

/**
 * POST /api/copilot/execute
 * Execute a Copilot CLI command securely
 * 
 * Request body:
 * - command: string (explain, generate, fix, refactor, test, docs)
 * - input: string (prompt or code)
 * - context?: object (file path, repo info, etc.)
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
    const { command, input, context } = body;

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

    // Build the prompt
    const prompt = commandConfig.template
      .replace('{code}', sanitizedInput)
      .replace('{prompt}', sanitizedInput)
      .replace('{error}', context?.error || '');

    // Simulate Copilot CLI execution
    // In production, this would call the actual Copilot CLI agent
    const result = await simulateCopilotExecution(command, prompt, context);

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
      error: 'Command execution failed',
    }, { status: 500 });
  }
}

/**
 * Simulate Copilot CLI execution
 * Replace with actual Copilot CLI invocation in production
 */
async function simulateCopilotExecution(
  command: string,
  prompt: string,
  context?: Record<string, unknown>
) {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

  // Get the actual file content if provided
  const fileContent = context?.fileContent as string || '';
  const fileName = context?.fileName as string || 'untitled.ts';
  const filePath = context?.file as string || fileName;
  const language = context?.language as string || 'typescript';

  // Generate actual refactored/fixed code based on the input file content
  const generateChanges = () => {
    if (!fileContent) {
      return null;
    }

    // For refactor/fix commands, transform the actual code
    let transformedCode = fileContent;
    let description = '';

    if (command === 'refactor') {
      // Apply some actual transformations
      transformedCode = fileContent
        // Convert string concatenation to template literals
        .replace(/(['"])(.*?)\1\s*\+\s*(\w+)/g, '`$2${$3}`')
        // Add type annotations to function parameters if missing
        .replace(/function\s+(\w+)\s*\(\s*(\w+)\s*\)/g, 'function $1($2: any)')
        // Convert var to const/let
        .replace(/\bvar\s+/g, 'const ')
        // Add return types to functions
        .replace(/function\s+(\w+)\s*\((.*?)\)\s*{/g, 'function $1($2): void {')
        // Use arrow functions for simple callbacks
        .replace(/function\s*\(\s*\)\s*{/g, '() => {');
      description = 'Refactored code with modern JavaScript/TypeScript patterns';
    } else if (command === 'fix') {
      transformedCode = fileContent
        // Add optional chaining
        .replace(/(\w+)\.(\w+)\.(\w+)/g, '$1?.$2?.$3')
        // Add null checks
        .replace(/if\s*\(\s*(\w+)\s*\)/g, 'if ($1 != null)')
        // Fix common typos
        .replace(/cosnt/g, 'const')
        .replace(/fucntion/g, 'function');
      description = 'Fixed potential bugs and added null safety';
    } else if (command === 'generate') {
      // For generate, create new code based on the prompt
      transformedCode = `// Generated based on: ${prompt}\n\n${fileContent || '// New generated code'}`;
      description = 'Generated new code based on your request';
    }

    // Only return changes if the code actually changed
    if (transformedCode !== fileContent) {
      const beforeLines = fileContent.split('\n').length;
      const afterLines = transformedCode.split('\n').length;
      
      return [{
        file: filePath,
        filename: fileName,
        language: language,
        before: fileContent,
        after: transformedCode,
        additions: Math.max(0, afterLines - beforeLines) + Math.floor(Math.random() * 5),
        deletions: Math.max(0, beforeLines - afterLines) + Math.floor(Math.random() * 3),
        description: description,
      }];
    }

    return null;
  };

  const changes = generateChanges();

  const outputs: Record<string, { output: string; diff?: object }> = {
    explain: {
      output: `## Code Explanation

This code defines a function that processes user input and returns a formatted result.

### Key Points:
1. **Input validation** - The function checks if the input is valid
2. **Processing logic** - Data is transformed using map/filter operations
3. **Error handling** - Try/catch blocks handle potential errors
4. **Return value** - Returns a formatted object with the results

### Recommendations:
- Consider adding TypeScript types for better type safety
- Add unit tests to cover edge cases
- Consider memoization for performance optimization`,
    },
    generate: {
      output: `## Generated Code

\`\`\`typescript
import { useState, useCallback } from 'react';

interface UseFormOptions<T> {
  initialValues: T;
  onSubmit: (values: T) => Promise<void>;
  validate?: (values: T) => Partial<Record<keyof T, string>>;
}

export function useForm<T extends Record<string, unknown>>({
  initialValues,
  onSubmit,
  validate,
}: UseFormOptions<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback((field: keyof T, value: unknown) => {
    setValues(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  }, []);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (validate) {
      const validationErrors = validate(values);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validate, onSubmit]);

  return { values, errors, isSubmitting, handleChange, handleSubmit };
}
\`\`\``,
      diff: {
        filename: 'src/hooks/useForm.ts',
        before: '// New file',
        after: '// Generated useForm hook with TypeScript',
        additions: 45,
        deletions: 0,
      },
    },
    fix: {
      output: `## Bug Fix Applied

### Issue Found:
The original code had a potential null reference error when accessing nested properties.

### Fix Applied:
\`\`\`typescript
// Before (buggy):
const value = data.user.profile.name;

// After (fixed):
const value = data?.user?.profile?.name ?? 'Unknown';
\`\`\`

### Additional Improvements:
- Added optional chaining to prevent runtime errors
- Added nullish coalescing for default value
- Added type guard for better type safety`,
      diff: {
        filename: context?.file || 'src/utils/data.ts',
        before: 'const value = data.user.profile.name;',
        after: "const value = data?.user?.profile?.name ?? 'Unknown';",
        additions: 1,
        deletions: 1,
      },
    },
    refactor: {
      output: `## Refactored Code

### Changes Made:
1. Extracted repeated logic into helper functions
2. Improved variable naming for clarity
3. Added early returns to reduce nesting
4. Optimized loops using modern array methods

\`\`\`typescript
// Refactored implementation
export const processItems = (items: Item[]): ProcessedItem[] => {
  if (!items?.length) return [];
  
  return items
    .filter(isValidItem)
    .map(transformItem)
    .sort(sortByPriority);
};

const isValidItem = (item: Item): boolean => 
  item.status === 'active' && item.value > 0;

const transformItem = (item: Item): ProcessedItem => ({
  id: item.id,
  displayName: formatName(item.name),
  priority: calculatePriority(item),
});

const sortByPriority = (a: ProcessedItem, b: ProcessedItem): number =>
  b.priority - a.priority;
\`\`\``,
      diff: {
        filename: context?.file || 'src/utils/process.ts',
        before: '// Original implementation with nested loops',
        after: '// Refactored with functional approach',
        additions: 20,
        deletions: 35,
      },
    },
    test: {
      output: `## Generated Tests

\`\`\`typescript
import { describe, it, expect, vi } from 'vitest';
import { processItems } from './process';

describe('processItems', () => {
  it('should return empty array for null input', () => {
    expect(processItems(null as any)).toEqual([]);
  });

  it('should return empty array for empty input', () => {
    expect(processItems([])).toEqual([]);
  });

  it('should filter out inactive items', () => {
    const items = [
      { id: 1, status: 'active', value: 10, name: 'Test' },
      { id: 2, status: 'inactive', value: 20, name: 'Test2' },
    ];
    const result = processItems(items);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it('should filter out items with zero value', () => {
    const items = [
      { id: 1, status: 'active', value: 0, name: 'Test' },
    ];
    expect(processItems(items)).toEqual([]);
  });

  it('should sort by priority descending', () => {
    const items = [
      { id: 1, status: 'active', value: 10, name: 'Low' },
      { id: 2, status: 'active', value: 100, name: 'High' },
    ];
    const result = processItems(items);
    expect(result[0].id).toBe(2);
  });
});
\`\`\``,
      diff: {
        filename: (context?.file as string)?.replace('.ts', '.test.ts') || 'src/utils/process.test.ts',
        before: '// New test file',
        after: '// Generated unit tests',
        additions: 45,
        deletions: 0,
      },
    },
    docs: {
      output: `## Generated Documentation

\`\`\`markdown
# processItems

Processes an array of items, filtering, transforming, and sorting them.

## Usage

\\\`\\\`\\\`typescript
import { processItems } from './process';

const result = processItems(items);
\\\`\\\`\\\`

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| items | Item[] | Array of items to process |

## Returns

\`ProcessedItem[]\` - Array of processed items sorted by priority

## Example

\\\`\\\`\\\`typescript
const items = [
  { id: 1, status: 'active', value: 100, name: 'High Priority' },
  { id: 2, status: 'active', value: 50, name: 'Medium Priority' },
];

const processed = processItems(items);
// Returns: [{ id: 1, displayName: '...', priority: 100 }, ...]
\\\`\\\`\\\`

## Notes

- Items with \`status !== 'active'\` are filtered out
- Items with \`value <= 0\` are filtered out
- Results are sorted by priority (descending)
\`\`\``,
    },
  };

  const result = outputs[command] || { output: 'Command completed.' };
  
  return {
    output: result.output,
    changes: changes || null,
    executionTime: Math.floor(500 + Math.random() * 1000),
  };
}
