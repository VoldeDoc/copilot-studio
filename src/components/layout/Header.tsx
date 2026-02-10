'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  GitBranch, 
  Cloud, 
  Search, 
  Bell,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { Button, Badge, Input } from '@/components/ui';
import { cn } from '@/lib/utils';

interface HeaderProps {
  projectName: string;
  repoName: string;
  branch: string;
  syncStatus: 'synced' | 'pending' | 'error';
  lastSync: string;
}

export function Header({ 
  projectName = 'my-project',
  repoName = 'username/repo',
  branch = 'main',
  syncStatus = 'synced',
  lastSync = '2 min ago'
}: Partial<HeaderProps>) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const statusConfig = {
    synced: {
      icon: <CheckCircle size={14} />,
      label: 'Synced',
      variant: 'success' as const,
    },
    pending: {
      icon: <Clock size={14} />,
      label: 'Syncing...',
      variant: 'warning' as const,
    },
    error: {
      icon: <AlertCircle size={14} />,
      label: 'Sync Error',
      variant: 'error' as const,
    },
  };

  const status = statusConfig[syncStatus];

  return (
    <header className="h-14 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/50 flex items-center justify-between px-4 sticky top-0 z-50">
      {/* Left: Project Info */}
      <div className="flex items-center gap-4">
        {/* Repo Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 rounded-lg border border-zinc-800">
          <Cloud size={14} className="text-zinc-500" />
          <span className="text-sm font-medium text-zinc-300">{repoName}</span>
        </div>

        {/* Branch */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/50 rounded-lg border border-zinc-800">
          <GitBranch size={14} className="text-violet-400" />
          <span className="text-sm font-medium text-zinc-300">{branch}</span>
        </div>

        {/* Sync Status */}
        <Badge variant={status.variant} pulse={syncStatus === 'pending'}>
          {status.icon}
          <span>{status.label}</span>
        </Badge>

        <span className="text-xs text-zinc-500">Last sync: {lastSync}</span>
      </div>

      {/* Center: Search */}
      <motion.div 
        className="flex-1 max-w-md mx-8"
        animate={{ scale: isSearchFocused ? 1.02 : 1 }}
      >
        <Input
          placeholder="Search commands, files, history... (⌘K)"
          icon={<Search size={16} />}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          className={cn(
            'transition-all duration-200',
            isSearchFocused && 'ring-2 ring-violet-500/50 border-violet-500'
          )}
        />
      </motion.div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Refresh */}
        <Button variant="ghost" size="icon" className="relative">
          <RefreshCw size={18} />
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-violet-500 rounded-full" />
        </Button>

        {/* User */}
        <div className="ml-2 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-sm font-medium">
            U
          </div>
        </div>
      </div>
    </header>
  );
}
