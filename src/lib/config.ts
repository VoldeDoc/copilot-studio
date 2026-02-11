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
 * 1. GitHub Models — free with your GitHub token (uses models.inference.ai.azure.com)
 * 2. Google Gemini — free tier available (uses generativelanguage.googleapis.com)
 * 
 * Environment variables:
 * - GITHUB_TOKEN (optional) — GitHub personal access token for GitHub Models
 * - GEMINI_API_KEY (optional) — API key from Google AI Studio
 */
export type AIProvider = 'github' | 'gemini';

export const AI_PROVIDERS = {
  github: {
    id: 'github' as const,
    name: 'GitHub Models',
    baseUrl: 'https://models.inference.ai.azure.com',
    apiKey: process.env.GITHUB_TOKEN || '',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'Meta-Llama-3.1-70B-Instruct', 'Mistral-Large-2411'],
  },
  gemini: {
    id: 'gemini' as const,
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    apiKey: process.env.GEMINI_API_KEY || '',
    defaultModel: 'gemini-2.0-flash',
    models: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
  },
} as const;

/**
 * Get the config for a specific provider. Falls back to whichever provider has a key set.
 */
export function getAIConfig(provider?: AIProvider) {
  // If a specific provider is requested and has a key, use it
  if (provider && AI_PROVIDERS[provider]?.apiKey) {
    const p = AI_PROVIDERS[provider];
    return { apiKey: p.apiKey, baseUrl: p.baseUrl, model: p.defaultModel, provider: p.id };
  }

  // Otherwise, pick the first provider that has an API key
  if (AI_PROVIDERS.github.apiKey) {
    return { apiKey: AI_PROVIDERS.github.apiKey, baseUrl: AI_PROVIDERS.github.baseUrl, model: AI_PROVIDERS.github.defaultModel, provider: 'github' as const };
  }
  if (AI_PROVIDERS.gemini.apiKey) {
    return { apiKey: AI_PROVIDERS.gemini.apiKey, baseUrl: AI_PROVIDERS.gemini.baseUrl, model: AI_PROVIDERS.gemini.defaultModel, provider: 'gemini' as const };
  }

  return { apiKey: '', baseUrl: '', model: '', provider: null };
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
