import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Repository, WorkspaceSession, Branch } from '@/types';
import { generateId } from '@/lib/utils';

interface AuthState {
  // Auth state
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Repository state
  repositories: Repository[];
  selectedRepository: Repository | null;
  branches: Branch[];
  selectedBranch: string | null;
  
  // Session state
  session: WorkspaceSession | null;
  
  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setRepositories: (repos: Repository[]) => void;
  selectRepository: (repo: Repository | null) => void;
  setBranches: (branches: Branch[]) => void;
  selectBranch: (branch: string | null) => void;
  createSession: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: true,
      repositories: [],
      selectedRepository: null,
      branches: [],
      selectedBranch: null,
      session: null,

      setUser: (user) => {
        set({ 
          user, 
          isAuthenticated: !!user,
          isLoading: false 
        });
      },

      setLoading: (isLoading) => set({ isLoading }),

      setRepositories: (repositories) => set({ repositories }),

      selectRepository: (repo) => {
        set({ 
          selectedRepository: repo,
          selectedBranch: repo?.defaultBranch || null,
          branches: []
        });
      },

      setBranches: (branches) => set({ branches }),

      selectBranch: (branch) => set({ selectedBranch: branch }),

      createSession: () => {
        const { user, selectedRepository, selectedBranch } = get();
        if (!user || !selectedRepository || !selectedBranch) return;

        const session: WorkspaceSession = {
          id: generateId(),
          userId: user.id,
          repository: selectedRepository,
          branch: selectedBranch,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
          commandCount: 0,
          maxCommands: 100,
        };

        set({ session });
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          repositories: [],
          selectedRepository: null,
          branches: [],
          selectedBranch: null,
          session: null,
        });
      },
    }),
    {
      name: 'copilot-studio-auth',
      partialize: (state) => ({
        // Only persist minimal data - no tokens
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
