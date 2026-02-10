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
