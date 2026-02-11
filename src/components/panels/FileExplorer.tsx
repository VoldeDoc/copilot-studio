'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileCode, 
  Folder, 
  FolderOpen, 
  ChevronRight, 
  ChevronDown,
  File,
  RefreshCw,
  Home,
  ArrowLeft,
  Loader2,
  AlertCircle,
  FileText,
  FileJson,
  FileType,
  Code,
  Image
} from 'lucide-react';
import { Card, CardHeader, CardTitle, Button, Badge } from '@/components/ui';
import { useAuthStore, useActivityStore } from '@/stores';
import { cn } from '@/lib/utils';

interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size?: number;
  sha?: string;
}

interface FileContent {
  type: 'file';
  name: string;
  path: string;
  content: string;
  size: number;
  sha: string;
}

// Get icon based on file extension
function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
    case 'tsx':
      return <FileCode size={16} className="text-blue-400" />;
    case 'js':
    case 'jsx':
      return <FileCode size={16} className="text-yellow-400" />;
    case 'json':
      return <FileJson size={16} className="text-amber-400" />;
    case 'md':
    case 'mdx':
      return <FileText size={16} className="text-zinc-400" />;
    case 'css':
    case 'scss':
    case 'sass':
      return <FileType size={16} className="text-pink-400" />;
    case 'html':
      return <Code size={16} className="text-orange-400" />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
      return <Image size={16} className="text-green-400" />;
    default:
      return <File size={16} className="text-zinc-500" />;
  }
}

