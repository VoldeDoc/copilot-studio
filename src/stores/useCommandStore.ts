import { create } from 'zustand';
import { CommandExecution, OutputLine, DiffChange } from '@/types';
import { generateId } from '@/lib/utils';

interface CommandState {
  executions: CommandExecution[];
  currentExecution: CommandExecution | null;
  outputLines: OutputLine[];
  diffChanges: DiffChange[];
  isExecuting: boolean;
  
  // Actions
  startExecution: (commandId: string, commandName: string, input: string) => string;
  appendOutput: (executionId: string, content: string, type: OutputLine['type']) => void;
  completeExecution: (executionId: string, status: 'success' | 'error') => void;
  addDiffChange: (change: Omit<DiffChange, 'id' | 'timestamp'>) => void;
  applyChange: (diffId: string) => void;
  rejectChange: (diffId: string) => void;
  undoChange: (diffId: string) => void;
  clearOutput: () => void;
  clearDiffs: () => void;
}

export const useCommandStore = create<CommandState>((set, get) => ({
  executions: [],
  currentExecution: null,
  outputLines: [],
  diffChanges: [],
  isExecuting: false,

  startExecution: (commandId, commandName, input) => {
    const id = generateId();
    const execution: CommandExecution = {
      id,
      commandId,
      commandName,
      input,
      output: '',
      status: 'running',
      startedAt: new Date(),
    };

    set((state) => ({
      executions: [execution, ...state.executions],
      currentExecution: execution,
      isExecuting: true,
      outputLines: [
        ...state.outputLines,
        {
          id: generateId(),
          content: `$ copilot ${commandName.toLowerCase()} "${input}"`,
          type: 'command',
          timestamp: new Date(),
        },
      ],
    }));

    return id;
  },

  appendOutput: (executionId, content, type) => {
    const newLine: OutputLine = {
      id: generateId(),
      content,
      type,
      timestamp: new Date(),
    };

    set((state) => ({
      outputLines: [...state.outputLines, newLine],
      executions: state.executions.map((exec) =>
        exec.id === executionId
          ? { ...exec, output: exec.output + content + '\n' }
          : exec
      ),
    }));
  },

  completeExecution: (executionId, status) => {
    const completedAt = new Date();
    
    set((state) => {
      const execution = state.executions.find((e) => e.id === executionId);
      const duration = execution
        ? completedAt.getTime() - execution.startedAt.getTime()
        : 0;

      return {
        executions: state.executions.map((exec) =>
          exec.id === executionId
            ? { ...exec, status, completedAt, duration }
            : exec
        ),
        currentExecution: null,
        isExecuting: false,
      };
    });
  },

  addDiffChange: (change) => {
    const diffChange: DiffChange = {
      ...change,
      id: generateId(),
      timestamp: new Date(),
    };

    set((state) => ({
      diffChanges: [diffChange, ...state.diffChanges],
    }));
  },

  applyChange: (diffId) => {
    set((state) => ({
      diffChanges: state.diffChanges.map((diff) =>
        diff.id === diffId ? { ...diff, applied: true } : diff
      ),
    }));
  },

  rejectChange: (diffId) => {
    set((state) => ({
      diffChanges: state.diffChanges.filter((diff) => diff.id !== diffId),
    }));
  },

  undoChange: (diffId) => {
    set((state) => ({
      diffChanges: state.diffChanges.map((diff) =>
        diff.id === diffId ? { ...diff, applied: false } : diff
      ),
    }));
  },

  clearOutput: () => set({ outputLines: [] }),
  clearDiffs: () => set({ diffChanges: [] }),
}));
