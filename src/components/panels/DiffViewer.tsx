'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GitCompare, 
  Plus, 
  Minus, 
  FileCode, 
  ChevronDown, 
  ChevronRight,
  Copy,
  Check,
  ExternalLink,
  CheckCircle,
  XCircle,
  RotateCcw
} from 'lucide-react';
import { Card, CardHeader, CardTitle, Button, Badge } from '@/components/ui';
import { useCommandStore, useActivityStore } from '@/stores';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';

export function DiffViewer() {
  const { diffChanges, applyChange, rejectChange, undoChange } = useCommandStore();
  const { addActivity } = useActivityStore();
  const [expandedDiff, setExpandedDiff] = useState<string | null>(diffChanges[0]?.id || null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="shrink-0">
        <div className="flex items-center gap-2">
          <GitCompare size={16} className="text-violet-400" />
          <CardTitle>Diff Viewer</CardTitle>
          {diffChanges.length > 0 && (
            <Badge variant="info" size="sm">{diffChanges.length}</Badge>
          )}
        </div>
      </CardHeader>

      {/* Diff List */}
      <div className="flex-1 overflow-auto mt-4 space-y-2">
        {diffChanges.length === 0 ? (
          <div className="h-full flex items-center justify-center text-zinc-600">
            <div className="text-center">
              <GitCompare size={32} className="mx-auto mb-2 opacity-50" />
              <p>No changes yet</p>
              <p className="text-xs mt-1">Run a command to see code changes</p>
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {diffChanges.map((diff) => (
              <motion.div
                key={diff.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="border border-zinc-800 rounded-lg overflow-hidden"
              >
                {/* Diff Header */}
                <button
                  onClick={() => setExpandedDiff(expandedDiff === diff.id ? null : diff.id)}
                  className="w-full flex items-center justify-between p-3 bg-zinc-900/50 hover:bg-zinc-900 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileCode size={16} className="text-zinc-500" />
                    <span className="text-sm font-medium text-zinc-200">{diff.filename}</span>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-emerald-400 flex items-center gap-0.5">
                        <Plus size={12} />
                        {diff.additions}
                      </span>
                      <span className="text-red-400 flex items-center gap-0.5">
                        <Minus size={12} />
                        {diff.deletions}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">{formatRelativeTime(diff.timestamp)}</span>
                    {expandedDiff === diff.id ? (
                      <ChevronDown size={16} className="text-zinc-500" />
                    ) : (
                      <ChevronRight size={16} className="text-zinc-500" />
                    )}
                  </div>
                </button>

                {/* Diff Content */}
                <AnimatePresence>
                  {expandedDiff === diff.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-2 divide-x divide-zinc-800">
                        {/* Before */}
                        <div className="relative">
                          <div className="flex items-center justify-between px-3 py-2 bg-red-500/5 border-b border-zinc-800">
                            <span className="text-xs font-medium text-red-400">Before</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2"
                              onClick={() => handleCopy(`${diff.id}-before`, diff.before)}
                            >
                              {copiedId === `${diff.id}-before` ? (
                                <Check size={12} className="text-emerald-400" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </Button>
                          </div>
                          <pre className="p-3 text-xs font-mono text-zinc-400 bg-zinc-950 overflow-auto max-h-48">
                            {diff.before.split('\n').map((line, i) => (
                              <div key={i} className="flex">
                                <span className="w-6 text-zinc-600 select-none">{i + 1}</span>
                                <span className="text-red-400/70 line-through">{line}</span>
                              </div>
                            ))}
                          </pre>
                        </div>

                        {/* After */}
                        <div className="relative">
                          <div className="flex items-center justify-between px-3 py-2 bg-emerald-500/5 border-b border-zinc-800">
                            <span className="text-xs font-medium text-emerald-400">After</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2"
                              onClick={() => handleCopy(`${diff.id}-after`, diff.after)}
                            >
                              {copiedId === `${diff.id}-after` ? (
                                <Check size={12} className="text-emerald-400" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </Button>
                          </div>
                          <pre className="p-3 text-xs font-mono text-zinc-300 bg-zinc-950 overflow-auto max-h-48">
                            {diff.after.split('\n').map((line, i) => (
                              <div key={i} className="flex">
                                <span className="w-6 text-zinc-600 select-none">{i + 1}</span>
                                <span className="text-emerald-400">{line}</span>
                              </div>
                            ))}
                          </pre>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between p-2 bg-zinc-900/30 border-t border-zinc-800">
                        <div className="flex items-center gap-2">
                          {diff.applied && (
                            <Badge variant="success" size="sm">
                              <CheckCircle size={12} />
                              <span>Applied</span>
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleCopy(`${diff.id}-full`, diff.after)}
                          >
                            <Copy size={14} />
                            Copy
                          </Button>
                          {diff.applied ? (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleUndo(diff.id, diff.filename)}
                            >
                              <RotateCcw size={14} />
                              Undo
                            </Button>
                          ) : (
                            <>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleReject(diff.id, diff.filename)}
                              >
                                <XCircle size={14} />
                                Reject
                              </Button>
                              <Button 
                                variant="primary" 
                                size="sm"
                                onClick={() => handleApply(diff.id, diff.filename)}
                              >
                                <CheckCircle size={14} />
                                Apply
                              </Button>
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
    </Card>
  );
}
