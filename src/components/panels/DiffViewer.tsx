'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GitCompare, 
  Plus, 
  Minus, 
  FileCode, 
  ChevronDown, 
  Copy,
  Check,
  CheckCircle,
  XCircle,
  RotateCcw,
  Upload,
  Columns,
  Rows,
  Loader2,
  GitBranch,
  Trash2
} from 'lucide-react';
import { Card, CardHeader, CardTitle, Button, Badge } from '@/components/ui';
import { useCommandStore, useActivityStore, useAuthStore } from '@/stores';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';

type ViewMode = 'unified' | 'split';

export function DiffViewer() {
  const { diffChanges, applyChange, rejectChange, undoChange, clearDiffs } = useCommandStore();
  const { addActivity } = useActivityStore();
  const { selectedRepository, selectedBranch, selectedFile } = useAuthStore();
  const [expandedDiff, setExpandedDiff] = useState<string | null>(diffChanges[0]?.id || null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('unified');
  const [isPushing, setIsPushing] = useState<string | null>(null);

  const handleCopy = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleApply = (diffId: string, filename: string) => {
    if (applyChange) {
      applyChange(diffId);
      addActivity({
        type: 'success',
        title: 'Changes Applied',
        description: `Applied changes to ${filename}`,
      });
    }
  };

  const handleReject = (diffId: string, filename: string) => {
    if (rejectChange) {
      rejectChange(diffId);
      addActivity({
        type: 'file',
        title: 'Changes Rejected',
        description: `Rejected changes to ${filename}`,
      });
    }
  };

  const handleUndo = (diffId: string, filename: string) => {
    if (undoChange) {
      undoChange(diffId);
      addActivity({
        type: 'file',
        title: 'Changes Undone',
        description: `Reverted changes to ${filename}`,
      });
    }
  };

  const handlePushToGitHub = async (diffId: string, filename: string, newContent: string) => {
    if (!selectedRepository || !selectedBranch) {
      addActivity({
        type: 'error',
        title: 'Push Failed',
        description: 'No repository or branch selected',
      });
      return;
    }

    setIsPushing(diffId);

    try {
      // Get the file SHA first (needed for update)
      const filePath = selectedFile?.path || filename;
      const response = await fetch(
        `/api/repos/${selectedRepository.owner}/${selectedRepository.name}/contents?path=${encodeURIComponent(filePath)}&ref=${selectedBranch}`
      );
      
      let sha: string | undefined;
      if (response.ok) {
        const data = await response.json();
        sha = data.data?.sha;
      }

      // Push the new content
      const pushResponse = await fetch(
        `/api/repos/${selectedRepository.owner}/${selectedRepository.name}/contents`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: filePath,
            content: btoa(unescape(encodeURIComponent(newContent))),
            message: `Update ${filename} via Copilot Studio`,
            branch: selectedBranch,
            sha: sha,
          }),
        }
      );

      if (pushResponse.ok) {
        applyChange(diffId);
        addActivity({
          type: 'success',
          title: 'Pushed to GitHub',
          description: `Successfully pushed changes to ${filename}`,
        });
      } else {
        const errorData = await pushResponse.json();
        throw new Error(errorData.error || 'Push failed');
      }
    } catch (error) {
      addActivity({
        type: 'error',
        title: 'Push Failed',
        description: error instanceof Error ? error.message : 'Failed to push changes',
      });
    } finally {
      setIsPushing(null);
    }
  };

  // Render unified diff view - more visible line-by-line changes
  const renderUnifiedDiff = (before: string, after: string) => {
    const beforeLines = before.split('\n');
    const afterLines = after.split('\n');
    
    return (
      <div className="font-mono text-xs sm:text-sm">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900/80 border-b border-zinc-800">
          <span className="text-red-400 font-semibold">--- Original</span>
          <span className="text-zinc-600">→</span>
          <span className="text-emerald-400 font-semibold">+++ Modified</span>
        </div>
        
        {/* Unified diff content */}
        <div className="bg-zinc-950 overflow-x-auto custom-scrollbar max-h-80">
          {/* Show removed lines */}
          {beforeLines.map((line, i) => {
            const isRemoved = !afterLines.includes(line);
            if (!isRemoved) return null;
            
            return (
              <div 
                key={`rm-${i}`}
                className="flex bg-red-500/20 border-l-4 border-red-500"
              >
                <span className="w-10 sm:w-14 shrink-0 text-right pr-2 py-1.5 text-red-400/70 select-none bg-red-500/10 font-medium">
                  {i + 1}
                </span>
                <span className="px-3 py-1.5 text-red-300 whitespace-pre flex-1">
                  <Minus size={12} className="inline mr-2 text-red-500" />
                  {line || ' '}
                </span>
              </div>
            );
          })}
          
          {/* Show all lines with highlighting for additions */}
          {afterLines.map((line, i) => {
            const isAdded = !beforeLines.includes(line);
            const isUnchanged = beforeLines.includes(line);
            
            return (
              <div 
                key={`add-${i}`}
                className={cn(
                  'flex',
                  isAdded && 'bg-emerald-500/20 border-l-4 border-emerald-500',
                  isUnchanged && 'border-l-4 border-transparent hover:bg-zinc-900/50'
                )}
              >
                <span className={cn(
                  'w-10 sm:w-14 shrink-0 text-right pr-2 py-1.5 select-none font-medium',
                  isAdded ? 'text-emerald-400/70 bg-emerald-500/10' : 'text-zinc-600'
                )}>
                  {i + 1}
                </span>
                <span className={cn(
                  'px-3 py-1.5 whitespace-pre flex-1',
                  isAdded ? 'text-emerald-300' : 'text-zinc-400'
                )}>
                  {isAdded && <Plus size={12} className="inline mr-2 text-emerald-500" />}
                  {line || ' '}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render split (side-by-side) diff view
  const renderSplitDiff = (before: string, after: string) => {
    const beforeLines = before.split('\n');
    const afterLines = after.split('\n');
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-800 font-mono text-xs sm:text-sm">
        {/* Before Panel */}
        <div className="min-w-0">
          <div className="flex items-center justify-between px-3 py-2 bg-red-500/10 border-b border-zinc-800">
            <span className="text-sm font-semibold text-red-400 flex items-center gap-2">
              <Minus size={14} />
              Original Code
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2"
              onClick={() => handleCopy('before', before)}
            >
              {copiedId === 'before' ? (
                <Check size={12} className="text-emerald-400" />
              ) : (
                <Copy size={12} />
              )}
            </Button>
          </div>
          <div className="bg-zinc-950 overflow-x-auto custom-scrollbar max-h-64 sm:max-h-80">
            {beforeLines.map((line, i) => {
              const isRemoved = !afterLines.includes(line);
              return (
                <div 
                  key={i}
                  className={cn(
                    'flex',
                    isRemoved && 'bg-red-500/20'
                  )}
                >
                  <span className="w-8 sm:w-10 shrink-0 text-right pr-2 py-1.5 text-zinc-600 select-none border-r border-zinc-800 font-medium">
                    {i + 1}
                  </span>
                  <pre className={cn(
                    'px-2 py-1.5 whitespace-pre overflow-hidden text-ellipsis flex-1',
                    isRemoved ? 'text-red-300 line-through decoration-red-500/50' : 'text-zinc-500'
                  )}>
                    {line || ' '}
                  </pre>
                </div>
              );
            })}
          </div>
        </div>

        {/* After Panel */}
        <div className="min-w-0">
          <div className="flex items-center justify-between px-3 py-2 bg-emerald-500/10 border-b border-zinc-800">
            <span className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
              <Plus size={14} />
              New Code
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2"
              onClick={() => handleCopy('after', after)}
            >
              {copiedId === 'after' ? (
                <Check size={12} className="text-emerald-400" />
              ) : (
                <Copy size={12} />
              )}
            </Button>
          </div>
          <div className="bg-zinc-950 overflow-x-auto custom-scrollbar max-h-64 sm:max-h-80">
            {afterLines.map((line, i) => {
              const isAdded = !beforeLines.includes(line);
              return (
                <div 
                  key={i}
                  className={cn(
                    'flex',
                    isAdded && 'bg-emerald-500/20'
                  )}
                >
                  <span className="w-8 sm:w-10 shrink-0 text-right pr-2 py-1.5 text-zinc-600 select-none border-r border-zinc-800 font-medium">
                    {i + 1}
                  </span>
                  <pre className={cn(
                    'px-2 py-1.5 whitespace-pre overflow-hidden text-ellipsis flex-1',
                    isAdded ? 'text-emerald-300 font-medium' : 'text-zinc-400'
                  )}>
                    {line || ' '}
                  </pre>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader className="shrink-0 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <GitCompare size={16} className="text-violet-400" />
          <CardTitle>Code Changes</CardTitle>
          {diffChanges.length > 0 && (
            <Badge variant="info" size="sm">{diffChanges.length}</Badge>
          )}
        </div>
        
        {/* View Mode Toggle */}
        <div className="flex items-center gap-2">
          {diffChanges.length > 0 && (
            <>
              <div className="flex items-center bg-zinc-900 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('unified')}
                  className={cn(
                    'p-1.5 rounded transition-colors',
                    viewMode === 'unified' 
                      ? 'bg-violet-500/20 text-violet-400' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  )}
                  title="Unified View"
                >
                  <Rows size={14} />
                </button>
                <button
                  onClick={() => setViewMode('split')}
                  className={cn(
                    'p-1.5 rounded transition-colors',
                    viewMode === 'split' 
                      ? 'bg-violet-500/20 text-violet-400' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  )}
                  title="Split View"
                >
                  <Columns size={14} />
                </button>
              </div>
              <Button variant="ghost" size="icon" onClick={clearDiffs} title="Clear all">
                <Trash2 size={14} />
              </Button>
            </>
          )}
        </div>
      </CardHeader>

      {/* Diff List */}
      <div className="flex-1 overflow-auto custom-scrollbar p-2 sm:p-3 space-y-3">
        {diffChanges.length === 0 ? (
          <div className="h-full flex items-center justify-center text-zinc-600 p-4">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-900/50 flex items-center justify-center">
                <GitCompare size={32} className="opacity-50" />
              </div>
              <p className="font-medium">No code changes yet</p>
              <p className="text-xs mt-1 text-zinc-500 max-w-xs mx-auto">
                Run a command like Refactor, Fix, or Generate to see your code changes here
              </p>
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {diffChanges.map((diff) => (
              <motion.div
                key={diff.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  'border rounded-lg overflow-hidden transition-colors',
                  diff.applied 
                    ? 'border-emerald-500/30 bg-emerald-500/5' 
                    : 'border-zinc-800 bg-zinc-900/30'
                )}
              >
                {/* Diff Header */}
                <button
                  onClick={() => setExpandedDiff(expandedDiff === diff.id ? null : diff.id)}
                  className="w-full flex items-center justify-between p-3 hover:bg-zinc-900/50 transition-colors"
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className={cn(
                      'p-1.5 rounded-lg',
                      diff.applied ? 'bg-emerald-500/20' : 'bg-zinc-800'
                    )}>
                      <FileCode size={14} className={diff.applied ? 'text-emerald-400' : 'text-zinc-500'} />
                    </div>
                    <div className="min-w-0 text-left">
                      <span className="text-sm font-medium text-zinc-200 block truncate">{diff.filename}</span>
                      <div className="flex items-center gap-2 text-xs mt-0.5">
                        <span className="text-emerald-400 flex items-center gap-0.5">
                          <Plus size={10} />
                          {diff.additions}
                        </span>
                        <span className="text-red-400 flex items-center gap-0.5">
                          <Minus size={10} />
                          {diff.deletions}
                        </span>
                        <span className="text-zinc-600 hidden sm:inline">{formatRelativeTime(diff.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {diff.applied && (
                      <Badge variant="success" size="sm" className="hidden sm:flex">
                        <CheckCircle size={10} />
                        Applied
                      </Badge>
                    )}
                    <motion.div
                      animate={{ rotate: expandedDiff === diff.id ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown size={16} className="text-zinc-500" />
                    </motion.div>
                  </div>
                </button>

                {/* Expanded Diff Content */}
                <AnimatePresence>
                  {expandedDiff === diff.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden border-t border-zinc-800"
                    >
                      {/* Diff Content */}
                      {viewMode === 'unified' 
                        ? renderUnifiedDiff(diff.before, diff.after)
                        : renderSplitDiff(diff.before, diff.after)
                      }

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-3 bg-zinc-900/50 border-t border-zinc-800">
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <Badge variant="default" size="sm">{diff.language}</Badge>
                          {selectedRepository && (
                            <span className="hidden sm:flex items-center gap-1">
                              <GitBranch size={12} />
                              {selectedBranch || 'main'}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleCopy(`${diff.id}-full`, diff.after)}
                            className="flex-1 sm:flex-none"
                          >
                            {copiedId === `${diff.id}-full` ? (
                              <>
                                <Check size={14} className="text-emerald-400" />
                                <span className="ml-1">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy size={14} />
                                <span className="ml-1">Copy</span>
                              </>
                            )}
                          </Button>
                          
                          {diff.applied ? (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleUndo(diff.id, diff.filename)}
                              className="flex-1 sm:flex-none"
                            >
                              <RotateCcw size={14} />
                              <span className="ml-1">Undo</span>
                            </Button>
                          ) : (
                            <>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleReject(diff.id, diff.filename)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 flex-1 sm:flex-none"
                              >
                                <XCircle size={14} />
                                <span className="ml-1">Reject</span>
                              </Button>
                              <Button 
                                variant="primary" 
                                size="sm"
                                onClick={() => handleApply(diff.id, diff.filename)}
                                className="flex-1 sm:flex-none"
                              >
                                <CheckCircle size={14} />
                                <span className="ml-1">Apply</span>
                              </Button>
                              {selectedRepository && (
                                <Button 
                                  variant="primary" 
                                  size="sm"
                                  onClick={() => handlePushToGitHub(diff.id, diff.filename, diff.after)}
                                  disabled={isPushing === diff.id}
                                  className="bg-emerald-600 hover:bg-emerald-500 flex-1 sm:flex-none"
                                >
                                  {isPushing === diff.id ? (
                                    <>
                                      <Loader2 size={14} className="animate-spin" />
                                      <span className="ml-1">Pushing...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Upload size={14} />
                                      <span className="ml-1">Push</span>
                                    </>
                                  )}
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Summary Bar */}
      {diffChanges.length > 0 && (
        <div className="shrink-0 flex items-center justify-between p-3 border-t border-zinc-800 bg-zinc-900/30 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-zinc-500">
              {diffChanges.filter(d => d.applied).length}/{diffChanges.length} applied
            </span>
            <span className="text-emerald-400 flex items-center gap-1">
              <Plus size={12} />
              {diffChanges.reduce((acc, d) => acc + d.additions, 0)}
            </span>
            <span className="text-red-400 flex items-center gap-1">
              <Minus size={12} />
              {diffChanges.reduce((acc, d) => acc + d.deletions, 0)}
            </span>
          </div>
          {selectedRepository && (
            <span className="text-zinc-500 hidden sm:flex items-center gap-1">
              <GitBranch size={12} />
              {selectedRepository.name}/{selectedBranch || 'main'}
            </span>
          )}
        </div>
      )}
    </Card>
  );
}
