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

  // Determine the language based on file extension
  const getLanguageFromFilePath = useCallback((path: string): string => {
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
  }, [language]);

  // Use the detected language
  const detectedLanguage = getLanguageFromFilePath(filePath);

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

    // Configure language support based on file type
    if (detectedLanguage === 'solidity') {
      configureSolidityLanguage(monaco);
    } else if (detectedLanguage === 'typescript' || detectedLanguage === 'javascript') {
      configureTypeScriptLanguage(monaco);
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

  // Configure TypeScript/JavaScript language support
  const configureTypeScriptLanguage = (monaco: any) => {
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
      typeRoots: ['node_modules/@types']
    });

    // Add React types
    fetch('https://unpkg.com/@types/react@latest/index.d.ts').then(response => {
      if (response.ok) {
        response.text().then(text => {
          monaco.languages.typescript.typescriptDefaults.addExtraLib(
            text,
            'file:///node_modules/@types/react/index.d.ts'
          );
        });
      }
    }).catch(error => {
      console.error('Failed to fetch React types:', error);
    });

    // Add common snippets for TypeScript/JavaScript
    monaco.languages.registerCompletionItemProvider('typescript', {
      provideCompletionItems: (model: any, position: any) => {
        const suggestions = [
          {
            label: 'import',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'import { $1 } from "$2";$0',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Import statement'
          },
          {
            label: 'function',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'function ${1:name}(${2:params}) {\n\t$0\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Function declaration'
          },
          {
            label: 'arrow function',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '(${1:params}) => {\n\t$0\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Arrow function'
          },
          {
            label: 'class',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'class ${1:Name} {\n\tconstructor(${2:params}) {\n\t\t$0\n\t}\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Class declaration'
          },
          {
            label: 'interface',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'interface ${1:Name} {\n\t$0\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Interface declaration'
          },
          {
            label: 'type',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'type ${1:Name} = $0;',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Type declaration'
          },
          {
            label: 'react component',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'import React from "react";\n\ninterface ${1:ComponentName}Props {\n\t$2\n}\n\nconst ${1:ComponentName}: React.FC<${1:ComponentName}Props> = (${3:props}) => {\n\treturn (\n\t\t<div>\n\t\t\t$0\n\t\t</div>\n\t);\n};\n\nexport default ${1:ComponentName};',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'React functional component'
          },
          {
            label: 'useState',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState<${2:type}>(${3:initialValue});$0',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'React useState hook'
          },
          {
            label: 'useEffect',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'useEffect(() => {\n\t$1\n\treturn () => {\n\t\t$2\n\t};\n}, [${3:dependencies}]);$0',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'React useEffect hook'
          }
        ];

        return { suggestions };
      }
    });

    // Add the same snippets for JavaScript
    monaco.languages.registerCompletionItemProvider('javascript', {
      provideCompletionItems: (model: any, position: any) => {
        const suggestions = [
          {
            label: 'import',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'import { $1 } from "$2";$0',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Import statement'
          },
          {
            label: 'function',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'function ${1:name}(${2:params}) {\n\t$0\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Function declaration'
          },
          {
            label: 'arrow function',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '(${1:params}) => {\n\t$0\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Arrow function'
          },
          {
            label: 'class',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'class ${1:Name} {\n\tconstructor(${2:params}) {\n\t\t$0\n\t}\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Class declaration'
          },
          {
            label: 'react component',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'import React from "react";\n\nconst ${1:ComponentName} = (${2:props}) => {\n\treturn (\n\t\t<div>\n\t\t\t$0\n\t\t</div>\n\t);\n};\n\nexport default ${1:ComponentName};',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'React functional component'
          },
          {
            label: 'useState',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState(${2:initialValue});$0',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'React useState hook'
          },
          {
            label: 'useEffect',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'useEffect(() => {\n\t$1\n\treturn () => {\n\t\t$2\n\t};\n}, [${3:dependencies}]);$0',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'React useEffect hook'
          }
        ];

        return { suggestions };
      }
    });
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
            [/\b(contract|library|interface|function|modifier|event|struct|enum|mapping|address|uint|int|bool|string|bytes|pragma|import|using|for|if|else|while|do|break|continue|return|throw|emit|require|assert|revert|constructor|fallback|receive|try|catch|abstract|is|override|virtual)\b/, 'keyword'],

            // Visibility modifiers
            [/\b(public|private|internal|external|pure|view|payable|constant|immutable|memory|storage|calldata)\b/, 'keyword.modifier'],

            // Types
            [/\b(uint8|uint16|uint32|uint64|uint128|uint256|int8|int16|int32|int64|int128|int256|bytes1|bytes2|bytes4|bytes8|bytes16|bytes32|fixed|ufixed)\b/, 'type'],

            // Global variables and units
            [/\b(msg|block|tx|this|super|now|wei|gwei|ether|seconds|minutes|hours|days|weeks)\b/, 'variable.predefined'],

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
              label: 'constructor',
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: 'constructor(${1:parameters}) {\n\t$0\n}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Create a constructor'
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
            },
            {
              label: 'struct',
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: 'struct ${1:StructName} {\n\t${2:type} ${3:variableName};\n\t$0\n}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Create a new struct'
            },
            {
              label: 'enum',
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: 'enum ${1:EnumName} {\n\t${2:Value1},\n\t${3:Value2},\n\t$0\n}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Create a new enum'
            },
            {
              label: 'interface',
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: 'interface ${1:InterfaceName} {\n\t$0\n}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Create a new interface'
            },
            {
              label: 'library',
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: 'library ${1:LibraryName} {\n\t$0\n}',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Create a new library'
            },
            {
              label: 'require',
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: 'require(${1:condition}, "${2:error message}");$0',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Add a require statement'
            },
            {
              label: 'assert',
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: 'assert(${1:condition});$0',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Add an assert statement'
            },
            {
              label: 'revert',
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: 'revert("${1:error message}");$0',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Add a revert statement'
            },
            {
              label: 'natspec',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: '/**\n * @title ${1:Title}\n * @dev ${2:Description}\n */$0',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Add NatSpec documentation'
            }
          ];

          return {suggestions};
        }
      });

      // Register hover provider for Solidity
      monaco.languages.registerHoverProvider('solidity', {
        provideHover: (model: any, position: any) => {
          const word = model.getWordAtPosition(position);
          if (!word) return null;

          const solidityKeywords: Record<string, string> = {
            'contract': 'A contract in the sense of Solidity is a collection of code (its functions) and data (its state) that resides at a specific address on the Ethereum blockchain.',
            'function': 'Functions are the executable units of code within a contract.',
            'modifier': 'Modifiers can be used to change the behavior of functions in a declarative way.',
            'event': 'Events allow the convenient usage of the EVM logging facilities.',
            'struct': 'Structs are custom defined types that can group several variables.',
            'enum': 'Enums can be used to create custom types with a finite set of values.',
            'mapping': 'Mapping types use the syntax mapping(KeyType => ValueType).',
            'address': 'The address type holds a 20 byte value (size of an Ethereum address).',
            'require': 'The require function is used to validate conditions and throw an exception if the condition is not met.',
            'assert': 'The assert function creates an error of type Panic(uint256) when the condition is false.',
            'revert': 'The revert statement causes a Panic(uint256) error and reverts all state changes.',
            'constructor': 'A constructor is an optional function declared with the constructor keyword which is executed upon contract creation.',
            'fallback': 'A contract can have at most one fallback function, declared using fallback () external [payable].',
            'receive': 'A contract can have at most one receive function, declared using receive() external payable.',
          };

          if (solidityKeywords[word.word]) {
            return {
              contents: [
                { value: `**${word.word}**` },
                { value: solidityKeywords[word.word] }
              ]
            };
          }

          return null;
        }
      });

      // Register document formatting provider
      monaco.languages.registerDocumentFormattingEditProvider('solidity', {
        provideDocumentFormattingEdits: (model: any) => {
          // Basic formatting - just add proper indentation
          const text = model.getValue();
          const lines = text.split('\n');
          let indentLevel = 0;
          const formattedLines = lines.map(line => {
            const trimmedLine = line.trim();

            // Decrease indent for closing braces
            if (trimmedLine.startsWith('}')) {
              indentLevel = Math.max(0, indentLevel - 1);
            }

            // Format the line with proper indentation
            const formattedLine = indentLevel > 0
              ? '    '.repeat(indentLevel) + trimmedLine
              : trimmedLine;

            // Increase indent for opening braces
            if (trimmedLine.endsWith('{')) {
              indentLevel++;
            }

            return formattedLine;
          });

          return [
            {
              range: model.getFullModelRange(),
              text: formattedLines.join('\n')
            }
          ];
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
