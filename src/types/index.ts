// Core Types for Copilot Studio SaaS Platform

// ============================================
// User & Authentication Types
// ============================================

export interface User {
  id: string;
  login: string;
  name: string;
  email: string;
  avatarUrl: string;
}

export interface AuthSession {
  user: User;
  accessToken: string;
  expiresAt: Date;
}

// ============================================
// Repository Types
// ============================================

export interface Repository {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  description: string | null;
  language: string | null;
  defaultBranch: string;
  private: boolean;
  url: string;
  cloneUrl: string;
  updatedAt: string;
  stargazers: number;
}

export interface Branch {
  name: string;
  commit: {
    sha: string;
    message: string;
    author: string;
    date: string;
  };
  protected: boolean;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size?: number;
  children?: FileNode[];
}

// ============================================
// Session Types
// ============================================

export interface WorkspaceSession {
  id: string;
  userId: string;
  repository: Repository;
  branch: string;
  createdAt: Date;
  expiresAt: Date;
  commandCount: number;
  maxCommands: number;
}

// ============================================
// Command Types
// ============================================

export interface Command {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'generate' | 'explain' | 'fix' | 'test' | 'refactor' | 'docs';
  prompt?: string;
  requiresFile?: boolean;
}

export interface CommandExecution {
  id: string;
  sessionId?: string;
  commandId: string;
  commandName: string;
  input: string;
  output: string;
  targetFile?: string;
  status: 'pending' | 'running' | 'success' | 'error';
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
}

// ============================================
// Diff & Changes Types
// ============================================

export interface DiffChange {
  id: string;
  filename: string;
  language: string;
  before: string;
  after: string;
  additions: number;
  deletions: number;
  timestamp: Date;
  applied: boolean;
  executionId?: string;
}

export interface PendingChange {
  id: string;
  filename: string;
  diff: DiffChange;
  status: 'pending' | 'applied' | 'rejected';
}

// ============================================
// Activity Types
// ============================================

export interface ActivityItem {
  id: string;
  type: 'command' | 'file' | 'git' | 'error' | 'success' | 'auth' | 'repo';
  title: string;
  description: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// ============================================
// Project Types
// ============================================

export interface Project {
  name: string;
  repo: string;
  branch: string;
  status: 'synced' | 'pending' | 'error';
  lastSync: Date;
  latestCommit?: {
    sha: string;
    message: string;
    author: string;
  };
}

// ============================================
// Output Types
// ============================================

export interface OutputLine {
  id: string;
  content: string;
  type: 'info' | 'success' | 'error' | 'warning' | 'command' | 'ai';
  timestamp: Date;
}

// ============================================
// API Types
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface StreamEvent {
  type: 'start' | 'data' | 'error' | 'end';
  content?: string;
  metadata?: Record<string, unknown>;
}

export interface RateLimitInfo {
  remaining: number;
  limit: number;
  reset: Date;
}

// ============================================
// Navigation Types
// ============================================

export type NavItem = {
  id: string;
  label: string;
  icon: string;
  href: string;
  badge?: number;
};
