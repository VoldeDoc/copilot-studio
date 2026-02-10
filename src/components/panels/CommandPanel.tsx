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
import { useCommandStore, useActivityStore } from '@/stores';
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

  const handleExecute = async () => {
    if (!selectedCommand || !inputValue.trim() || isExecuting) return;

    const executionId = startExecution(selectedCommand.id, selectedCommand.name, inputValue);
    
    addActivity({
      type: 'command',
      title: `Executed ${selectedCommand.name}`,
      description: inputValue,
    });

    // Simulate streaming output
    const responses = [
      'Analyzing request...',
      'Processing with GitHub Copilot...',
      'Generating response...',
      '',
      '```typescript',
      'export function greet(name: string): string {',
      '  return `Hello, ${name}!`;',
      '}',
      '```',
      '',
      '✓ Code generated successfully',
    ];

    for (const line of responses) {
      await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 200));
      appendOutput(executionId, line, line.startsWith('✓') ? 'success' : 'info');
    }

    // Add a sample diff change
    addDiffChange({
      filename: 'src/utils/greet.ts',
      language: 'typescript',
      before: '// TODO: implement greet function',
      after: `export function greet(name: string): string {
  return \`Hello, \${name}!\`;
}`,
      additions: 3,
      deletions: 1,
    });

    completeExecution(executionId, 'success');
    
    addActivity({
      type: 'success',
      title: 'Command completed',
      description: `${selectedCommand.name} finished in 1.2s`,
    });

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
              className="w-full h-24 bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-100 placeholder:text-zinc-500 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="default" size="sm">
                <Code size={12} />
                TypeScript
              </Badge>
              <Badge variant="default" size="sm">
                Context: Active File
              </Badge>
            </div>

            <Button
              variant="primary"
              onClick={handleExecute}
              disabled={!inputValue.trim() || isExecuting}
              isLoading={isExecuting}
            >
              {isExecuting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  Execute
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
