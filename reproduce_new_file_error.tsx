import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import MonacoEditor from './src/components/CodeEditor/MonacoEditor';

// Test the specific scenario: creating a new solidity file in the contract folder
const NewFileTest = () => {
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [files, setFiles] = useState<string[]>([]);

  const createNewFile = () => {
    const newFileName = `/contracts/NewContract${files.length + 1}.sol`;
    console.log('Creating new file:', newFileName);
    setFiles(prev => [...prev, newFileName]);
    setActiveFile(newFileName);
  };

  const openFile = (filePath: string) => {
    console.log('Opening file:', filePath);
    setActiveFile(filePath);
  };

  return (
    <div style={{ height: '600px', width: '800px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '10px', backgroundColor: '#f0f0f0' }}>
        <h2>Test: Creating New Solidity Files</h2>
        <p>This reproduces the "Cannot read properties of null (reading 'getFullModelRange')" error</p>
        <button
          onClick={createNewFile}
          style={{
            padding: '8px 16px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Create New Solidity File
        </button>
        <span>Files created: {files.length}</span>
      </div>

      {/* File tabs */}
      {files.length > 0 && (
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
      )}

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
                onContentChange={(content) => {
                  console.log('Content changed for', activeFile, ':', content.length, 'characters');
                }}
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
            <div style={{ textAlign: 'center' }}>
              <h2>Click "Create New Solidity File" to test</h2>
              <p>This should reproduce the getFullModelRange error when opening new files</p>
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
root.render(<NewFileTest />);
