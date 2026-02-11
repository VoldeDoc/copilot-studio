'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Trash2, Download, Copy, Check, Maximize2, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, Button } from '@/components/ui';
import { useCommandStore } from '@/stores';
import { formatTimestamp } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export function OutputConsole() {
  const { outputLines, clearOutput } = useCommandStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Auto-scroll to bottom on new output
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [outputLines]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isExpanded]);

  const handleCopy = () => {
    const text = outputLines.map(line => line.content).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLineStyles = (type: string) => {
    switch (type) {
      case 'command':
        return 'text-violet-400 font-mono';
      case 'success':
        return 'text-emerald-400';
      case 'error':
        return 'text-red-400';
      case 'warning':
        return 'text-amber-400';
      default:
        return 'text-zinc-300';
    }
  };

  const ConsoleContent = ({ expanded = false }: { expanded?: boolean }) => (
    <>
      {/* Console Output */}
      <div 
        ref={!expanded ? scrollRef : undefined}
        className={cn(
          "flex-1 overflow-auto custom-scrollbar bg-zinc-950 rounded-lg border border-zinc-800 font-mono text-sm",
          expanded ? "text-base" : "mt-4"
        )}
      >
        {outputLines.length === 0 ? (
          <div className="h-full flex items-center justify-center text-zinc-600">
            <div className="text-center">
              <Terminal size={expanded ? 48 : 32} className="mx-auto mb-2 opacity-50" />
              <p className={expanded ? "text-lg" : ""}>No output yet</p>
              <p className={cn("mt-1", expanded ? "text-sm" : "text-xs")}>Run a command to see results</p>
            </div>
          </div>
        ) : (
          <div className={cn("space-y-1", expanded ? "p-6" : "p-4")}>
            <AnimatePresence initial={false}>
              {outputLines.map((line) => (
                <motion.div
                  key={line.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15 }}
                  className={cn("flex gap-3 leading-relaxed", expanded && "text-base")}
                >
                  <span className={cn("text-zinc-600 shrink-0 tabular-nums", expanded ? "text-sm w-20" : "text-xs w-16")}>
                    {formatTimestamp(line.timestamp)}
                  </span>
                  <pre className={cn('flex-1 whitespace-pre-wrap wrap-break-word', getLineStyles(line.type))}>
                    {line.content || ' '}
                  </pre>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Blinking cursor */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="flex gap-3"
            >
              <span className={cn("text-zinc-600", expanded ? "text-sm w-20" : "text-xs w-16")}> </span>
              <span className="text-violet-400">▊</span>
            </motion.div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className={cn("flex items-center justify-between text-zinc-500", expanded ? "mt-4 text-sm" : "mt-3 text-xs")}>
        <span>{outputLines.length} lines</span>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Connected</span>
        </div>
      </div>
    </>
  );

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader className="shrink-0">
          <div className="flex items-center gap-2">
            <Terminal size={16} className="text-violet-400" />
            <CardTitle>Output Console</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setIsExpanded(true)} title="Expand">
              <Maximize2 size={16} />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleCopy}>
              {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
            </Button>
            <Button variant="ghost" size="icon">
              <Download size={16} />
            </Button>
            <Button variant="ghost" size="icon" onClick={clearOutput}>
              <Trash2 size={16} />
            </Button>
          </div>
        </CardHeader>

        <ConsoleContent />
      </Card>

      {/* Fullscreen Modal */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 md:p-8"
            onClick={() => setIsExpanded(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full h-full max-w-7xl bg-zinc-900 rounded-xl border border-zinc-800 flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  <Terminal size={20} className="text-violet-400" />
                  <h2 className="text-lg font-semibold text-zinc-100">Output Console</h2>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={handleCopy}>
                    {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                    <span className="ml-2">Copy</span>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={clearOutput}>
                    <Trash2 size={16} />
                    <span className="ml-2">Clear</span>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setIsExpanded(false)}>
                    <X size={20} />
                  </Button>
                </div>
              </div>
              
              {/* Content */}
              <div className="flex-1 p-4 flex flex-col overflow-hidden">
                <ConsoleContent expanded />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
