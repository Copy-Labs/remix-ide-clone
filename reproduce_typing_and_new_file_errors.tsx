import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import MonacoEditor from './src/components/CodeEditor/MonacoEditor';

// Test both issues:
// 1. Keystroke recursion when typing in existing files
// 2. getFullModelRange error when opening new files
const TestApp = () => {
  const [activeFile, setActiveFile] = useState<string>('/contracts/Example.sol');
  const [files] = useState([
    '/contracts/Example.sol',
    '/contracts/NewFile.sol', // This simulates a newly created file
  ]);

  const openFile = (filePath: string) => {
    console.log('Opening file:', filePath);
    setActiveFile(filePath);
  };

  return (
    <div style={{ height: '600px', width: '800px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '10px', backgroundColor: '#f0f0f0' }}>
        <h2>Test for Two Issues:</h2>
        <ol>
          <li><strong>Keystroke Recursion:</strong> Open Example.sol and try typing - should not create recursive keystrokes</li>
          <li><strong>getFullModelRange Error:</strong> Open NewFile.sol - should not throw "Cannot read properties of null" error</li>
        </ol>
      </div>

      {/* File tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #ccc', padding: '10px' }}>
        {files.map(filePath => (
          <button
            key={filePath}
            onClick={() => openFile(filePath)}
            style={{
              padding: '8px 16px',
              marginRight: '8px',
              backgroundColor: activeFile === filePath ? '#007acc' : '#f0f0f0',
              color: activeFile === filePath ? 'white' : 'black',
              border: '1px solid #ccc',
              cursor: 'pointer'
            }}
          >
            {filePath.split('/').pop()}
          </button>
        ))}
      </div>

      {/* Editor area */}
      <div style={{ flex: 1, padding: '10px' }}>
        <div style={{ height: '100%', border: '1px solid #ccc' }}>
          <h3>Editing: {activeFile}</h3>
          <div style={{ height: 'calc(100% - 30px)' }}>
            <MonacoEditor
              filePath={activeFile}
              language="solidity"
              height="100%"
              onContentChange={(content) => {
                console.log('Content changed:', content.length, 'characters');
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Create a container and render the test
const container = document.createElement('div');
document.body.appendChild(container);
const root = createRoot(container);
root.render(<TestApp />);
