# Copilot Studio

A modern, web-based interface for running AI-powered code transformations on your GitHub repositories. Built with Next.js 16, React 19, and TypeScript.


## Overview

Copilot Studio provides a visual interface for AI-assisted code operations. Connect your GitHub account, select a repository and file, run AI commands, review the changes in a beautiful diff viewer, and push directly to GitHub — all from your browser.

## Features

### AI-Powered Commands
- **Generate** - Create new code from natural language descriptions
- **Explain** - Get plain English explanations of complex code
- **Fix** - Automatically detect and fix bugs, add null safety
- **Refactor** - Modernize code with best practices (arrow functions, template literals, etc.)
- **Test** - Generate unit test skeletons for your code
- **Document** - Add JSDoc comments and documentation

### Visual Diff Viewer
- **Unified View** - See all changes in a single scrollable view
- **Split View** - Side-by-side comparison of original vs modified code
- **Syntax Highlighting** - Clear visual distinction between additions and deletions
- **Fullscreen Mode** - Expand to fullscreen for detailed review
- **One-Click Actions** - Apply, reject, undo, or push changes instantly

### GitHub Integration
- **OAuth Authentication** - Secure login with GitHub
- **Repository Browser** - Browse and select from your repositories
- **File Explorer** - Navigate repository file trees
- **Branch Support** - Work on any branch
- **Direct Push** - Push approved changes directly to GitHub

### Modern UI/UX
- **Dark Theme** - Easy on the eyes with zinc/violet color scheme
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Real-time Output** - Streaming command output with terminal-style display
- **Activity Timeline** - Track all actions in your session
- **Smooth Animations** - Framer Motion powered transitions

## Application Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        COPILOT STUDIO                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. AUTHENTICATION                                              │
│     • User clicks "Sign in with GitHub"                         │
│     • OAuth flow grants access to repositories                  │
│     • Session created with secure token storage                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. REPOSITORY SELECTION                                        │
│     • User selects from their GitHub repositories               │
│     • Default branch auto-selected                              │
│     • Can switch branches as needed                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. FILE SELECTION                                              │
│     • Browse repository file tree                               │
│     • Select file to work with                                  │
│     • File content fetched from GitHub API                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. COMMAND EXECUTION                                           │
│     • Choose AI command (Generate, Fix, Refactor, etc.)         │
│     • Enter prompt/instructions                                 │
│     • Command processed with file context                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. REVIEW CHANGES                                              │
│     • View output in console panel                              │
│     • Review code changes in diff viewer                        │
│     • Toggle unified/split view modes                           │
│     • Expand to fullscreen for detailed review                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. APPLY & PUSH                                                │
│     • Apply changes locally (mark as approved)                  │
│     • Push directly to GitHub repository                        │
│     • Or reject/undo if not satisfied                           │
└─────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 16** | React framework with App Router |
| **React 19** | UI library with latest features |
| **TypeScript 5** | Type-safe development |
| **Tailwind CSS 4** | Utility-first styling |
| **Zustand** | Lightweight state management |
| **Framer Motion** | Smooth animations |
| **Lucide React** | Beautiful icons |

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── auth/          # GitHub OAuth endpoints
│   │   ├── copilot/       # AI command execution
│   │   └── repos/         # Repository operations
│   ├── dashboard/         # Main application page
│   └── page.tsx           # Landing/login page
├── components/
│   ├── features/          # Feature components
│   │   ├── CompactFileSelector.tsx
│   │   ├── LoginPage.tsx
│   │   └── RepositorySelector.tsx
│   ├── layout/            # Layout components
│   │   ├── Header.tsx
│   │   ├── MainLayout.tsx
│   │   └── Sidebar.tsx
│   ├── panels/            # Dashboard panels
│   │   ├── ActivityTimeline.tsx
│   │   ├── CommandPanel.tsx
│   │   ├── DiffViewer.tsx
│   │   ├── FileExplorer.tsx
│   │   ├── GitPanel.tsx
│   │   └── OutputConsole.tsx
│   └── ui/                # Reusable UI components
│       ├── Badge.tsx
│       ├── Button.tsx
│       ├── Card.tsx
│       └── Input.tsx
├── lib/
│   ├── config.ts          # App configuration
│   └── utils.ts           # Utility functions
├── stores/                # Zustand stores
│   ├── useActivityStore.ts
│   ├── useAuthStore.ts
│   └── useCommandStore.ts
└── types/                 # TypeScript definitions
    └── index.ts
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- GitHub account
- GitHub OAuth App credentials

### Environment Variables

Create a `.env.local` file in the root directory:

```env
# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_secret_key
```

### Creating a GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name**: Copilot Studio
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. Copy the Client ID and generate a Client Secret




### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/github` | GET | Initiates GitHub OAuth flow |
| `/api/auth/callback/github` | GET | OAuth callback handler |
| `/api/auth/session` | GET | Get current session |

### Repository Operations

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/repos` | GET | List user's repositories |
| `/api/repos/[owner]/[repo]` | GET | Get repository details |
| `/api/repos/[owner]/[repo]/contents` | GET | List directory contents or get file |
| `/api/repos/[owner]/[repo]/contents` | PUT | Create or update a file |

### AI Commands

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/copilot/execute` | POST | Execute an AI command |
| `/api/copilot/stream` | POST | Stream command output (SSE) |

## Configuration

### Session Settings (`src/lib/config.ts`)

```typescript
export const SESSION_CONFIG = {
  maxAge: 60 * 60 * 1000,        // Session duration: 1 hour
  maxCommandsPerSession: 100,    // Command limit per session
  rateLimitPerMinute: 20,        // Rate limiting
};
```

### GitHub Scopes

The app requests the following GitHub OAuth scopes:
- `read:user` - Read user profile
- `user:email` - Read user email
- `repo` - Full repository access (required for push)

## Use Cases

### 1. Code Refactoring
Select a legacy JavaScript file, run the **Refactor** command, and instantly get modernized code with:
- `var` converted to `const`/`let`
- String concatenation to template literals
- Regular functions to arrow functions
- CommonJS `require` to ES6 `import`

### 2. Bug Fixing
Choose a buggy file, run the **Fix** command to automatically:
- Add optional chaining for null safety
- Fix common typos
- Add proper null checks
- Improve error handling

### 3. Documentation
Select any code file and run the **Document** command to generate:
- JSDoc comments
- File headers
- Function documentation

### 4. Test Generation
Point to any module and run the **Test** command to create:
- Test file structure
- Import statements
- Basic test skeletons with Vitest

### 5. Code Explanation
New to a codebase? Run **Explain** on any file to get a detailed breakdown of what the code does.

## Security Features

- **Short-lived Sessions** - Sessions expire after 1 hour
- **Rate Limiting** - 20 requests per minute per user
- **Input Sanitization** - All user inputs are sanitized
- **No Token Storage** - Tokens stored only in httpOnly cookies
- **Secure OAuth Flow** - Standard GitHub OAuth 2.0

