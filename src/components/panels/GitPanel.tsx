'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  GitBranch, 
  GitCommit, 
  GitPullRequest,
  RefreshCw,
  ChevronDown,
  Clock,
  User,
  Loader2,
  AlertCircle,
  Check,
  Circle
} from 'lucide-react';
import { Card, CardHeader, CardTitle, Button, Badge } from '@/components/ui';
import { useAuthStore, useActivityStore } from '@/stores';
import { cn } from '@/lib/utils';

interface Branch {
  name: string;
  commit: {
    sha: string;
    message: string;
  };
  protected: boolean;
}

interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
}

export function GitPanel() {
  const { selectedRepository, selectedBranch, selectBranch, branches, setBranches } = useAuthStore();
  const { addActivity } = useActivityStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState<'branches' | 'commits'>('branches');

  // Fetch branches when repository changes
  useEffect(() => {
    if (selectedRepository) {
      fetchBranches();
    }
  }, [selectedRepository]);

  // Fetch commits when branch changes
  useEffect(() => {
    if (selectedRepository && selectedBranch) {
      fetchCommits();
    }
  }, [selectedRepository, selectedBranch]);

  const fetchBranches = async () => {
    if (!selectedRepository) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/repos/${selectedRepository.owner}/${selectedRepository.name}`);
      const data = await response.json();

      if (data.success && data.data.branches) {
        setBranches(data.data.branches);
      }
    } catch (err) {
      setError('Failed to fetch branches');
      console.error('Error fetching branches:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCommits = async () => {
    if (!selectedRepository || !selectedBranch) return;

    try {
      // For now, we'll show the branch commit info we have
      // In a full implementation, you'd fetch the commit history
      const branchInfo = branches.find(b => b.name === selectedBranch);
      if (branchInfo) {
        setCommits([{
          sha: branchInfo.commit.sha.substring(0, 7),
          message: branchInfo.commit.message || 'No message',
          author: 'Unknown',
          date: new Date().toISOString()
        }]);
      }
    } catch (err) {
      console.error('Error fetching commits:', err);
    }
  };

  const handleBranchChange = (branch: string) => {
    selectBranch(branch);
    setShowBranchDropdown(false);
    addActivity({
      type: 'git',
      title: 'Branch Changed',
      description: `Switched to branch: ${branch}`,
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!selectedRepository) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="shrink-0">
          <div className="flex items-center gap-2">
            <GitBranch size={16} className="text-violet-400" />
            <CardTitle>Git</CardTitle>
          </div>
        </CardHeader>
        <div className="flex-1 flex items-center justify-center text-zinc-500">
          <div className="text-center p-6">
            <GitBranch size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Select a repository to view branches</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="shrink-0 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch size={16} className="text-violet-400" />
            <CardTitle>Git</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchBranches}
            disabled={isLoading}
            className="h-7 w-7 p-0"
          >
            <RefreshCw size={14} className={cn(isLoading && 'animate-spin')} />
          </Button>
        </div>

        {/* Current Branch Selector */}
        <div className="relative mt-3">
          <button
            onClick={() => setShowBranchDropdown(!showBranchDropdown)}
            className="w-full flex items-center justify-between px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors"
          >
            <div className="flex items-center gap-2">
              <GitBranch size={14} className="text-violet-400" />
              <span className="text-sm font-medium text-zinc-200">{selectedBranch || 'Select branch'}</span>
            </div>
            <ChevronDown size={14} className={cn(
              "text-zinc-500 transition-transform",
              showBranchDropdown && "rotate-180"
            )} />
          </button>

          {/* Branch Dropdown */}
          {showBranchDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute z-10 w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl max-h-48 overflow-y-auto"
            >
              {branches.length === 0 ? (
                <div className="p-3 text-sm text-zinc-500 text-center">No branches found</div>
              ) : (
                branches.map((branch) => (
                  <button
                    key={branch.name}
                    onClick={() => handleBranchChange(branch.name)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 hover:bg-zinc-800 transition-colors",
                      selectedBranch === branch.name && "bg-violet-500/10"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {selectedBranch === branch.name ? (
                        <Check size={14} className="text-violet-400" />
                      ) : (
                        <Circle size={14} className="text-zinc-600" />
                      )}
                      <span className="text-sm text-zinc-200">{branch.name}</span>
                    </div>
                    {branch.protected && (
                      <Badge variant="warning" size="sm">protected</Badge>
                    )}
                  </button>
                ))
              )}
            </motion.div>
          )}
        </div>
      </CardHeader>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 px-2">
        <button
          onClick={() => setActiveTab('branches')}
          className={cn(
            "flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
            activeTab === 'branches'
              ? "text-violet-400 border-violet-400"
              : "text-zinc-500 border-transparent hover:text-zinc-300"
          )}
        >
          <GitBranch size={14} />
          Branches
          <Badge variant="default" size="sm">{branches.length}</Badge>
        </button>
        <button
          onClick={() => setActiveTab('commits')}
          className={cn(
            "flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
            activeTab === 'commits'
              ? "text-violet-400 border-violet-400"
              : "text-zinc-500 border-transparent hover:text-zinc-300"
          )}
        >
          <GitCommit size={14} />
          Commits
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-32 text-red-400 p-4">
            <AlertCircle size={24} className="mb-2" />
            <p className="text-sm text-center">{error}</p>
          </div>
        ) : activeTab === 'branches' ? (
          <div className="py-2">
            {branches.map((branch) => (
              <motion.div
                key={branch.name}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={cn(
                  "px-3 py-2 border-b border-zinc-800/50 hover:bg-zinc-800/30 cursor-pointer transition-colors",
                  selectedBranch === branch.name && "bg-violet-500/5 border-l-2 border-l-violet-500"
                )}
                onClick={() => handleBranchChange(branch.name)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GitBranch size={14} className={cn(
                      selectedBranch === branch.name ? "text-violet-400" : "text-zinc-500"
                    )} />
                    <span className="text-sm font-medium text-zinc-200">{branch.name}</span>
                    {branch.protected && (
                      <Badge variant="warning" size="sm">protected</Badge>
                    )}
                  </div>
                </div>
                <div className="mt-1 ml-6 text-xs text-zinc-500 truncate">
                  {branch.commit?.message || 'No commit message'}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="py-2">
            {commits.length === 0 ? (
              <div className="p-4 text-center text-zinc-500 text-sm">
                No commits to display
              </div>
            ) : (
              commits.map((commit, index) => (
                <motion.div
                  key={commit.sha}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="px-3 py-2 border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <GitCommit size={14} className="text-zinc-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200 truncate">{commit.message}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                        <span className="font-mono text-violet-400">{commit.sha}</span>
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {formatDate(commit.date)}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
