'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Command, 
  Sparkles, 
  GitBranch, 
  Terminal,
  ArrowRight,
  Shield,
  Zap,
  Code
} from 'lucide-react';
import { Button } from '@/components/ui';
import { useAuthStore } from '@/stores';
import { useRouter, useSearchParams } from 'next/navigation';

// Custom GitHub icon since lucide doesn't have it
const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </svg>
);

const features = [
  {
    icon: <Terminal size={20} />,
    title: 'AI-Powered Commands',
    description: 'Run Copilot CLI commands visually with streaming output',
  },
  {
    icon: <Code size={20} />,
    title: 'Diff Visualization',
    description: 'See before/after changes with syntax highlighting',
  },
  {
    icon: <GitBranch size={20} />,
    title: 'GitHub Integration',
    description: 'Work directly with your repositories and branches',
  },
  {
    icon: <Shield size={20} />,
    title: 'Secure Sessions',
    description: 'Isolated sessions with short-lived tokens',
  },
];

export function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading, setUser, setLoading } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  // Check for errors in URL
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(errorParam.replace(/_/g, ' '));
    }
  }, [searchParams]);

  // Check session on mount
  useEffect(() => {
    checkSession();
  }, []);

  // Redirect if authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  const checkSession = async () => {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();
      
      if (data.success) {
        setUser(data.data.user);
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  };

  const handleGitHubLogin = () => {
    window.location.href = '/api/auth/github';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-linear-to-br from-violet-600/20 via-zinc-900 to-zinc-950 p-12 flex-col justify-between relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 w-80 h-80 bg-violet-600/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl" />
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-linear-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Command size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-100">Copilot Studio</h1>
              <p className="text-sm text-zinc-400">Visual AI Workspace</p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="relative z-10 space-y-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 + 0.2 }}
              className="flex items-start gap-4"
            >
              <div className="p-2 rounded-lg bg-zinc-800/50 text-violet-400">
                {feature.icon}
              </div>
              <div>
                <h3 className="font-medium text-zinc-100">{feature.title}</h3>
                <p className="text-sm text-zinc-500">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <div className="relative z-10 text-sm text-zinc-500">
          <p>Powered by GitHub Copilot CLI</p>
        </div>
      </div>

      {/* Right Side - Login */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Command size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold text-zinc-100">Copilot Studio</span>
          </div>

          {/* Login Card */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-violet-500/10 mb-4">
                <Sparkles size={32} className="text-violet-400" />
              </div>
              <h2 className="text-2xl font-bold text-zinc-100 mb-2">Welcome Back</h2>
              <p className="text-zinc-500">
                Sign in with GitHub to start using AI-powered development tools
              </p>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
                >
                  <p className="text-sm text-red-400 text-center">
                    Authentication failed: {error}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* GitHub Login Button */}
            <Button
              variant="default"
              size="lg"
              onClick={handleGitHubLogin}
              className="w-full bg-zinc-800 hover:bg-zinc-700 border-zinc-700"
            >
              <GitHubIcon />
              <span>Continue with GitHub</span>
              <ArrowRight size={16} />
            </Button>

            {/* Permissions Notice */}
            <div className="mt-6 p-4 bg-zinc-800/30 rounded-lg">
              <p className="text-xs text-zinc-500 text-center">
                We'll request <span className="text-zinc-400">read:user</span>,{' '}
                <span className="text-zinc-400">user:email</span>, and{' '}
                <span className="text-zinc-400">repo</span> access to enable 
                AI commands on your repositories.
              </p>
            </div>

            {/* Security Notice */}
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-zinc-500">
              <Shield size={14} />
              <span>Your tokens are never stored permanently</span>
            </div>
          </div>

          {/* Terms */}
          <p className="mt-6 text-xs text-zinc-500 text-center">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </motion.div>
      </div>
    </div>
  );
}
