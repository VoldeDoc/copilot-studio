'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Sparkles, 
  Code, 
  MessageSquare, 
  Wrench, 
  TestTube, 
  FileText,
  ChevronRight,
  Loader2,
  Bot
} from 'lucide-react';
import { Button, Input, Card, Badge } from '@/components/ui';
import { useCommandStore, useActivityStore, useAuthStore } from '@/stores';
import { CompactFileSelector } from '@/components/features';
import { Command } from '@/types';
import { cn } from '@/lib/utils';

const COMMANDS: Command[] = [
  { id: 'generate', name: 'Generate', description: 'Generate code from natural language', icon: 'sparkles', category: 'generate', requiresFile: false },
  { id: 'explain', name: 'Explain', description: 'Explain code in plain English', icon: 'message', category: 'explain', requiresFile: true },
  { id: 'fix', name: 'Fix', description: 'Fix bugs and issues in code', icon: 'wrench', category: 'fix', requiresFile: true },
  { id: 'test', name: 'Test', description: 'Generate unit tests for code', icon: 'test', category: 'test', requiresFile: true },
  { id: 'refactor', name: 'Refactor', description: 'Improve and optimize code', icon: 'code', category: 'refactor', requiresFile: true },
  { id: 'docs', name: 'Document', description: 'Generate documentation', icon: 'file', category: 'docs', requiresFile: false },
];

const iconMap = {
  sparkles: <Sparkles size={16} />,
  message: <MessageSquare size={16} />,
  wrench: <Wrench size={16} />,
  test: <TestTube size={16} />,
  code: <Code size={16} />,
  file: <FileText size={16} />,
};

interface AIProviderOption {
  id: string;
  name: string;
  defaultModel: string;
  models: string[];
}

