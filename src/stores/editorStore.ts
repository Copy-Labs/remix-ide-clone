import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { EditorState, EditorSettings } from '@/types';

interface EditorStoreActions {
  // Editor instance management
  registerEditor: (fileId: string, editor: monaco.editor.IStandaloneCodeEditor) => void;
  unregisterEditor: (fileId: string) => void;
  getEditor: (fileId: string) => monaco.editor.IStandaloneCodeEditor | undefined;

  // Settings management
  updateSettings: (settings: Partial<EditorSettings>) => void;
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
  setFontSize: (fontSize: number) => void;
  setFontFamily: (fontFamily: string) => void;
  setTabSize: (tabSize: number) => void;
  toggleWordWrap: () => void;
  toggleMinimap: () => void;
  toggleLineNumbers: () => void;
  toggleFolding: () => void;
  toggleBracketMatching: () => void;

  // Editor operations
  formatDocument: (fileId: string) => void;
  formatSelection: (fileId: string) => void;
  goToLine: (fileId: string, lineNumber: number) => void;
  find: (fileId: string, searchText: string) => void;
  replace: (fileId: string, searchText: string, replaceText: string) => void;

  // Theme management
  applyThemeToAllEditors: () => void;
  detectSystemTheme: () => 'light' | 'dark';

  // Settings persistence
  saveSettings: () => void;
  loadSettings: () => void;
  resetSettings: () => void;
}

type EditorStore = EditorState & EditorStoreActions;

const defaultSettings: EditorSettings = {
  theme: 'dark',
  fontSize: 14,
  fontFamily: 'JetBrains Mono, Fira Code, Monaco, Consolas, monospace',
  tabSize: 2,
  wordWrap: false,
  minimap: true,
  lineNumbers: true,
  folding: true,
  bracketMatching: true,
};

const initialState: EditorState = {
  editorInstances: new Map(),
  ...defaultSettings,
};

