'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout';
import { CommandPanel, OutputConsole, DiffViewer, ActivityTimeline } from '@/components/panels';
import { RepositorySelector } from '@/components/features';
import { useAuthStore } from '@/stores';

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user, setUser, setLoading } = useAuthStore();

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

  return (
    <MainLayout>
      <div className="h-full p-6">
        {/* Dashboard Grid */}
        <div className="grid grid-cols-12 gap-6 h-full">
          {/* Left Column - Command Panel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="col-span-12 lg:col-span-4 xl:col-span-3"
          >
            <div className="h-full flex flex-col gap-6">
              {/* Repository Selector */}
              <div className="shrink-0">
                <RepositorySelector />
              </div>
              
              {/* Command Panel */}
              <div className="flex-1 min-h-0">
                <CommandPanel />
              </div>
            </div>
          </motion.div>

          {/* Center Column - Output + Diff */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="col-span-12 lg:col-span-5 xl:col-span-6"
          >
            <div className="h-full flex flex-col gap-6">
              {/* Output Console */}
              <div className="flex-1 min-h-0">
                <OutputConsole />
              </div>
              
              {/* Diff Viewer */}
              <div className="flex-1 min-h-0">
                <DiffViewer />
              </div>
            </div>
          </motion.div>

          {/* Right Column - Activity Timeline */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="col-span-12 lg:col-span-3"
          >
            <ActivityTimeline />
          </motion.div>
        </div>
      </div>
    </MainLayout>
  );
}