export function FileExplorer() {
  const { selectedRepository, selectedBranch, selectedFile, setSelectedFile } = useAuthStore();
  const { addActivity } = useActivityStore();
  
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [pathHistory, setPathHistory] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [fileContent, setFileContent] = useState<FileContent | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);

  // Fetch files when repository or path changes
  useEffect(() => {
    if (selectedRepository) {
      fetchFiles(currentPath);
    }
  }, [selectedRepository, selectedBranch, currentPath]);

  const fetchFiles = async (path: string) => {
    if (!selectedRepository) return;

    setIsLoading(true);
    setError(null);

    try {
      const url = `/api/repos/${selectedRepository.owner}/${selectedRepository.name}/contents?path=${encodeURIComponent(path)}&ref=${selectedBranch || 'main'}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        // Sort: folders first, then files alphabetically
        const sortedFiles = data.data.files?.sort((a: FileItem, b: FileItem) => {
          if (a.type === 'dir' && b.type !== 'dir') return -1;
          if (a.type !== 'dir' && b.type === 'dir') return 1;
          return a.name.localeCompare(b.name);
        }) || [];
        setFiles(sortedFiles);
      } else {
        setError(data.error || 'Failed to load files');
      }
    } catch (err) {
      setError('Failed to fetch repository contents');
      console.error('Error fetching files:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFileContent = async (file: FileItem) => {
    if (!selectedRepository || file.type === 'dir') return;

    setIsLoadingFile(true);
    setFileContent(null);

    try {
      const url = `/api/repos/${selectedRepository.owner}/${selectedRepository.name}/contents?path=${encodeURIComponent(file.path)}&ref=${selectedBranch || 'main'}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success && data.data.type === 'file') {
        setFileContent(data.data);
        setSelectedFile({
          name: data.data.name,
          path: data.data.path,
          content: data.data.content
        });
        
        addActivity({
          type: 'file',
          title: 'File Selected',
          description: `Opened ${data.data.name}`,
        });
      }
    } catch (err) {
      console.error('Error fetching file content:', err);
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleFolderClick = (folder: FileItem) => {
    if (folder.type === 'dir') {
      setPathHistory([...pathHistory, currentPath]);
      setCurrentPath(folder.path);
      setFileContent(null);
    }
  };

  const handleFileClick = (file: FileItem) => {
    if (file.type === 'file') {
      fetchFileContent(file);
    } else {
      handleFolderClick(file);
    }
  };

  const goBack = () => {
    if (pathHistory.length > 0) {
      const previousPath = pathHistory[pathHistory.length - 1];
      setPathHistory(pathHistory.slice(0, -1));
      setCurrentPath(previousPath);
      setFileContent(null);
    }
  };

  const goToRoot = () => {
    setCurrentPath('');
    setPathHistory([]);
    setFileContent(null);
  };

  const refresh = () => {
    fetchFiles(currentPath);
  };

  // Format file size
  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!selectedRepository) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="shrink-0">
          <div className="flex items-center gap-2">
            <Folder size={16} className="text-violet-400" />
            <CardTitle>File Explorer</CardTitle>
          </div>
        </CardHeader>
        <div className="flex-1 flex items-center justify-center text-zinc-500">
          <div className="text-center p-6">
            <Folder size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Select a repository to browse files</p>
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
            <Folder size={16} className="text-violet-400" />
            <CardTitle>File Explorer</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToRoot}
              disabled={!currentPath}
              className="h-7 w-7 p-0"
              title="Go to root"
            >
              <Home size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={goBack}
              disabled={pathHistory.length === 0}
              className="h-7 w-7 p-0"
              title="Go back"
            >
              <ArrowLeft size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={refresh}
              disabled={isLoading}
              className="h-7 w-7 p-0"
              title="Refresh"
            >
              <RefreshCw size={14} className={cn(isLoading && 'animate-spin')} />
            </Button>
          </div>
        </div>
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-xs text-zinc-500 mt-2 overflow-x-auto">
          <button 
            onClick={goToRoot}
            className="hover:text-violet-400 transition-colors shrink-0"
          >
            {selectedRepository.name}
          </button>
          {currentPath.split('/').filter(Boolean).map((part, index, arr) => (
            <span key={index} className="flex items-center shrink-0">
              <ChevronRight size={12} className="mx-1" />
              <button
                onClick={() => {
                  const newPath = arr.slice(0, index + 1).join('/');
                  setCurrentPath(newPath);
                }}
                className="hover:text-violet-400 transition-colors"
              >
                {part}
              </button>
            </span>
          ))}
        </div>
      </CardHeader>

      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* File List */}
        <div className={cn(
          "overflow-y-auto border-r border-zinc-800",
          fileContent ? "w-1/3" : "w-full"
        )}>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-32 text-red-400 p-4">
              <AlertCircle size={24} className="mb-2" />
              <p className="text-sm text-center">{error}</p>
              <Button variant="ghost" size="sm" onClick={refresh} className="mt-2">
                Try again
              </Button>
            </div>
          ) : files.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-zinc-500">
              <p className="text-sm">No files found</p>
            </div>
          ) : (
            <div className="py-1">
              {files.map((file) => (
                <motion.button
                  key={file.path}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => handleFileClick(file)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-zinc-800/50 transition-colors",
                    selectedFile?.path === file.path && "bg-violet-500/10 border-l-2 border-violet-500"
                  )}
                >
                  {file.type === 'dir' ? (
                    <FolderOpen size={16} className="text-amber-400 shrink-0" />
                  ) : (
                    getFileIcon(file.name)
                  )}
                  <span className="text-sm text-zinc-300 truncate flex-1">{file.name}</span>
                  {file.type === 'file' && file.size && (
                    <span className="text-xs text-zinc-600 shrink-0">{formatSize(file.size)}</span>
                  )}
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* File Content Preview */}
        {fileContent && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-zinc-900/50 border-b border-zinc-800">
              <div className="flex items-center gap-2 min-w-0">
                {getFileIcon(fileContent.name)}
                <span className="text-sm font-medium text-zinc-200 truncate">{fileContent.name}</span>
              </div>
              <Badge variant="info" size="sm">{formatSize(fileContent.size)}</Badge>
            </div>
            <div className="flex-1 overflow-auto custom-scrollbar">
              {isLoadingFile ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
                </div>
              ) : (
                <pre className="p-3 text-xs font-mono text-zinc-300 whitespace-pre-wrap">
                  {fileContent.content.split('\n').map((line, i) => (
                    <div key={i} className="flex">
                      <span className="w-8 text-zinc-600 select-none text-right pr-3">{i + 1}</span>
                      <span className="flex-1">{line}</span>
                    </div>
                  ))}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