export function CommandPanel() {
  const [selectedCommand, setSelectedCommand] = useState<Command | null>(COMMANDS[0]);
  const [inputValue, setInputValue] = useState('');
  const [providers, setProviders] = useState<AIProviderOption[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const { startExecution, appendOutput, completeExecution, isExecuting, addDiffChange } = useCommandStore();
  const { addActivity } = useActivityStore();
  const { selectedFile, selectedRepository } = useAuthStore();

  // Fetch available AI providers on mount
  useEffect(() => {
    fetch('/api/copilot/providers')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data.length > 0) {
          setProviders(data.data);
          setSelectedProvider(data.data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const handleExecute = async () => {
    if (!selectedCommand || !inputValue.trim() || isExecuting) return;

    // Check if command requires a file but none is selected
    if (selectedCommand.requiresFile && !selectedFile) {
      const tempId = 'validation-' + Date.now();
      appendOutput(tempId, '⚠️ This command requires a file to be selected. Please select a file from the Context section above.', 'warning');
      addActivity({
        type: 'error',
        title: 'File Required',
        description: `${selectedCommand.name} command needs a file selected`,
      });
      return;
    }

    const executionId = startExecution(selectedCommand.id, selectedCommand.name, inputValue);
    
    addActivity({
      type: 'command',
      title: `Executing ${selectedCommand.name}`,
      description: inputValue,
    });

    try {
      // Call the actual backend API
      const response = await fetch('/api/copilot/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command: selectedCommand.category,
          input: inputValue,
          provider: selectedProvider || undefined,
          context: {
            language: selectedFile?.name?.split('.').pop() || 'typescript',
            file: selectedFile?.path || null,
            fileName: selectedFile?.name || null,
            fileContent: selectedFile?.content || null,
            repository: selectedRepository ? `${selectedRepository.owner}/${selectedRepository.name}` : null
          }
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Stream the output
        if (data.data.output) {
          const lines = data.data.output.split('\n');
          for (const line of lines) {
            if (line.trim()) {
              await new Promise(resolve => setTimeout(resolve, 50));
              appendOutput(executionId, line, 'info');
            }
          }
        }

        // Add diff changes if any
        if (data.data.changes && data.data.changes.length > 0) {
          for (const change of data.data.changes) {
            const before = change.before || '';
            const after = change.after || '';
            const beforeLines = before.split('\n');
            const afterLines = after.split('\n');
            const additions = change.additions || afterLines.filter((line: string, i: number) => !beforeLines[i] || line !== beforeLines[i]).length;
            const deletions = change.deletions || beforeLines.filter((line: string, i: number) => !afterLines[i] || line !== afterLines[i]).length;
            
            addDiffChange({
              filename: change.filename || change.file || selectedFile?.name || 'untitled.ts',
              language: change.language || selectedFile?.name?.split('.').pop() || 'typescript',
              before: before,
              after: after,
              additions: additions,
              deletions: deletions,
              applied: false,
              executionId: executionId,
            });
          }
        }

        appendOutput(executionId, '', 'info');
        appendOutput(executionId, `✓ ${selectedCommand.name} completed successfully`, 'success');
        completeExecution(executionId, 'success');
        
        addActivity({
          type: 'success',
          title: 'Command completed',
          description: `${selectedCommand.name} finished successfully`,
        });
      } else {
        appendOutput(executionId, `✗ Error: ${data.error || 'Command failed'}`, 'error');
        completeExecution(executionId, 'error');
        
        addActivity({
          type: 'error',
          title: 'Command failed',
          description: data.error || 'Unknown error occurred',
        });
      }
    } catch (error) {
      appendOutput(executionId, `✗ Network error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      completeExecution(executionId, 'error');
      
      addActivity({
        type: 'error',
        title: 'Network error',
        description: 'Failed to connect to server',
      });
    }

    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleExecute();
    }
  };

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
      {/* Command Selector */}
      <div className="pb-4 border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-100 mb-3">AI Commands</h2>
        <div className="grid grid-cols-3 gap-2">
          {COMMANDS.map((cmd) => (
            <motion.button
              key={cmd.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedCommand(cmd)}
              className={cn(
                'flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all duration-200',
                selectedCommand?.id === cmd.id
                  ? 'bg-violet-500/10 border-violet-500/50 text-violet-400'
                  : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              )}
            >
              {iconMap[cmd.icon as keyof typeof iconMap]}
              <span className="text-xs font-medium">{cmd.name}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Selected Command Info */}
      {selectedCommand && (
        <div className="py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400">
              {iconMap[selectedCommand.icon as keyof typeof iconMap]}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">{selectedCommand.name}</h3>
              <p className="text-xs text-zinc-500">{selectedCommand.description}</p>
              {selectedCommand.requiresFile && (
                <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                  <FileText size={10} />
                  File selection required
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Provider Selector */}
      {providers.length > 0 && (
        <div className="py-4 border-b border-zinc-800">
          <div className="mb-2 flex items-center gap-2">
            <Bot size={14} className="text-zinc-400" />
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">AI Provider</h3>
          </div>
          <div className="flex gap-2">
            {providers.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedProvider(p.id)}
                className={cn(
                  'flex-1 px-3 py-2 rounded-lg border text-xs font-medium transition-all duration-200',
                  selectedProvider === p.id
                    ? 'bg-violet-500/10 border-violet-500/50 text-violet-400'
                    : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                )}
              >
                <div className="text-center">
                  <div>{p.name}</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">{p.defaultModel}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* File Selector - Always visible, doesn't re-animate on command change */}
      <div className="py-4 border-b border-zinc-800">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Context</h3>
          {selectedCommand?.requiresFile && !selectedFile && (
            <Badge variant="warning" size="sm">Required</Badge>
          )}
        </div>
        <CompactFileSelector />
      </div>

      {/* Input Area */}
      <div className="pt-4">
        <div className="space-y-3">
          <div className="relative">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Enter your ${selectedCommand?.name.toLowerCase() || 'command'} request...`}
              className="w-full h-24 bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-100 placeholder:text-zinc-500 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="default" size="sm">
                <Code size={12} />
                <span className="ml-1">{selectedFile?.name?.split('.').pop()?.toUpperCase() || 'TypeScript'}</span>
              </Badge>
              <Badge variant={selectedFile ? 'info' : 'default'} size="sm">
                <span>{selectedFile ? `File: ${selectedFile.name}` : 'No file selected'}</span>
              </Badge>
              {selectedProvider && (
                <Badge variant="info" size="sm">
                  <Bot size={10} />
                  <span className="ml-1">{providers.find(p => p.id === selectedProvider)?.name || selectedProvider}</span>
                </Badge>
              )}
              {selectedRepository && (
                <Badge variant="default" size="sm">
                  <span>{selectedRepository.name}</span>
                </Badge>
              )}
            </div>

            <Button
              variant="primary"
              onClick={handleExecute}
              disabled={!inputValue.trim() || isExecuting || (selectedCommand?.requiresFile && !selectedFile)}
              isLoading={isExecuting}
              className="flex items-center justify-center gap-2 px-4 py-2 min-w-30"
              title={selectedCommand?.requiresFile && !selectedFile ? 'Select a file first' : ''}
            >
              {isExecuting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Running...</span>
                </>
              ) : selectedCommand?.requiresFile && !selectedFile ? (
                <>
                  <FileText size={16} />
                  <span>Select File First</span>
                </>
              ) : (
                <>
                  <span>Execute</span>
                  <ChevronRight size={16} />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
      </div>
    </Card>
  );
}
