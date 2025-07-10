import React, {useCallback, useEffect, useRef, useState} from 'react';
import Editor, {type OnChange, type OnMount} from '@monaco-editor/react';
import {useEditorStore} from '@/stores/editorStore.ts';
import {useFileStore} from '@/stores/fileStore.ts';

interface MonacoEditorProps {
  filePath: string;
  language?: string;
  readOnly?: boolean;
  height?: string;
  onContentChange?: (content: string) => void;
}

const MonacoEditor: React.FC<MonacoEditorProps> = (
  {
    filePath,
    language = 'solidity',
    readOnly = false,
    height = '100%',
    onContentChange,
  }) => {
  const editorRef = useRef<any>(null);
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
    bracketMatching
  } = useEditorStore();

  const {
    getFileContent,
    updateFileContent
  } = useFileStore();

  const fileContent = getFileContent(filePath) || '';

  // Get the correct Monaco theme based on the current theme setting
  const getMonacoTheme = useCallback(() => {
    if (theme === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'vs-dark' : 'vs-light';
    }
    return theme === 'dark' ? 'vs-dark' : 'vs-light';
  }, [theme]);

  // Handle editor mount
  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    setIsLoading(false);

    // Register editor instance - this will also apply editor settings
    registerEditor(filePath, editor);

    // Configure Solidity language support
    if (language === 'solidity') {
      configureSolidityLanguage(monaco);
    }

    // Set up keyboard shortcuts
    setupKeyboardShortcuts(editor, monaco);

    // Focus editor
    editor.focus();
  };

  // Handle content changes
  const handleEditorChange: OnChange = (value) => {
    if (value !== undefined && !readOnly) {
      updateFileContent(filePath, value);
      onContentChange?.(value);
    }
  };

  // Configure Solidity language support
  const configureSolidityLanguage = (monaco: any) => {
    // Register Solidity language if not already registered
    if (!monaco.languages.getLanguages().find((lang: any) => lang.id === 'solidity')) {
      monaco.languages.register({id: 'solidity'});

      // Define Solidity syntax highlighting
      monaco.languages.setMonarchTokensProvider('solidity', {
        tokenizer: {
          root: [
            // Keywords
            [/\b(contract|library|interface|function|modifier|event|struct|enum|mapping|address|uint|int|bool|string|bytes|pragma|import|using|for|if|else|while|do|break|continue|return|throw|emit|require|assert|revert)\b/, 'keyword'],

            // Visibility modifiers
            [/\b(public|private|internal|external|pure|view|payable|constant|immutable)\b/, 'keyword.modifier'],

            // Types
            [/\b(uint8|uint16|uint32|uint64|uint128|uint256|int8|int16|int32|int64|int128|int256|bytes1|bytes2|bytes4|bytes8|bytes16|bytes32)\b/, 'type'],

            // Numbers
            [/\b\d+(\.\d+)?\b/, 'number'],

            // Strings
            [/"([^"\\]|\\.)*$/, 'string.invalid'],
            [/"/, 'string', '@string'],
            [/'([^'\\]|\\.)*$/, 'string.invalid'],
            [/'/, 'string', '@string_single'],

            // Comments
            [/\/\*/, 'comment', '@comment'],
            [/\/\/.*$/, 'comment'],

            // Operators
            [/[{}()\[\]]/, '@brackets'],
            [/[<>](?!@symbols)/, '@brackets'],
            [/@symbols/, 'operator'],
          ],

          string: [
            [/[^\\"]+/, 'string'],
            [/\\./, 'string.escape'],
            [/"/, 'string', '@pop']
          ],

          string_single: [
            [/[^\\']+/, 'string'],
            [/\\./, 'string.escape'],
            [/'/, 'string', '@pop']
          ],

          comment: [
            [/[^\/*]+/, 'comment'],
            [/\*\//, 'comment', '@pop'],
            [/[\/*]/, 'comment']
          ],
        },

        symbols: /[=><!~?:&|+\-*\/\^%]+/,
      });

      // Define completion provider
      monaco.languages.registerCompletionItemProvider('solidity', {
        provideCompletionItems: (model: any, position: any) => {
          const suggestions = [
            {
              label: 'contract',
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: 'contract ${1:ContractName} {\n\t$0\n}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Create a new contract'
            },
            {
              label: 'function',
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: 'function ${1:functionName}(${2:parameters}) ${3:public} ${4:returns (${5:returnType})} {\n\t$0\n}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Create a new function'
            },
            {
              label: 'modifier',
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: 'modifier ${1:modifierName}(${2:parameters}) {\n\t${3:require(condition, "error message");}\n\t_;\n}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Create a new modifier'
            },
            {
              label: 'event',
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: 'event ${1:EventName}(${2:parameters});',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Create a new event'
            }
          ];

          return {suggestions};
        }
      });
    }
  };

  // Apply editor settings when they change
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        fontSize: fontSize,
        fontFamily: fontFamily,
        tabSize: tabSize,
        wordWrap: wordWrap ? 'on' : 'off',
        minimap: {enabled: minimap},
        lineNumbers: lineNumbers ? 'on' : 'off',
        folding: folding,
        matchBrackets: bracketMatching ? 'always' : 'never',
        readOnly,
        automaticLayout: true,
        scrollBeyondLastLine: false,
        renderWhitespace: 'selection',
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: true,
        theme: getMonacoTheme(),
      });
    }
  }, [fontSize, fontFamily, tabSize, wordWrap, minimap, lineNumbers, folding, bracketMatching, readOnly, getMonacoTheme]);

  // Setup keyboard shortcuts
  const setupKeyboardShortcuts = (editor: any, monaco: any) => {
    // Format document (Ctrl+Shift+F / Cmd+Shift+F)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
      editor.getAction('editor.action.formatDocument').run();
    });

    // Save file (Ctrl+S / Cmd+S)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // File is automatically saved through the onChange handler
      console.log('File saved:', filePath);
    });

    // Find (Ctrl+F / Cmd+F)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {
      editor.getAction('actions.find').run();
    });

    // Replace (Ctrl+H / Cmd+H)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyH, () => {
      editor.getAction('editor.action.startFindReplaceAction').run();
    });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (editorRef.current) {
        unregisterEditor(filePath);
        editorRef.current = null;
      }
    };
  }, [filePath, unregisterEditor]);

  return (
    <div className="relative h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-800">
          <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>Loading editor...</span>
          </div>
        </div>
      )}

      <Editor
        height={height}
        language={language}
        value={fileContent}
        theme={getMonacoTheme()}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={{
          selectOnLineNumbers: true,
          roundedSelection: false,
          readOnly,
          cursorStyle: 'line',
          automaticLayout: true,
        }}
      />
    </div>
  );
};

export default MonacoEditor;
