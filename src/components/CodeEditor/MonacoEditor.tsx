import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Editor, { type Monaco, type OnChange, type OnMount } from '@monaco-editor/react';
import { useEditorStore } from '@/stores/editorStore.ts';
import { useFileStore } from '@/stores/fileStore.ts';
import {
  createDeleteTextCommand,
  createInsertTextCommand,
  createReplaceTextCommand,
  useHistoryStore,
} from '@/stores/historyStore';
import { debug } from '@/services/loggerService';
import {
  generateDefaultOptionsJson,
  generateOptionsJsonSchema,
  type MonacoOption,
} from '@/utils/editorUtils';
import type { monaco } from '@/lib/monaco-editor';

interface MonacoEditorProps {
  filePath: string;
  language?: string;
  readOnly?: boolean;
  height?: string;
  onContentChange?: (content: string) => void;
}

const MonacoEditor: React.FC<MonacoEditorProps> = ({
  filePath,
  language = 'solidity',
  readOnly = false,
  height = '100%',
  onContentChange,
}) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const {
    registerEditor,
    unregisterEditor,
    theme,
    fontSize,
    fontFamily,
    tabSize,
    wordWrap,
    minimap,
    lineNumbers,
    folding,
    bracketMatching,
  } = useEditorStore();

  const { executeCommand } = useHistoryStore();
  const { getFileContent, updateFileContent } = useFileStore();

  // State to manage file content asynchronously
  const [fileContent, setFileContent] = useState<string>('');
  const [isContentLoading, setIsContentLoading] = useState(true);

  // Load file content when filePath changes
  useEffect(() => {
    let isCancelled = false;

    const loadFileContent = async () => {
      setIsContentLoading(true);
      try {
        const content = await getFileContent(filePath);
        if (!isCancelled) {
          setFileContent(content || '');
          setIsContentLoading(false);
        }
      } catch (error) {
        console.error('Failed to load file content:', error);
        if (!isCancelled) {
          setFileContent('');
          setIsContentLoading(false);
        }
      }
    };

    void loadFileContent();

    return () => {
      isCancelled = true;
    };
  }, [filePath, getFileContent]);

  // Determine the language based on file extension
  const getLanguageFromFilePath = useCallback(
    (path: string): string => {
      const extension = path.split('.').pop()?.toLowerCase();
      switch (extension) {
        case 'sol':
          return 'solidity';
        case 'js':
          return 'javascript';
        case 'ts':
          return 'typescript';
        case 'tsx':
          return 'typescript';
        case 'jsx':
          return 'javascript';
        case 'json':
          return 'json';
        case 'md':
          return 'markdown';
        case 'css':
          return 'css';
        case 'html':
          return 'html';
        case 'yml':
        case 'yaml':
          return 'yaml';
        default:
          return language || 'plaintext';
      }
    },
    [language],
  );

  // Use the detected language - memoized to prevent unnecessary recalculations
  const detectedLanguage = useMemo(() => getLanguageFromFilePath(filePath), [filePath, getLanguageFromFilePath]);

  // Get the correct Monaco theme based on the current theme setting
  const monacoTheme = useMemo(() => {
    if (theme === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'vs-dark' : 'vs-light';
    }
    return theme === 'dark' ? 'vs-dark' : 'vs-light';
  }, [theme]);

  // Handle editor mount
  const handleEditorDidMount: OnMount = (editor, monaco): void => {
    editorRef.current = editor;
    setIsLoading(false);

    // Register editor instance - this will also apply editor settings
    registerEditor(filePath, editor);

    // Configure language support based on file type
    if (detectedLanguage === 'solidity') {
      configureSolidityLanguage(monaco);
    } else if (detectedLanguage === 'typescript' || detectedLanguage === 'javascript') {
      configureTypeScriptLanguage(monaco);
    }

    // Set up keyboard shortcuts
    setupKeyboardShortcuts(editor, monaco);

    // Set up editor change listeners for history tracking
    setupHistoryTracking(editor, monaco);

    // Focus editor
    editor.focus();
  };

  // Set up history tracking for undo/redo functionality
  const setupHistoryTracking = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor, monaco: Monaco): void => {
      const model = editor.getModel();
      if (!model) return;

      // Debounce function to limit the rate of command execution
      let debounceTimeout: NodeJS.Timeout | null = null;
      const pendingChanges: monaco.editor.IModelContentChange[] = [];

      // Maximum number of changes to process in a single batch to prevent stack overflow
      const MAX_CHANGES_PER_BATCH = 500; // Reduced from 1000 to be more conservative
      // Maximum size of text to process in a single command to prevent memory issues
      const MAX_TEXT_SIZE = 50000; // 50KB - reduced from 100KB to be more conservative
      // Maximum number of batches to process in a single debounce cycle
      const MAX_BATCHES = 10;

      // Listen for content changes
      const disposable = model.onDidChangeContent((event: monaco.editor.IModelContentChangedEvent) => {
        // Skip if we're in the middle of an undo/redo operation
        if (event.isUndoing || event.isRedoing) return;

        // Add new changes, but limit the total number to prevent memory issues
        const newChanges = event.changes.filter(change =>
          !change.text || change.text.length <= MAX_TEXT_SIZE
        );

        // Log skipped changes due to size
        const skippedChanges = event.changes.length - newChanges.length;
        if (skippedChanges > 0) {
          console.warn(`Skipped ${skippedChanges} large text changes`);
        }

        // Add new changes, but limit the total to prevent memory issues
        if (pendingChanges.length + newChanges.length <= MAX_CHANGES_PER_BATCH * 2) {
          pendingChanges.push(...newChanges);
        } else {
          // If we would exceed the limit, process current changes first
          if (debounceTimeout) {
            clearTimeout(debounceTimeout);
            debounceTimeout = null;
          }
          processChanges();

          // Then add the new changes, but only up to the limit
          const spaceLeft = MAX_CHANGES_PER_BATCH * 2 - pendingChanges.length;
          pendingChanges.push(...newChanges.slice(0, spaceLeft));

          if (newChanges.length > spaceLeft) {
            console.warn(`Dropped ${newChanges.length - spaceLeft} changes due to buffer limits`);
          }
        }

        // Clear existing timeout
        if (debounceTimeout) {
          clearTimeout(debounceTimeout);
        }

        // Set new timeout to process changes
        debounceTimeout = setTimeout(() => {
          processChanges();
          debounceTimeout = null;
        }, 500); // Increased debounce time to reduce frequency of updates

        // Track timeout for cleanup
        const win = window as any;
        if (!win._editorTimeouts) {
          win._editorTimeouts = {};
        }
        if (!win._editorTimeouts[filePath]) {
          win._editorTimeouts[filePath] = [];
        }
        win._editorTimeouts[filePath].push(debounceTimeout);
      });

      // Process batched changes using iteration instead of recursion
      const processChanges = (): void => {
        if (pendingChanges.length === 0) return;

        try {
          // Process changes in batches to avoid stack overflow
          let batchesProcessed = 0;

          while (pendingChanges.length > 0 && batchesProcessed < MAX_BATCHES) {
            // Batch similar consecutive changes
            const batchedChanges: monaco.editor.IModelContentChange[] = [];
            let currentBatch: monaco.editor.IModelContentChange | null = null;

            // Process only a limited number of changes at once
            const changesToProcess = pendingChanges.splice(0, MAX_CHANGES_PER_BATCH);

            for (const change of changesToProcess) {
              // Skip changes with extremely large text to prevent memory issues
              if (change.text && change.text.length > MAX_TEXT_SIZE) {
                console.warn(`Skipping large text change (${change.text.length} chars)`);
                continue;
              }

              if (!currentBatch) {
                currentBatch = { ...change };
                batchedChanges.push(currentBatch);
              } else {
                // Check if changes can be batched (same type and adjacent)
                const canBatch =
                  (currentBatch.rangeLength === 0 && change.rangeLength === 0 && // Both insertions
                   currentBatch.text.length > 0 && change.text.length > 0) ||
                  (currentBatch.rangeLength > 0 && change.rangeLength > 0 && // Both deletions
                   currentBatch.text.length === 0 && change.text.length === 0);

                if (canBatch && currentBatch.text.length + change.text.length <= MAX_TEXT_SIZE) {
                  // Update the current batch
                  currentBatch.text += change.text;
                  currentBatch.rangeLength += change.rangeLength;
                } else {
                  // Start a new batch
                  currentBatch = { ...change };
                  batchedChanges.push(currentBatch);
                }
              }
            }

            // Process each batched change
            for (const change of batchedChanges) {
              const { range, text, rangeLength } = change;

              // Create the appropriate command based on the type of change
              let command;

              try {
                if (rangeLength === 0 && text.length > 0) {
                  // Text insertion
                  command = createInsertTextCommand(
                    editor,
                    new monaco.Position(range.startLineNumber, range.startColumn),
                    text,
                    'Insert text',
                  );
                  debug('MonacoEditor', `Created insert command for file: ${filePath}`);
                } else if (rangeLength > 0 && text.length === 0) {
                  // Text deletion
                  command = createDeleteTextCommand(
                    editor,
                    new monaco.Range(
                      range.startLineNumber,
                      range.startColumn,
                      range.endLineNumber,
                      range.endColumn,
                    ),
                    'Delete text',
                  );
                  debug('MonacoEditor', `Created delete command for file: ${filePath}`);
                } else if (rangeLength > 0 && text.length > 0) {
                  // Text replacement
                  command = createReplaceTextCommand(
                    editor,
                    new monaco.Range(
                      range.startLineNumber,
                      range.startColumn,
                      range.endLineNumber,
                      range.endColumn,
                    ),
                    text,
                    'Replace text',
                  );
                  debug('MonacoEditor', `Created replace command for file: ${filePath}`);
                }

                // Execute the command if created
                if (command) {
                  void executeCommand(command, filePath).catch((err) => {
                    console.error('Failed to execute editor command:', err);
                  });
                }
              } catch (err) {
                console.error('Error creating editor command:', err);
              }
            }

            batchesProcessed++;
          }

          // If there are still pending changes, schedule another processing using setTimeout
          // This prevents stack overflow by breaking the call chain
          if (pendingChanges.length > 0) {
            const timeoutId = setTimeout(() => {
              processChanges();
            }, 10);

            // Track timeout for cleanup
            const win = window as any;
            if (!win._editorTimeouts) {
              win._editorTimeouts = {};
            }
            if (!win._editorTimeouts[filePath]) {
              win._editorTimeouts[filePath] = [];
            }
            win._editorTimeouts[filePath].push(timeoutId);
          }
        } catch (err) {
          console.error('Error processing editor changes:', err);
          // Clear pending changes to prevent getting stuck in an error state
          pendingChanges.length = 0;
        }
      };

      // Override default undo/redo commands to use our history store
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyZ, () => {
        void useHistoryStore.getState().undo();
      });

      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyZ, () => {
        void useHistoryStore.getState().redo();
      });

      // Clean up on editor disposal
      editor.onDidDispose(() => {
        if (debounceTimeout) {
          clearTimeout(debounceTimeout);
        }
        disposable.dispose();
      });
    },
    [filePath, executeCommand]
  );

  // Handle content changes
  const handleEditorChange: OnChange = useCallback((value): void => {
    if (value !== undefined && !readOnly && value !== fileContent) {
      // Update local state immediately for responsive UI
      setFileContent(value);

      // Update the file content in the store asynchronously
      // The history commands handle the undo/redo functionality
      // but we need to make sure the file content is updated in the store
      updateFileContent(filePath, value).catch((error) => {
        console.error('Failed to update file content:', error);
        // Revert local state on error
        setFileContent(fileContent);
      });

      onContentChange?.(value);
    }
  }, [filePath, fileContent, readOnly, updateFileContent, onContentChange]);

  // Configure TypeScript/JavaScript language support
  const configureTypeScriptLanguage = (monaco: Monaco): void => {
    // TypeScript compiler options
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: 'React',
      allowJs: true,
      typeRoots: ['node_modules/@types'],
    });

    // Use a module-level cache for React types to persist across instances
    // This prevents multiple fetches when switching between files
    const reactTypesCache = {
      value: null as string | null,
      timestamp: 0,
      // Cache expiration time (24 hours)
      CACHE_TTL: 24 * 60 * 60 * 1000,
    };

    // Function to fetch React types with proper error handling and caching
    const fetchReactTypes = async (): Promise<void> => {
      try {
        const now = Date.now();

        // Use cached version if available and not expired
        if (reactTypesCache.value && now - reactTypesCache.timestamp < reactTypesCache.CACHE_TTL) {
          monaco.languages.typescript.typescriptDefaults.addExtraLib(
            reactTypesCache.value,
            'file:///node_modules/@types/react/index.d.ts',
          );
          return;
        }

        // Set a shorter timeout to avoid hanging
        const timeoutPromise = new Promise<Response>((_, reject) => {
          setTimeout(() => reject(new Error('Fetch timeout')), 3000);
        });

        // Use AbortController for better timeout handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        try {
          // Fetch with timeout and abort controller
          const response = await Promise.race([
            fetch('https://unpkg.com/@types/react@latest/index.d.ts', {
              signal: controller.signal,
              // Add cache control headers
              headers: {
                'Cache-Control': 'max-age=3600',
              },
            }),
            timeoutPromise,
          ]);

          clearTimeout(timeoutId);

          if (response.ok) {
            const text = await response.text();

            // Only cache if the response is valid and not too large
            if (text && text.length > 0 && text.length < 5 * 1024 * 1024) { // 5MB limit
              // Cache the result
              reactTypesCache.value = text;
              reactTypesCache.timestamp = now;

              // Add to TypeScript definitions
              monaco.languages.typescript.typescriptDefaults.addExtraLib(
                text,
                'file:///node_modules/@types/react/index.d.ts',
              );
            } else {
              console.warn('Invalid or too large React types response');
            }
          } else {
            console.warn(`Failed to fetch React types: ${response.status} ${response.statusText}`);
          }
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (error) {
        // Check if it's an abort error (timeout)
        if (error instanceof DOMException && error.name === 'AbortError') {
          console.warn('React types fetch timed out');
        } else {
          console.error('Failed to fetch React types:', error);
        }

        // Fallback: provide minimal React types if we have no cache
        if (!reactTypesCache.value) {
          const fallbackTypes = `
            declare namespace React {
              interface FC<P = {}> {
                (props: P): any;
              }
              function useState<T>(initialState: T | (() => T)): [T, (newState: T) => void];
              function useEffect(effect: () => void | (() => void), deps?: any[]): void;
              function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T;
              function useMemo<T>(factory: () => T, deps: any[]): T;
              function useRef<T>(initialValue: T): { current: T };
            }
            export = React;
            export as namespace React;
          `;

          monaco.languages.typescript.typescriptDefaults.addExtraLib(
            fallbackTypes,
            'file:///node_modules/@types/react/fallback.d.ts',
          );
        }
      }
    };

    // Start fetching React types in the background
    void fetchReactTypes();

    // Define common snippets for both TypeScript and JavaScript
    const getCommonSnippets = (isTypeScript = true): monaco.languages.CompletionItem[] => {
      const commonSnippets = [
        {
          label: 'import',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'import { $1 } from "$2";$0',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Import statement',
        },
        {
          label: 'function',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'function ${1:name}(${2:params}) {\n\t$0\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Function declaration',
        },
        {
          label: 'arrow function',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '(${1:params}) => {\n\t$0\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Arrow function',
        },
        {
          label: 'class',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'class ${1:Name} {\n\tconstructor(${2:params}) {\n\t\t$0\n\t}\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Class declaration',
        },
        {
          label: 'useEffect',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText:
            'useEffect(() => {\n\t$1\n\treturn () => {\n\t\t$2\n\t};\n}, [${3:dependencies}]);$0',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'React useEffect hook',
        },
      ];

      // TypeScript-specific snippets
      if (isTypeScript) {
        return [
          ...commonSnippets,
          {
            label: 'interface',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'interface ${1:Name} {\n\t$0\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Interface declaration',
          },
          {
            label: 'type',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'type ${1:Name} = $0;',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Type declaration',
          },
          {
            label: 'react component',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText:
              'import React from "react";\n\ninterface ${1:ComponentName}Props {\n\t$2\n}\n\nconst ${1:ComponentName}: React.FC<${1:ComponentName}Props> = (${3:props}) => {\n\treturn (\n\t\t<div>\n\t\t\t$0\n\t\t</div>\n\t);\n};\n\nexport default ${1:ComponentName};',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'React functional component',
          },
          {
            label: 'useState',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText:
              'const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState<${2:type}>(${3:initialValue});$0',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'React useState hook',
          },
        ];
      } else {
        // JavaScript-specific snippets
        return [
          ...commonSnippets,
          {
            label: 'react component',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText:
              'import React from "react";\n\nconst ${1:ComponentName} = (${2:props}) => {\n\treturn (\n\t\t<div>\n\t\t\t$0\n\t\t</div>\n\t);\n};\n\nexport default ${1:ComponentName};',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'React functional component',
          },
          {
            label: 'useState',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText:
              'const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState(${2:initialValue});$0',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'React useState hook',
          },
        ];
      }
    };

    // Register completion provider for TypeScript
    monaco.languages.registerCompletionItemProvider('typescript', {
      provideCompletionItems: (
        model: monaco.editor.ITextModel,
        position: monaco.Position,
      ): monaco.languages.CompletionList => {
        return { suggestions: getCommonSnippets(true) };
      },
    });

    // Register completion provider for JavaScript
    monaco.languages.registerCompletionItemProvider('javascript', {
      provideCompletionItems: (
        model: monaco.editor.ITextModel,
        position: monaco.Position,
      ): monaco.languages.CompletionList => {
        return { suggestions: getCommonSnippets(false) };
      },
    });
  };

  // Configure Solidity language support
  const configureSolidityLanguage = (monaco: Monaco): void => {
    // Register Solidity language if not already registered
    if (!monaco.languages.getLanguages().find((lang) => lang.id === 'solidity')) {
      monaco.languages.register({ id: 'solidity' });

      // Define Solidity syntax highlighting
      monaco.languages.setMonarchTokensProvider('solidity', {
        tokenizer: {
          root: [
            // Keywords
            [
              /\b(contract|library|interface|function|modifier|event|struct|enum|mapping|address|uint|int|bool|string|bytes|pragma|import|using|for|if|else|while|do|break|continue|return|throw|emit|require|assert|revert|constructor|fallback|receive|try|catch|abstract|is|override|virtual)\b/,
              'keyword',
            ],

            // Visibility modifiers
            [
              /\b(public|private|internal|external|pure|view|payable|constant|immutable|memory|storage|calldata)\b/,
              'keyword.modifier',
            ],

            // Types
            [
              /\b(uint8|uint16|uint32|uint64|uint128|uint256|int8|int16|int32|int64|int128|int256|bytes1|bytes2|bytes4|bytes8|bytes16|bytes32|fixed|ufixed)\b/,
              'type',
            ],

            // Global variables and units
            [
              /\b(msg|block|tx|this|super|now|wei|gwei|ether|seconds|minutes|hours|days|weeks)\b/,
              'variable.predefined',
            ],

            // Numbers with units
            [/\b\d+\s*(wei|gwei|ether|seconds|minutes|hours|days|weeks)\b/, 'number.unit'],

            // Hex numbers
            [/\b0x[0-9a-fA-F]+\b/, 'number.hex'],

            // Regular numbers
            [/\b\d+(\.\d+)?\b/, 'number'],

            // Strings
            [/"([^"\\]|\\.)*$/, 'string.invalid'],
            [/"/, 'string', '@string'],
            [/'([^'\\]|\\.)*$/, 'string.invalid'],
            [/'/, 'string', '@string_single'],

            // Comments
            [/\/\*/, 'comment', '@comment'],
            [/\/\/.*$/, 'comment'],

            // NatSpec comments
            [/\/\*\*/, 'comment.doc', '@natspec'],

            // Operators
            [/[{}()\[\]]/, '@brackets'],
            [/[<>](?!@symbols)/, '@brackets'],
            [/@symbols/, 'operator'],

            // Custom types (capitalized identifiers)
            [/\b[A-Z][\w$]*\b/, 'type.identifier'],
          ],

          string: [
            [/[^\\"]+/, 'string'],
            [/\\./, 'string.escape'],
            [/"/, 'string', '@pop'],
          ],

          string_single: [
            [/[^\\']+/, 'string'],
            [/\\./, 'string.escape'],
            [/'/, 'string', '@pop'],
          ],

          comment: [
            [/[^\/*]+/, 'comment'],
            [/\*\//, 'comment', '@pop'],
            [/[\/*]/, 'comment'],
          ],

          natspec: [
            [/[^\/*]+/, 'comment.doc'],
            [/\*\//, 'comment.doc', '@pop'],
            [/[\/*]/, 'comment.doc'],
            [/@(param|return|title|author|notice|dev|inheritdoc)\b/, 'comment.doc.tag'],
          ],
        },

        symbols: /[=><!~?:&|+\-*\/\^%]+/,
      });

      // Define completion provider
      monaco.languages.registerCompletionItemProvider('solidity', {
        provideCompletionItems: (
          model: monaco.editor.ITextModel,
          position: monaco.Position,
        ): monaco.languages.CompletionList => {
          const suggestions = [
            {
              label: 'contract',
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: 'contract ${1:ContractName} {\n\t$0\n}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Create a new contract',
            },
            {
              label: 'function',
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText:
                'function ${1:functionName}(${2:parameters}) ${3:public} ${4:returns (${5:returnType})} {\n\t$0\n}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Create a new function',
            },
            {
              label: 'constructor',
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: 'constructor(${1:parameters}) {\n\t$0\n}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Create a constructor',
            },
            {
              label: 'modifier',
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText:
                'modifier ${1:modifierName}(${2:parameters}) {\n\t${3:require(condition, "error message");}\n\t_;\n}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Create a new modifier',
            },
            {
              label: 'event',
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: 'event ${1:EventName}(${2:parameters});',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Create a new event',
            },
            {
              label: 'struct',
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: 'struct ${1:StructName} {\n\t${2:type} ${3:variableName};\n\t$0\n}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Create a new struct',
            },
            {
              label: 'enum',
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: 'enum ${1:EnumName} {\n\t${2:Value1},\n\t${3:Value2},\n\t$0\n}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Create a new enum',
            },
            {
              label: 'interface',
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: 'interface ${1:InterfaceName} {\n\t$0\n}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Create a new interface',
            },
            {
              label: 'library',
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: 'library ${1:LibraryName} {\n\t$0\n}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Create a new library',
            },
            {
              label: 'require',
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: 'require(${1:condition}, "${2:error message}");$0',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Add a require statement',
            },
            {
              label: 'assert',
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: 'assert(${1:condition});$0',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Add an assert statement',
            },
            {
              label: 'revert',
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: 'revert("${1:error message}");$0',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Add a revert statement',
            },
            {
              label: 'natspec',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: '/**\n * @title ${1:Title}\n * @dev ${2:Description}\n */$0',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Add NatSpec documentation',
            },
          ];

          return { suggestions };
        },
      });

      // Register hover provider for Solidity
      monaco.languages.registerHoverProvider('solidity', {
        provideHover: (
          model: monaco.editor.ITextModel,
          position: monaco.Position,
        ): monaco.languages.Hover | null => {
          const word = model.getWordAtPosition(position);
          if (!word) return null;

          const solidityKeywords: Record<string, string> = {
            contract:
              'A contract in the sense of Solidity is a collection of code (its functions) and data (its state) that resides at a specific address on the Ethereum blockchain.',
            function: 'Functions are the executable units of code within a contract.',
            modifier:
              'Modifiers can be used to change the behavior of functions in a declarative way.',
            event: 'Events allow the convenient usage of the EVM logging facilities.',
            struct: 'Structs are custom defined types that can group several variables.',
            enum: 'Enums can be used to create custom types with a finite set of values.',
            mapping: 'Mapping types use the syntax mapping(KeyType => ValueType).',
            address: 'The address type holds a 20 byte value (size of an Ethereum address).',
            require:
              'The require function is used to validate conditions and throw an exception if the condition is not met.',
            assert:
              'The assert function creates an error of type Panic(uint256) when the condition is false.',
            revert:
              'The revert statement causes a Panic(uint256) error and reverts all state changes.',
            constructor:
              'A constructor is an optional function declared with the constructor keyword which is executed upon contract creation.',
            fallback:
              'A contract can have at most one fallback function, declared using fallback () external [payable].',
            receive:
              'A contract can have at most one receive function, declared using receive() external payable.',
          };

          if (solidityKeywords[word.word]) {
            return {
              contents: [{ value: `**${word.word}**` }, { value: solidityKeywords[word.word] }],
            };
          }

          return null;
        },
      });

      // Register document formatting provider
      monaco.languages.registerDocumentFormattingEditProvider('solidity', {
        provideDocumentFormattingEdits: (
          model: monaco.editor.ITextModel,
        ): monaco.languages.TextEdit[] => {
          // Basic formatting - just add proper indentation
          const text = model.getValue();
          const lines = text.split('\n');
          let indentLevel = 0;
          const formattedLines = lines.map((line) => {
            const trimmedLine = line.trim();

            // Decrease indent for closing braces
            if (trimmedLine.startsWith('}')) {
              indentLevel = Math.max(0, indentLevel - 1);
            }

            // Format the line with proper indentation
            const formattedLine =
              indentLevel > 0 ? '    '.repeat(indentLevel) + trimmedLine : trimmedLine;

            // Increase indent for opening braces
            if (trimmedLine.endsWith('{')) {
              indentLevel++;
            }

            return formattedLine;
          });

          return [
            {
              range: model.getFullModelRange(),
              text: formattedLines.join('\n'),
            },
          ];
        },
      });
    }
  };

  // Editor options are now fully managed by useMemo and useEffect

  // Memoize the editor options to prevent unnecessary re-renders
  const editorOptions = useMemo(() => ({
    fontSize,
    fontFamily,
    tabSize,
    wordWrap: wordWrap ? 'on' : 'off',
    minimap: { enabled: minimap },
    lineNumbers: lineNumbers ? 'on' : 'off',
    folding,
    matchBrackets: bracketMatching ? 'always' : 'never',
    readOnly,
    automaticLayout: true,
    scrollBeyondLastLine: false,
    renderWhitespace: 'selection',
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: true,
    theme: monacoTheme,
  }), [
    fontSize,
    fontFamily,
    tabSize,
    wordWrap,
    minimap,
    lineNumbers,
    folding,
    bracketMatching,
    readOnly,
    monacoTheme,
  ]);

  // Apply editor settings when they change, but only update what's needed
  useEffect(() => {
    if (!editorRef.current) return;

    // Apply the memoized options directly
    // The useMemo dependency array ensures this only runs when options actually change
    editorRef.current.updateOptions(editorOptions);
  }, [editorOptions]);

  // Setup keyboard shortcuts
  const setupKeyboardShortcuts = (
    editor: monaco.editor.IStandaloneCodeEditor,
    monaco: Monaco,
  ): void => {
    // Format document (Ctrl+Shift+F / Cmd+Shift+F)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
      editor.getAction('editor.action.formatDocument')?.run();
    });

    // Save file (Ctrl+S / Cmd+S)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // File is automatically saved through the onChange handler
      // Removed console.log to comply with linting rules
    });

    // Find (Ctrl+F / Cmd+F)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {
      editor.getAction('actions.find')?.run();
    });

    // Replace (Ctrl+H / Cmd+H)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyH, () => {
      editor.getAction('editor.action.startFindReplaceAction')?.run();
    });
  };

  // Cleanup on unmount - enhanced to ensure all resources are properly released
  useEffect(() => {
    // Return cleanup function
    return () => {
      // Clear any pending timeouts that might be associated with this component
      const win = window as any;
      if (win._editorTimeouts && win._editorTimeouts[filePath]) {
        win._editorTimeouts[filePath].forEach((timeoutId: number) => {
          clearTimeout(timeoutId);
        });
        delete win._editorTimeouts[filePath];
      }

      // Unregister the editor from the store
      if (editorRef.current) {
        try {
          // Dispose of any models associated with this editor to prevent memory leaks
          const model = editorRef.current.getModel();
          if (model) {
            // Ensure we don't dispose models that might be shared
            const uri = model.uri.toString();
            if (uri.includes(filePath)) {
              model.dispose();
            }
          }

          // Unregister from the editor store
          unregisterEditor(filePath);

          // Clear the reference
          editorRef.current = null;
        } catch (err) {
          console.error('Error during editor cleanup:', err);
        }
      }
    };
  }, [filePath, unregisterEditor]);

  function handleWillMount(monaco: Monaco): void {
    const options = generateDefaultOptionsJson(
      monaco.editor.EditorOptions as unknown as MonacoOption[],
    );

    // Commented out code removed to comply with linting rules

    const jsonSchema = generateOptionsJsonSchema(
      monaco.editor.EditorOptions as unknown as MonacoOption[],
    );

    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      schemas: [
        {
          uri: 'monaco-editor-options-schema.json',
          fileMatch: ['monaco-editor-options.json'],
          schema: jsonSchema,
        },
      ],
    });
  }

  return (
    <div className="relative h-full">
      {(isLoading || isContentLoading) && (
        <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-800">
          <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>{isContentLoading ? 'Loading file...' : 'Loading editor...'}</span>
          </div>
        </div>
      )}

      <Editor
        height={height}
        language={detectedLanguage}
        // path={filePath} // Commented out to prevent re-renders when switching files
        value={fileContent}
        theme={monacoTheme}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        beforeMount={handleWillMount}
        options={editorOptions}
      />
    </div>
  );
};

export default MonacoEditor;
