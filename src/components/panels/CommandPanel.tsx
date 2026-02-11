'use client';

import { useState } from 'react';
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
  Loader2
} from 'lucide-react';
import { Button, Input, Card, Badge } from '@/components/ui';
import { useCommandStore, useActivityStore, useAuthStore } from '@/stores';
import { Command } from '@/types';
import { cn } from '@/lib/utils';

const COMMANDS: Command[] = [
  { id: 'generate', name: 'Generate', description: 'Generate code from natural language', icon: 'sparkles', category: 'generate' },
  { id: 'explain', name: 'Explain', description: 'Explain code in plain English', icon: 'message', category: 'explain' },
  { id: 'fix', name: 'Fix', description: 'Fix bugs and issues in code', icon: 'wrench', category: 'fix' },
  { id: 'test', name: 'Test', description: 'Generate unit tests for code', icon: 'test', category: 'test' },
  { id: 'refactor', name: 'Refactor', description: 'Improve and optimize code', icon: 'code', category: 'refactor' },
  { id: 'docs', name: 'Document', description: 'Generate documentation', icon: 'file', category: 'docs' },
];

const iconMap = {
  sparkles: <Sparkles size={16} />,
  message: <MessageSquare size={16} />,
  wrench: <Wrench size={16} />,
  test: <TestTube size={16} />,
  code: <Code size={16} />,
  file: <FileText size={16} />,
};

export function CommandPanel() {
  const [selectedCommand, setSelectedCommand] = useState<Command | null>(COMMANDS[0]);
  const [inputValue, setInputValue] = useState('');
  const { startExecution, appendOutput, completeExecution, isExecuting, addDiffChange } = useCommandStore();
  const { addActivity } = useActivityStore();
  const { selectedFile, selectedRepository } = useAuthStore();

  const handleExecute = async () => {
    if (!selectedCommand || !inputValue.trim() || isExecuting) return;

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
            const additions = afterLines.filter((line: string, i: number) => !beforeLines[i] || line !== beforeLines[i]).length;
            const deletions = beforeLines.filter((line: string, i: number) => !afterLines[i] || line !== afterLines[i]).length;
            
            addDiffChange({
              filename: change.file || 'current.ts',
              language: change.language || 'typescript',
              before: before,
              after: after,
              additions: additions,
              deletions: deletions,
              applied: false,
              executionId: executionId,
            });
          }
        } else if (selectedCommand.category === 'generate' || selectedCommand.category === 'refactor') {
          // Add a sample diff for demonstration
          const sampleBefore = `function greet(name) {\n  console.log("Hello " + name);\n}`;
          const sampleAfter = `function greet(name: string): void {\n  console.log(\`Hello \${name}\`);\n}`;
          
          addDiffChange({
            filename: 'example.ts',
            language: 'typescript',
            before: sampleBefore,
            after: sampleAfter,
            additions: 2,
            deletions: 2,
            applied: false,
            executionId: executionId,
          });
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
    <Card className="h-full flex flex-col">
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
      <AnimatePresence mode="wait">
        {selectedCommand && (
          <motion.div
            key={selectedCommand.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="py-4 border-b border-zinc-800"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400">
                {iconMap[selectedCommand.icon as keyof typeof iconMap]}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">{selectedCommand.name}</h3>
                <p className="text-xs text-zinc-500">{selectedCommand.description}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="flex-1 flex flex-col justify-end pt-4">
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
              {selectedRepository && (
                <Badge variant="default" size="sm">
                  <span>{selectedRepository.name}</span>
                </Badge>
              )}
            </div>

            <Button
              variant="primary"
              onClick={handleExecute}
              disabled={!inputValue.trim() || isExecuting}
              isLoading={isExecuting}
              className="flex items-center justify-center gap-2 px-4 py-2 min-w-30"
            >
              {isExecuting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Running...</span>
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
    </Card>
  );
}