export const useEditorStore = create<EditorStore>()(
  devtools(
    immer((set, get) => ({
      ...initialState,

      registerEditor: (fileId: string, editor: monaco.editor.IStandaloneCodeEditor) => {
        set((state) => {
          state.editorInstances.set(fileId, editor);
        });

        // Apply current settings to the new editor
        const settings = get();
        const editorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
          theme:
            settings.theme === 'auto'
              ? get().detectSystemTheme() + '-theme'
              : settings.theme + '-theme',
          fontSize: settings.fontSize,
          fontFamily: settings.fontFamily,
          tabSize: settings.tabSize,
          wordWrap: settings.wordWrap ? 'on' : 'off',
          minimap: { enabled: settings.minimap },
          lineNumbers: settings.lineNumbers ? 'on' : 'off',
          folding: settings.folding,
          matchBrackets: settings.bracketMatching ? 'always' : 'never',
        };

        editor.updateOptions(editorOptions);
      },

      unregisterEditor: (fileId: string) => {
        set((state) => {
          const editor = state.editorInstances.get(fileId);
          if (editor) {
            editor.dispose();
            state.editorInstances.delete(fileId);
          }
        });
      },

      getEditor: (fileId: string) => {
        return get().editorInstances.get(fileId);
      },

      updateSettings: (newSettings: Partial<EditorSettings>) => {
        set((state) => {
          Object.assign(state, newSettings);
        });

        // Apply settings to all editors
        get().applyThemeToAllEditors();
        get().saveSettings();
      },

      setTheme: (theme: 'light' | 'dark' | 'auto') => {
        set((state) => {
          state.theme = theme;
        });
        get().applyThemeToAllEditors();
        get().saveSettings();
      },

      setFontSize: (fontSize: number) => {
        set((state) => {
          state.fontSize = Math.max(8, Math.min(72, fontSize));
        });

        const editors = get().editorInstances;
        editors.forEach((editor) => {
          editor.updateOptions({ fontSize: get().fontSize });
        });
        get().saveSettings();
      },

      setFontFamily: (fontFamily: string) => {
        set((state) => {
          state.fontFamily = fontFamily;
        });

        const editors = get().editorInstances;
        editors.forEach((editor) => {
          editor.updateOptions({ fontFamily: get().fontFamily });
        });
        get().saveSettings();
      },

      setTabSize: (tabSize: number) => {
        set((state) => {
          state.tabSize = Math.max(1, Math.min(8, tabSize));
        });

        const editors = get().editorInstances;
        editors.forEach((editor) => {
          editor.updateOptions({ tabSize: get().tabSize });
        });
        get().saveSettings();
      },

      toggleWordWrap: () => {
        set((state) => {
          state.wordWrap = !state.wordWrap;
        });

        const editors = get().editorInstances;
        editors.forEach((editor) => {
          editor.updateOptions({ wordWrap: get().wordWrap ? 'on' : 'off' });
        });
        get().saveSettings();
      },

      toggleMinimap: () => {
        set((state) => {
          state.minimap = !state.minimap;
        });

        const editors = get().editorInstances;
        editors.forEach((editor) => {
          editor.updateOptions({ minimap: { enabled: get().minimap } });
        });
        get().saveSettings();
      },

      toggleLineNumbers: () => {
        set((state) => {
          state.lineNumbers = !state.lineNumbers;
        });

        const editors = get().editorInstances;
        editors.forEach((editor) => {
          editor.updateOptions({ lineNumbers: get().lineNumbers ? 'on' : 'off' });
        });
        get().saveSettings();
      },

      toggleFolding: () => {
        set((state) => {
          state.folding = !state.folding;
        });

        const editors = get().editorInstances;
        editors.forEach((editor) => {
          editor.updateOptions({ folding: get().folding });
        });
        get().saveSettings();
      },

      toggleBracketMatching: () => {
        set((state) => {
          state.bracketMatching = !state.bracketMatching;
        });

        const editors = get().editorInstances;
        editors.forEach((editor) => {
          editor.updateOptions({ matchBrackets: get().bracketMatching ? 'always' : 'never' });
        });
        get().saveSettings();
      },

      formatDocument: (fileId: string) => {
        const editor = get().editorInstances.get(fileId);
        if (editor) {
          editor.getAction('editor.action.formatDocument')?.run();
        }
      },

      formatSelection: (fileId: string) => {
        const editor = get().editorInstances.get(fileId);
        if (editor) {
          editor.getAction('editor.action.formatSelection')?.run();
        }
      },

      goToLine: (fileId: string, lineNumber: number) => {
        const editor = get().editorInstances.get(fileId);
        if (editor) {
          editor.revealLineInCenter(lineNumber);
          editor.setPosition({ lineNumber, column: 1 });
        }
      },

      find: (fileId: string, searchText: string) => {
        const editor = get().editorInstances.get(fileId);
        if (editor) {
          editor.getAction('actions.find')?.run();
          // Set the search text programmatically
          const findController = editor.getContribution('editor.contrib.findController') as any;
          if (findController) {
            findController.getState().change({ searchString: searchText }, false);
          }
        }
      },

      replace: (fileId: string, searchText: string, replaceText: string) => {
        const editor = get().editorInstances.get(fileId);
        if (editor) {
          editor.getAction('editor.action.startFindReplaceAction')?.run();
          // Set search and replace text programmatically
          const findController = editor.getContribution('editor.contrib.findController') as any;
          if (findController) {
            findController.getState().change(
              {
                searchString: searchText,
                replaceString: replaceText,
              },
              false,
            );
          }
        }
      },

      applyThemeToAllEditors: () => {
        const { theme } = get();
        const actualTheme = theme === 'auto' ? get().detectSystemTheme() : theme;
        const monacoTheme = actualTheme === 'dark' ? 'vs-dark' : 'vs-light';

        // Set global Monaco theme
        if (window.monaco) {
          window.monaco.editor.setTheme(monacoTheme);
        }

        // Update all editor instances
        const editors = get().editorInstances;
        editors.forEach((editor) => {
          const settings = get();
          editor.updateOptions({
            theme: monacoTheme,
            fontSize: settings.fontSize,
            fontFamily: settings.fontFamily,
            tabSize: settings.tabSize,
            wordWrap: settings.wordWrap ? 'on' : 'off',
            minimap: { enabled: settings.minimap },
            lineNumbers: settings.lineNumbers ? 'on' : 'off',
            folding: settings.folding,
            matchBrackets: settings.bracketMatching ? 'always' : 'never',
          });
        });
      },

      detectSystemTheme: () => {
        if (typeof window !== 'undefined' && window.matchMedia) {
          return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return 'dark'; // Default fallback
      },

      saveSettings: () => {
        const settings = get();
        const settingsToSave: EditorSettings = {
          theme: settings.theme,
          fontSize: settings.fontSize,
          fontFamily: settings.fontFamily,
          tabSize: settings.tabSize,
          wordWrap: settings.wordWrap,
          minimap: settings.minimap,
          lineNumbers: settings.lineNumbers,
          folding: settings.folding,
          bracketMatching: settings.bracketMatching,
        };

        localStorage.setItem('remix-ide-editor-settings', JSON.stringify(settingsToSave));
      },

      loadSettings: () => {
        try {
          const savedSettings = localStorage.getItem('remix-ide-editor-settings');
          if (savedSettings) {
            const parsedSettings: EditorSettings = JSON.parse(savedSettings);
            set((state) => {
              Object.assign(state, parsedSettings);
            });
            get().applyThemeToAllEditors();
          }
        } catch (error) {
          console.warn('Failed to load editor settings:', error);
          get().resetSettings();
        }
      },

      resetSettings: () => {
        set((state) => {
          Object.assign(state, defaultSettings);
        });
        get().applyThemeToAllEditors();
        get().saveSettings();
      },
    })),
    {
      name: 'editor-store',
    },
  ),
);

// Load settings on initialization
if (typeof window !== 'undefined') {
  useEditorStore.getState().loadSettings();

  // Listen for system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleThemeChange = () => {
    const { theme } = useEditorStore.getState();
    if (theme === 'auto') {
      useEditorStore.getState().applyThemeToAllEditors();
    }
  };

  mediaQuery.addEventListener('change', handleThemeChange);
}
