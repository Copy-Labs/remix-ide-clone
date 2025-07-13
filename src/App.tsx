import React from 'react';
import { Toaster } from 'react-hot-toast';
import { useFileStore } from './stores/fileStore';
import { useEditorStore } from './stores/editorStore';
import ErrorBoundary from './components/ErrorBoundary';
import MonacoEditor from './components/CodeEditor/MonacoEditor';
import CompilerPanel from './components/Compiler/CompilerPanel';
import FileExplorer from './components/FileExplorer/FileExplorer';

function App() {
  const { files, activeFile, openTabs, createFile, openFile } = useFileStore();
  const { theme } = useEditorStore();

  // Initialize sample files on first load
  React.useEffect(() => {
    if (files.size === 0) {
      // Create sample Solidity contract
      const sampleContract = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title SimpleStorage
 * @dev Store & retrieve value in a variable
 */
contract SimpleStorage {
    uint256 private storedData;

    event ValueChanged(uint256 newValue);

    /**
     * @dev Store value in variable
     * @param x value to store
     */
    function set(uint256 x) public {
        storedData = x;
        emit ValueChanged(x);
    }

    /**
     * @dev Return value 
     * @return value of 'storedData'
     */
    function get() public view returns (uint256) {
        return storedData;
    }
}`;

      // Create sample JavaScript file
      const sampleJS = `// Sample JavaScript file
console.log("Hello, Remix IDE Clone!");

// Example function
function calculateSum(a, b) {
    return a + b;
}

// Example usage
const result = calculateSum(5, 3);
console.log("Result:", result);`;

      createFile('/contracts/SimpleStorage.sol', sampleContract);
      createFile('/scripts/example.js', sampleJS);

      // Open the Solidity file by default
      openFile('/contracts/SimpleStorage.sol');
    }
  }, [files.size, createFile, openFile]);

  return (
    <ErrorBoundary>
      <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${theme === 'dark' ? 'dark' : ''}`}>
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Remix IDE Clone
            </h1>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Modern Solidity Development Environment
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Files: {Array.from(files.values()).filter(f => f.type === 'file').length}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Open: {openTabs.length}
            </span>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex h-[calc(100vh-60px)]">
        {/* Sidebar */}
        <aside className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          {/* File Explorer */}
          <div className="flex-1 border-b border-gray-200 dark:border-gray-700">
            <ErrorBoundary>
              <FileExplorer />
            </ErrorBoundary>
          </div>

          {/* Compiler Panel */}
          <div className="flex-1 p-4">
            <ErrorBoundary>
              <CompilerPanel />
            </ErrorBoundary>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 bg-gray-50 dark:bg-gray-900">
          {/* Tab Bar */}
          {openTabs.length > 0 && (
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="flex">
                {openTabs.map(filePath => {
                  const file = files.get(filePath);
                  if (!file) return null;

                  return (
                    <div
                      key={filePath}
                      className={`px-4 py-2 text-sm border-r border-gray-200 dark:border-gray-700 cursor-pointer ${
                        activeFile === filePath
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                      onClick={() => openFile(filePath)}
                    >
                      {file.name}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Editor Area */}
          <div className="h-full p-4">
            {activeFile ? (
              <div className="h-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {files.get(activeFile)?.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {activeFile}
                  </p>
                </div>

                {/* Monaco Editor */}
                <div className="h-[calc(100%-80px)] bg-gray-50 dark:bg-gray-900 rounded border">
                  <ErrorBoundary>
                    <MonacoEditor
                      filePath={activeFile}
                      height="100%"
                    />
                  </ErrorBoundary>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4">📝</div>
                  <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                    Welcome to Remix IDE Clone
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Select a file from the explorer to start editing
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-left max-w-md mx-auto">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                      <h3 className="font-medium text-gray-900 dark:text-white mb-2">Features</h3>
                      <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <li>✅ Modern React + TypeScript</li>
                        <li>✅ Zustand State Management</li>
                        <li>✅ Tailwind CSS Styling</li>
                        <li>✅ Monaco Editor Integration</li>
                        <li>✅ Solidity Compilation</li>
                        <li>✅ Web3 Deployment</li>
                      </ul>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                      <h3 className="font-medium text-gray-900 dark:text-white mb-2">Quick Start</h3>
                      <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <li>1. Open Example.sol</li>
                        <li>2. Edit the contract</li>
                        <li>3. Compile with Solidity</li>
                        <li>4. Deploy to testnet</li>
                        <li>5. Interact with contract</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Toast Notifications */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          className: 'dark:bg-gray-800 dark:text-white',
          duration: 4000,
        }}
      />
      </div>
    </ErrorBoundary>
  );
}

export default App;
