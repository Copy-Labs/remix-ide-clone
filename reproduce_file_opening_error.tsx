import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import MonacoEditor from './src/components/CodeEditor/MonacoEditor';

// Simulate the file opening scenario that causes the infinite re-render error
const FileOpeningTest = () => {
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [files] = useState([
    '/contracts/Example.sol',
    '/contracts/MyContract.sol',
    '/scripts/deploy.js'
  ]);

  const openFile = (filePath: string) => {
    console.log('Opening file:', filePath);
    setActiveFile(filePath);
  };

  return (
    <div style={{ height: '600px', width: '800px', display: 'flex', flexDirection: 'column' }}>
      {/* File tabs to simulate clicking on files */}
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
        {activeFile ? (
          <div style={{ height: '100%', border: '1px solid #ccc' }}>
            <h3>Editing: {activeFile}</h3>
            <div style={{ height: 'calc(100% - 30px)' }}>
              <MonacoEditor
                filePath={activeFile}
                language="solidity"
                height="100%"
              />
            </div>
          </div>
        ) : (
          <div style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #ccc'
          }}>
            <div>
              <h2>Click on a file to open it</h2>
              <p>This simulates the scenario where clicking on Example.sol causes infinite re-renders</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Create a container and render the test
const container = document.createElement('div');
document.body.appendChild(container);
const root = createRoot(container);
root.render(<FileOpeningTest />);
