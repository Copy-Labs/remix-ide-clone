import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { databaseService } from '@/services/databaseService';
import { debug, info, warn, error } from '@/services/loggerService';

/**
 * Command interface for the Command Pattern
 * Each command represents an operation that can be undone/redone
 */
export interface Command {
  execute: () => Promise<void>;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  description: string;
}

/**
 * History entry for tracking operations
 */
export interface HistoryEntry {
  id: number;
  fileId: string;
  timestamp: number;
  command: Command;
}

/**
 * State interface for the history store
 */
interface HistoryState {
  history: HistoryEntry[];
  currentIndex: number;
  maxHistorySize: number;
  isUndoing: boolean;
  isRedoing: boolean;
}

/**
 * Actions interface for the history store
 */
interface HistoryActions {
  // Command operations
  executeCommand: (command: Command, fileId: string) => Promise<void>;
  undo: () => Promise<void>;
  redo: () => Promise<void>;

  // History management
  clearHistory: () => void;
  clearFileHistory: (fileId: string) => void;
  setMaxHistorySize: (size: number) => void;

  // Utility functions
  canUndo: () => boolean;
  canRedo: () => boolean;
  getUndoDescription: () => string | null;
  getRedoDescription: () => string | null;
  getHistoryForFile: (fileId: string) => HistoryEntry[];
}

type HistoryStore = HistoryState & HistoryActions;

const initialState: HistoryState = {
  history: [],
  currentIndex: -1,
  maxHistorySize: 100, // Default max history size
  isUndoing: false,
  isRedoing: false,
};

export const useHistoryStore = create<HistoryStore>()(
  devtools(
    immer((set, get) => ({
      ...initialState,

      executeCommand: async (command: Command, fileId: string) => {
        // Don't record commands during undo/redo operations
        if (get().isUndoing || get().isRedoing) {
          return;
        }

        try {
          // Execute the command
          await command.execute();

          set((state) => {
            // If we're not at the end of the history, remove all future commands
            if (state.currentIndex < state.history.length - 1) {
              state.history = state.history.slice(0, state.currentIndex + 1);
            }

            // Add the new command to history
            const newEntry: HistoryEntry = {
              id: Date.now(),
              fileId,
              timestamp: Date.now(),
              command,
            };

            state.history.push(newEntry);

            // Limit history size
            if (state.history.length > state.maxHistorySize) {
              state.history = state.history.slice(state.history.length - state.maxHistorySize);
            }

            // Update current index
            state.currentIndex = state.history.length - 1;
          });

          // Save to IndexedDB if available
          try {
            await databaseService.saveEditorHistory({
              fileId,
              timestamp: Date.now(),
              operation: 'insert', // Simplified for storage
              data: { description: command.description },
              inverse: { description: `Undo ${command.description}` }
            });
          } catch (err) {
            // Non-critical error, just log it
            warn('HistoryStore', 'Failed to save history to IndexedDB', err);
          }
        } catch (err) {
          error('HistoryStore', `Failed to execute command: ${command.description}`, err);
          throw err;
        }
      },

      undo: async () => {
        if (!get().canUndo()) {
          return;
        }

        const { history, currentIndex } = get();
        const entry = history[currentIndex];

        try {
          set((state) => {
            state.isUndoing = true;
          });

          // Execute the undo operation
          await entry.command.undo();

          set((state) => {
            state.currentIndex--;
            state.isUndoing = false;
          });

          debug('HistoryStore', `Undid command: ${entry.command.description}`);
        } catch (err) {
          error('HistoryStore', `Failed to undo command: ${entry.command.description}`, err);

          set((state) => {
            state.isUndoing = false;
          });

          throw err;
        }
      },

      redo: async () => {
        if (!get().canRedo()) {
          return;
        }

        const { history, currentIndex } = get();
        const entry = history[currentIndex + 1];

        try {
          set((state) => {
            state.isRedoing = true;
          });

          // Execute the redo operation
          await entry.command.redo();

          set((state) => {
            state.currentIndex++;
            state.isRedoing = false;
          });

          debug('HistoryStore', `Redid command: ${entry.command.description}`);
        } catch (err) {
          error('HistoryStore', `Failed to redo command: ${entry.command.description}`, err);

          set((state) => {
            state.isRedoing = false;
          });

          throw err;
        }
      },

      clearHistory: () => {
        set((state) => {
          state.history = [];
          state.currentIndex = -1;
        });

        debug('HistoryStore', 'History cleared');
      },

      clearFileHistory: (fileId: string) => {
        set((state) => {
          // Remove all entries for the specified file
          state.history = state.history.filter(entry => entry.fileId !== fileId);

          // Update current index
          state.currentIndex = Math.min(state.currentIndex, state.history.length - 1);
        });

        debug('HistoryStore', `History cleared for file: ${fileId}`);
      },

      setMaxHistorySize: (size: number) => {
        if (size < 1) {
          warn('HistoryStore', 'Invalid history size, must be at least 1');
          return;
        }

        set((state) => {
          state.maxHistorySize = size;

          // Trim history if needed
          if (state.history.length > size) {
            const excess = state.history.length - size;
            state.history = state.history.slice(excess);
            state.currentIndex = Math.max(0, state.currentIndex - excess);
          }
        });

        debug('HistoryStore', `Max history size set to ${size}`);
      },

      canUndo: () => {
        return get().currentIndex >= 0;
      },

      canRedo: () => {
        return get().currentIndex < get().history.length - 1;
      },

      getUndoDescription: () => {
        const { history, currentIndex } = get();
        if (currentIndex >= 0 && currentIndex < history.length) {
          return `Undo ${history[currentIndex].command.description}`;
        }
        return null;
      },

      getRedoDescription: () => {
        const { history, currentIndex } = get();
        if (currentIndex < history.length - 1) {
          return `Redo ${history[currentIndex + 1].command.description}`;
        }
        return null;
      },

      getHistoryForFile: (fileId: string) => {
        return get().history.filter(entry => entry.fileId === fileId);
      },
    })),
    {
      name: 'history-store',
    }
  )
);

