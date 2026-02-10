'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  GitBranch, 
  Star, 
  Lock, 
  Globe,
  ChevronDown,
  Loader2,
  FolderGit2,
  RefreshCw
} from 'lucide-react';
import { Button, Input, Badge, Card } from '@/components/ui';
import { useAuthStore } from '@/stores';
import { Repository } from '@/types';
import { cn, formatRelativeTime } from '@/lib/utils';

interface RepositorySelectorProps {
  onSelect?: (repo: Repository) => void;
}

export function RepositorySelector({ onSelect }: RepositorySelectorProps) {
  const { 
    repositories, 
    selectedRepository, 
    setRepositories, 
    selectRepository 
  } = useAuthStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Fetch repositories on mount
  useEffect(() => {
    fetchRepositories();
  }, []);

  const fetchRepositories = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/repos');
      const data = await response.json();
      if (data.success) {
        setRepositories(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch repositories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectRepository = (repo: Repository) => {
    selectRepository(repo);
    setIsOpen(false);
    onSelect?.(repo);
  };

  const filteredRepos = repositories.filter(repo =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getLanguageColor = (language: string | null) => {
    const colors: Record<string, string> = {
      TypeScript: 'bg-blue-500',
      JavaScript: 'bg-yellow-500',
      Python: 'bg-green-500',
      Rust: 'bg-orange-500',
      Go: 'bg-cyan-500',
      Java: 'bg-red-500',
    };
    return colors[language || ''] || 'bg-zinc-500';
  };

  return (
    <div className="relative">
      {/* Selected Repository Button */}
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between min-w-62.5"
      >
        <div className="flex items-center gap-2">
          <FolderGit2 size={16} className="text-violet-400" />
          {selectedRepository ? (
            <span className="truncate">{selectedRepository.fullName}</span>
          ) : (
            <span className="text-zinc-500">Select a repository</span>
          )}
        </div>
        <ChevronDown 
          size={16} 
          className={cn(
            'transition-transform duration-200',
            isOpen && 'rotate-180'
          )} 
        />
      </Button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl overflow-hidden"
          >
            {/* Search */}
            <div className="p-3 border-b border-zinc-800">
              <Input
                placeholder="Search repositories..."
                icon={<Search size={16} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-zinc-950"
              />
            </div>

            {/* Repository List */}
            <div className="max-h-80 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={24} className="animate-spin text-zinc-500" />
                </div>
              ) : filteredRepos.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  <FolderGit2 size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No repositories found</p>
                </div>
              ) : (
                filteredRepos.map((repo) => (
                  <motion.button
                    key={repo.id}
                    whileHover={{ backgroundColor: 'rgba(39, 39, 42, 0.5)' }}
                    onClick={() => handleSelectRepository(repo)}
                    className={cn(
                      'w-full flex items-start gap-3 p-3 text-left transition-colors',
                      selectedRepository?.id === repo.id && 'bg-violet-500/10'
                    )}
                  >
                    {/* Icon */}
                    <div className="mt-0.5">
                      {repo.private ? (
                        <Lock size={16} className="text-amber-400" />
                      ) : (
                        <Globe size={16} className="text-zinc-500" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-zinc-100 truncate">
                          {repo.name}
                        </span>
                        {repo.private && (
                          <Badge variant="warning" size="sm">Private</Badge>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 truncate mt-0.5">
                        {repo.description || 'No description'}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                        {repo.language && (
                          <span className="flex items-center gap-1">
                            <span className={cn('w-2 h-2 rounded-full', getLanguageColor(repo.language))} />
                            {repo.language}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Star size={12} />
                          {repo.stargazers}
                        </span>
                        <span className="flex items-center gap-1">
                          <GitBranch size={12} />
                          {repo.defaultBranch}
                        </span>
                      </div>
                    </div>
                  </motion.button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-2 border-t border-zinc-800 flex justify-between items-center">
              <span className="text-xs text-zinc-500">
                {filteredRepos.length} repositories
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={fetchRepositories}
                disabled={isLoading}
              >
                <RefreshCw size={14} className={cn(isLoading && 'animate-spin')} />
                Refresh
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
