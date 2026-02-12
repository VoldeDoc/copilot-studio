/**
 * GitHub OAuth Configuration
 * 
 * Environment variables required:
 * - GITHUB_CLIENT_ID
 * - GITHUB_CLIENT_SECRET
 * - NEXTAUTH_URL (e.g., http://localhost:3000)
 * - NEXTAUTH_SECRET
 */

export const GITHUB_CONFIG = {
  clientId: process.env.GITHUB_CLIENT_ID || '',
  clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
  scopes: ['read:user', 'user:email', 'repo'],
  authorizationUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  apiUrl: 'https://api.github.com',
};

export const SESSION_CONFIG = {
  maxAge: 60 * 60 * 1000, // 1 hour
  maxCommandsPerSession: 100,
  rateLimitPerMinute: 20,
};

/**
 * AI Provider Configuration
 * 
 * Supports two providers:
 * 1. Google Gemini — primary AI provider using native @google/genai SDK
 * 2. GitHub Models — Mistral/Codestral via @mistralai/mistralai SDK
 * 
 * Environment variables:
 * - GEMINI_API_KEY (recommended) — API key from Google AI Studio
 * - GITHUB_TOKEN (optional) — GitHub personal access token for GitHub Models
 */
export type AIProvider = 'gemini' | 'github';

export const AI_PROVIDERS = {
  gemini: {
    id: 'gemini' as const,
    name: 'Google Gemini',
    apiKey: process.env.GEMINI_API_KEY || '',
    defaultModel: 'gemini-3-flash-preview',
    models: ['gemini-3-flash-preview', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
    // Generation config
    maxOutputTokens: 8192,
    temperature: 0.7,
    topP: 0.95,
    topK: 64,
  },
  github: {
    id: 'github' as const,
    name: 'GitHub Models (Codestral)',
    endpoint: 'https://models.github.ai/inference',
    apiKey: process.env.GITHUB_TOKEN || '',
    defaultModel: 'mistral-ai/Codestral-2501',
    models: ['mistral-ai/Codestral-2501', 'mistral-ai/Mistral-Large-2411', 'mistral-ai/Mistral-Small-24B-Instruct-2501'],
    maxTokens: 4096,
    temperature: 0.4,
    topP: 1.0,
  },
} as const;

/** Max retries for rate-limited requests */
export const AI_RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 2000,
  backoffMultiplier: 2,
};

/**
 * Get the config for a specific provider. Defaults to Gemini.
 */
export function getAIConfig(provider?: AIProvider) {
  // If a specific provider is requested and has a key, use it
  if (provider && AI_PROVIDERS[provider]?.apiKey) {
    const p = AI_PROVIDERS[provider];
    return { apiKey: p.apiKey, model: p.defaultModel, provider: p.id };
  }

  // Default: prefer Gemini, then fall back to GitHub
  if (AI_PROVIDERS.gemini.apiKey) {
    return { apiKey: AI_PROVIDERS.gemini.apiKey, model: AI_PROVIDERS.gemini.defaultModel, provider: 'gemini' as const };
  }
  if (AI_PROVIDERS.github.apiKey) {
    return { apiKey: AI_PROVIDERS.github.apiKey, model: AI_PROVIDERS.github.defaultModel, provider: 'github' as const };
  }

  return { apiKey: '', model: '', provider: null };
}

export const COPILOT_COMMANDS = {
  explain: {
    id: 'explain',
    name: 'Explain',
    template: 'Explain the following code:\n\n{code}',
  },
  generate: {
    id: 'generate',
    name: 'Generate',
    template: 'Generate code for: {prompt}',
  },
  fix: {
    id: 'fix',
    name: 'Fix',
    template: 'Fix the following code:\n\n{code}\n\nError: {error}',
  },
  refactor: {
    id: 'refactor',
    name: 'Refactor',
    template: 'Refactor the following code to be more efficient:\n\n{code}',
  },
  test: {
    id: 'test',
    name: 'Test',
    template: 'Generate unit tests for:\n\n{code}',
  },
  docs: {
    id: 'docs',
    name: 'Document',
    template: 'Generate documentation for:\n\n{code}',
  },
};
