'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Trash2, Download, Copy, Check } from 'lucide-react';
import { Card, CardHeader, CardTitle, Button } from '@/components/ui';
import { useCommandStore } from '@/stores';
import { formatTimestamp } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export function OutputConsole() {
  const { outputLines, clearOutput } = useCommandStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  // Auto-scroll to bottom on new output
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [outputLines]);

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

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center gap-2">
          <Terminal size={16} className="text-violet-400" />
          <CardTitle>Output Console</CardTitle>
        </div>
        <div className="flex items-center gap-1">
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

      {/* Console Output */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-auto bg-zinc-950 rounded-lg border border-zinc-800 mt-4 font-mono text-sm"
      >
        {outputLines.length === 0 ? (
          <div className="h-full flex items-center justify-center text-zinc-600">
            <div className="text-center">
              <Terminal size={32} className="mx-auto mb-2 opacity-50" />
              <p>No output yet</p>
              <p className="text-xs mt-1">Run a command to see results</p>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-1">
            <AnimatePresence initial={false}>
              {outputLines.map((line, index) => (
                <motion.div
                  key={line.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex gap-3 leading-relaxed"
                >
                  <span className="text-zinc-600 text-xs shrink-0 w-16 tabular-nums">
                    {formatTimestamp(line.timestamp)}
                  </span>
                  <pre className={cn('flex-1 whitespace-pre-wrap break-words', getLineStyles(line.type))}>
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
              <span className="text-zinc-600 text-xs w-16"> </span>
              <span className="text-violet-400">▊</span>
            </motion.div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between mt-3 text-xs text-zinc-500">
        <span>{outputLines.length} lines</span>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Connected</span>
        </div>
      </div>
    </Card>
  );
}
