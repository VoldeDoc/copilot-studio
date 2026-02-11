'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileCode, 
  Folder,
  ChevronRight,
  ChevronDown,
  File,
  X,
  Search,
  Loader2
} from 'lucide-react';
import { Button, Input, Badge } from '@/components/ui';
import { useAuthStore } from '@/stores';
import { cn } from '@/lib/utils';

interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size?: number;
}

export function CompactFileSelector() {
  const { selectedRepository, selectedBranch, selectedFile, setSelectedFile } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (selectedRepository && isOpen) {
      fetchFiles(currentPath);
    }
  }, [selectedRepository, selectedBranch, currentPath, isOpen]);

  const fetchFiles = async (path: string) => {
    if (!selectedRepository) return;
    setIsLoading(true);

    try {
      const url = `/api/repos/${selectedRepository.owner}/${selectedRepository.name}/contents?path=${encodeURIComponent(path)}&ref=${selectedBranch || 'main'}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        const sortedFiles = data.data.files?.sort((a: FileItem, b: FileItem) => {
          if (a.type === 'dir' && b.type !== 'dir') return -1;
          if (a.type !== 'dir' && b.type === 'dir') return 1;
          return a.name.localeCompare(b.name);
        }) || [];
        setFiles(sortedFiles);
      }
    } catch (err) {
      console.error('Error fetching files:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = async (file: FileItem) => {
    if (file.type === 'dir') {
      setCurrentPath(file.path);
      return;
    }

    // Fetch file content
    try {
      const url = `/api/repos/${selectedRepository!.owner}/${selectedRepository!.name}/contents?path=${encodeURIComponent(file.path)}&ref=${selectedBranch || 'main'}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success && data.data.type === 'file') {
        setSelectedFile({
          name: data.data.name,
          path: data.data.path,
          content: data.data.content
        });
        setIsOpen(false);
        setSearchQuery('');
      }
    } catch (err) {
      console.error('Error fetching file:', err);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
  };

  const goBack = () => {
    const parts = currentPath.split('/');
    parts.pop();
    setCurrentPath(parts.join('/'));
  };

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!selectedRepository) {
    return (
      <div className="p-3 border border-zinc-800 rounded-lg bg-zinc-900/30 text-center text-zinc-500 text-sm">
        Select a repository first
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Selected File Display */}
      {selectedFile ? (
        <div className="flex items-center justify-between p-2 border border-violet-500/30 rounded-lg bg-violet-500/5">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <FileCode size={14} className="text-violet-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-zinc-200 truncate">{selectedFile.name}</p>
              <p className="text-xs text-zinc-500 truncate">{selectedFile.path}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSelection}
            className="h-6 w-6 p-0 shrink-0"
          >
            <X size={12} />
          </Button>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-3 border border-zinc-800 rounded-lg bg-zinc-900/30 hover:bg-zinc-800/50 hover:border-zinc-700 transition-all"
        >
          <div className="flex items-center gap-2">
            <Folder size={16} className="text-amber-400" />
            <span className="text-sm text-zinc-300">Select a file (optional)</span>
          </div>
          <ChevronRight size={16} className={cn(
            "text-zinc-500 transition-transform",
            isOpen && "rotate-90"
          )} />
        </button>
      )}

      {/* File Browser Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="border border-zinc-800 rounded-lg bg-zinc-900 overflow-hidden">
              {/* Search & Navigation */}
              <div className="p-2 space-y-2 border-b border-zinc-800 bg-zinc-950/50">
                {currentPath && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goBack}
                    className="w-full justify-start"
                  >
                    <ChevronDown size={14} className="-rotate-90" />
                    Back to {currentPath.split('/').slice(-2, -1)[0] || 'root'}
                  </Button>
                )}
                <Input
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  icon={<Search size={14} />}
                  className="h-8 text-sm"
                />
              </div>

              {/* File List */}
              <div className="max-h-64 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
                  </div>
                ) : filteredFiles.length === 0 ? (
                  <div className="p-4 text-center text-zinc-500 text-sm">
                    No files found
                  </div>
                ) : (
                  filteredFiles.map((file) => (
                    <button
                      key={file.path}
                      onClick={() => handleFileSelect(file)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-800/50 transition-colors border-b border-zinc-800/50 last:border-0"
                    >
                      {file.type === 'dir' ? (
                        <Folder size={14} className="text-amber-400 shrink-0" />
                      ) : (
                        <File size={14} className="text-blue-400 shrink-0" />
                      )}
                      <span className="text-sm text-zinc-300 truncate flex-1 text-left">
                        {file.name}
                      </span>
                      {file.type === 'dir' && (
                        <ChevronRight size={12} className="text-zinc-600" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Helper Text */}
      {!selectedFile && !isOpen && (
        <p className="text-xs text-zinc-600 text-center">
          Commands like <span className="text-violet-400">Explain</span> and <span className="text-violet-400">Refactor</span> need a file
        </p>
      )}
    </div>
  );
}