/**
 * Command factory functions for common editor operations
 */

/**
 * Create a command for inserting text
 * @param editor The Monaco editor instance
 * @param position The position to insert text at
 * @param text The text to insert
 * @param description A description of the operation
 */
export function createInsertTextCommand(
  editor: monaco.editor.IStandaloneCodeEditor,
  position: monaco.Position,
  text: string,
  description: string = 'Insert text'
): Command {
  const model = editor.getModel();
  if (!model) {
    throw new Error('Editor model not available');
  }

  return {
    execute: async () => {
      // Use editor.executeEdits for proper undo/redo stack integration
      editor.executeEdits('insert-command', [
        {
          range: new monaco.Range(
            position.lineNumber,
            position.column,
            position.lineNumber,
            position.column
          ),
          text,
          forceMoveMarkers: true
        }
      ]);
    },
    undo: async () => {
      // Monaco will handle the undo internally
      editor.trigger('undo-command', 'undo', null);
    },
    redo: async () => {
      // Monaco will handle the redo internally
      editor.trigger('redo-command', 'redo', null);
    },
    description
  };
}

/**
 * Create a command for deleting text
 * @param editor The Monaco editor instance
 * @param range The range of text to delete
 * @param description A description of the operation
 */
export function createDeleteTextCommand(
  editor: monaco.editor.IStandaloneCodeEditor,
  range: monaco.Range,
  description: string = 'Delete text'
): Command {
  const model = editor.getModel();
  if (!model) {
    throw new Error('Editor model not available');
  }

  // Store the text being deleted for undo
  const textToDelete = model.getValueInRange(range);

  return {
    execute: async () => {
      editor.executeEdits('delete-command', [
        {
          range,
          text: '',
          forceMoveMarkers: true
        }
      ]);
    },
    undo: async () => {
      // Monaco will handle the undo internally
      editor.trigger('undo-command', 'undo', null);
    },
    redo: async () => {
      // Monaco will handle the redo internally
      editor.trigger('redo-command', 'redo', null);
    },
    description
  };
}

/**
 * Create a command for replacing text
 * @param editor The Monaco editor instance
 * @param range The range of text to replace
 * @param text The new text
 * @param description A description of the operation
 */
export function createReplaceTextCommand(
  editor: monaco.editor.IStandaloneCodeEditor,
  range: monaco.Range,
  text: string,
  description: string = 'Replace text'
): Command {
  const model = editor.getModel();
  if (!model) {
    throw new Error('Editor model not available');
  }

  // Store the text being replaced for undo
  const originalText = model.getValueInRange(range);

  return {
    execute: async () => {
      editor.executeEdits('replace-command', [
        {
          range,
          text,
          forceMoveMarkers: true
        }
      ]);
    },
    undo: async () => {
      // Monaco will handle the undo internally
      editor.trigger('undo-command', 'undo', null);
    },
    redo: async () => {
      // Monaco will handle the redo internally
      editor.trigger('redo-command', 'redo', null);
    },
    description
  };
}

/**
 * Create a command for formatting the document
 * @param editor The Monaco editor instance
 * @param description A description of the operation
 */
export function createFormatDocumentCommand(
  editor: monaco.editor.IStandaloneCodeEditor,
  description: string = 'Format document'
): Command {
  return {
    execute: async () => {
      await editor.getAction('editor.action.formatDocument')?.run();
    },
    undo: async () => {
      // Monaco will handle the undo internally
      editor.trigger('undo-command', 'undo', null);
    },
    redo: async () => {
      // Monaco will handle the redo internally
      editor.trigger('redo-command', 'redo', null);
    },
    description
  };
}
