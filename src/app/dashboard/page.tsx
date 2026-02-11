'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MainLayout } from '@/components/layout';
import { CommandPanel, OutputConsole, DiffViewer, ActivityTimeline, FileExplorer, GitPanel } from '@/components/panels';
import { RepositorySelector } from '@/components/features';
import { useAuthStore } from '@/stores';
import { Sparkles, BookOpen, Zap, FileCode, GitBranch, History as HistoryIcon, Settings as SettingsIcon } from 'lucide-react';
import { Card } from '@/components/ui';

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user, setUser, setLoading } = useAuthStore();
  const [activeView, setActiveView] = useState('commands');

  // Check session on mount
  useEffect(() => {
    checkSession();
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  const checkSession = async () => {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();
      
      if (data.success) {
        setUser(data.data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
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

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  // Render different views based on active section
  const renderView = () => {
    switch (activeView) {
      case 'commands':
      case 'generate':
      case 'explain':
      case 'refactor':
        return (
          <div className="h-full overflow-hidden">
            {/* Dashboard Grid - Improved Responsive Layout */}
            <div className="flex flex-col lg:grid lg:grid-cols-12 gap-3 sm:gap-4 p-3 sm:p-4 h-full overflow-hidden">
              {/* Top Bar - Repository Selector (Mobile/Tablet) */}
              <div className="lg:hidden w-full">
                <RepositorySelector />
              </div>

              {/* Left Column - Command Panel */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="lg:col-span-5 xl:col-span-4 flex flex-col gap-3 sm:gap-4 overflow-hidden min-h-100 lg:min-h-0"
              >
                {/* Repository Selector (Desktop) */}
                <div className="hidden lg:block shrink-0">
                  <RepositorySelector />
                </div>
                
                {/* Command Panel with built-in file selector */}
                <div className="flex-1 min-h-0 overflow-hidden">
                  <CommandPanel />
                </div>
              </motion.div>

              {/* Center Column - Output */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="lg:col-span-4 xl:col-span-5 flex flex-col gap-3 sm:gap-4 overflow-hidden min-h-100 lg:min-h-0"
              >
                {/* Output Console */}
                <div className="flex-1 min-h-0 overflow-hidden">
                  <OutputConsole />
                </div>
                
                {/* Diff Viewer */}
                <div className="flex-1 min-h-0 overflow-hidden">
                  <DiffViewer />
                </div>
              </motion.div>

              {/* Right Column - Activity Timeline */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="lg:col-span-3 overflow-hidden min-h-75 lg:min-h-0"
              >
                <ActivityTimeline />
              </motion.div>
            </div>
          </div>
        );

      case 'files':
        return (
          <div className="h-full overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 h-full overflow-hidden">
              {/* Left - Repository Selector + File Explorer */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="lg:col-span-4 flex flex-col gap-4 overflow-hidden"
              >
                <div className="shrink-0">
                  <RepositorySelector />
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <FileExplorer />
                </div>
              </motion.div>

              {/* Center - Command Panel + Output */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="lg:col-span-5 flex flex-col gap-4 overflow-hidden"
              >
                <div className="flex-1 min-h-0 overflow-hidden">
                  <CommandPanel />
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <OutputConsole />
                </div>
              </motion.div>

              {/* Right - Diff Viewer */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="lg:col-span-3 overflow-hidden"
              >
                <DiffViewer />
              </motion.div>
            </div>
          </div>
        );

      case 'git':
        return (
          <div className="h-full overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 h-full overflow-hidden">
              {/* Left - Repository Selector + Git Panel */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="lg:col-span-4 flex flex-col gap-4 overflow-hidden"
              >
                <div className="shrink-0">
                  <RepositorySelector />
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <GitPanel />
                </div>
              </motion.div>

              {/* Center - File Explorer */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="lg:col-span-5 flex flex-col gap-4 overflow-hidden"
              >
                <div className="flex-1 min-h-0 overflow-hidden">
                  <FileExplorer />
                </div>
              </motion.div>

              {/* Right - Activity Timeline */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="lg:col-span-3 overflow-hidden"
              >
                <ActivityTimeline />
              </motion.div>
            </div>
          </div>
        );

      case 'history':
        return (
          <div className="h-full p-4 overflow-auto">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-lg bg-violet-500/10">
                  <HistoryIcon size={24} className="text-violet-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-zinc-100">Command History</h2>
                  <p className="text-sm text-zinc-400">View all past AI commands and their results</p>
                </div>
              </div>
              <div className="space-y-3">
                <ActivityTimeline />
              </div>
            </Card>
          </div>
        );

      case 'settings':
        return (
          <div className="h-full p-4 overflow-auto">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-lg bg-violet-500/10">
                  <SettingsIcon size={24} className="text-violet-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-zinc-100">Settings</h2>
                  <p className="text-sm text-zinc-400">Configure your workspace preferences</p>
                </div>
              </div>
              <div className="space-y-4 mt-6">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-300 mb-2">GitHub Integration</h3>
                  <p className="text-sm text-zinc-400">Connected as: {user?.login || 'Unknown'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-300 mb-2">AI Model</h3>
                  <p className="text-sm text-zinc-400">Using: GitHub Copilot</p>
                </div>
              </div>
            </Card>
          </div>
        );

      default:
        return (
          <div className="h-full p-4 overflow-auto">
            <Card className="p-6">
              <h2 className="text-xl font-bold text-zinc-100 mb-2">Welcome to Copilot Studio</h2>
              <p className="text-zinc-400">Select a section from the sidebar to get started.</p>
            </Card>
          </div>
        );
    }
  };

  return (
    <MainLayout activeSection={activeView} onSectionChange={setActiveView}>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeView}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="h-full"
        >
          {renderView()}
        </motion.div>
      </AnimatePresence>
    </MainLayout>
  );
}
