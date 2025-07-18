import React from 'react';
import { createRoot } from 'react-dom/client';
import MonacoEditor from './src/components/CodeEditor/MonacoEditor';

// Simple test to reproduce the infinite re-render error
const TestApp = () => {
  return (
    <div style={{ height: '400px', width: '600px' }}>
      <MonacoEditor
        filePath="test.sol"
        language="solidity"
        height="100%"
      />
    </div>
  );
};

// Create a container and render the test
const container = document.createElement('div');
document.body.appendChild(container);
const root = createRoot(container);
root.render(<TestApp />);
