import React, { useState } from 'react';
// import {Toaster} from 'react-hot-toast';
import {useFileStore} from './stores/fileStore';
import {useEditorStore} from './stores/editorStore';
import {usePluginStore} from './stores/pluginStore';
import PluginPanel from './components/PluginUI/PluginPanel';
import ErrorBoundary from './components/ErrorBoundary';
import MonacoEditor from './components/CodeEditor/MonacoEditor';
import CompilerPanel from './components/Compiler/CompilerPanel';
import DeploymentPanel from './components/Deployment/DeploymentPanel';
import FileExplorer from './components/FileExplorer/FileExplorer';
import { corePlugins } from './plugins';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar.tsx';
import { Separator } from '@/components/ui/separator.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList, BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb.tsx';
import { AppSidebar } from './components/AppSidebar';
import { ThemeProvider } from '@/components/ThemeProvider.tsx';
import { Settings } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner.tsx';

// Define main page views
type MainView = 'editor' | 'plugins';

function App() {
  const {files, activeFile, openTabs, createFile, openFile} = useFileStore();
  const {theme} = useEditorStore();
  const { registerPlugin } = usePluginStore();
  const [showPluginPanel, setShowPluginPanel] = useState(false);
  const [mainView, setMainView] = useState<MainView>('editor');

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

  // Initialize plugins on first load
  React.useEffect(() => {
    const { loadPlugins } = usePluginStore.getState();

    // First, register core plugins
    corePlugins.forEach(plugin => {
      try {
        const currentPlugins = usePluginStore.getState().plugins;
        // Only register if plugin doesn't already exist
        const existingPlugin = currentPlugins.find(p => p.id === plugin.id);
        if (!existingPlugin) {
          registerPlugin(plugin);
          console.log(`Plugin registered: ${plugin.name}`);
        } else {
          console.log(`Plugin already exists: ${plugin.name}`);
        }
      } catch (error) {
        console.error(`Failed to register plugin ${plugin.name}:`, error);
      }
    });

    // Then load saved states from localStorage and apply them to the registered plugins
    setTimeout(() => {
      loadPlugins();
      console.log('Plugin states loaded from localStorage');
    }, 50); // Small delay to ensure plugin registration completes first
  }, [registerPlugin]);

  return (
    <ThemeProvider>
      <ErrorBoundary>
        {/* Toast Notifications */}
        {/*<Toaster
          containerClassName={''}
          position="bottom-right"
          toastOptions={{
            className: 'dark:bg-gray-800 dark:text-white z-50',
            duration: 4000,
          }}
        />*/}

        <Toaster />

        <SidebarProvider
          style={
            {
              '--sidebar-width': '400px',
            } as React.CSSProperties
          }
        >
          <AppSidebar />
          <SidebarInset>
            <header className="bg-background sticky top-0 flex shrink-0 items-center gap-2 border-b p-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
              {openTabs.length > 0 && (
                <div className="">
                  <div className="flex">
                    {openTabs.map((filePath) => {
                      const file = files.get(filePath);
                      if (!file) return null;

                      return (
                        <div
                          key={filePath}
                          className={`px-4 py-2 text-sm rounded-lg cursor-pointer ${
                            activeFile === filePath ? 'bg-secondary' : ''
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
              <div className={'flex items-center justify-end gap-2 w-full'}>
                <div className="flex items-center space-x-4">
                  {/* Main View Navigation */}
                  <div className="flex items-center space-x-2">
                    <Button
                      variant={mainView === 'editor' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setMainView('editor')}
                    >
                      Editor
                    </Button>
                    <Button
                      variant={mainView === 'plugins' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setMainView('plugins')}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Plugin Manager
                    </Button>
                  </div>

                  <Separator orientation="vertical" className="h-4" />

                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Files: {Array.from(files.values()).filter((f) => f.type === 'file').length}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Open: {openTabs.length}
                    </span>
                  </div>
                </div>
              </div>
            </header>
            <div className="flex flex-1 flex-col gap-4">
              {mainView === 'plugins' ? (
                <div className="h-full">
                  <ErrorBoundary>
                    <PluginPanel />
                  </ErrorBoundary>
                </div>
              ) : (
                <>
                  {activeFile ? (
                    <div className="h-full">
                      <div className="p-4">
                        <Breadcrumb>
                          <BreadcrumbList>
                            <BreadcrumbItem className="hidden md:block">
                              <BreadcrumbPage>{activeFile.split('/')[1]}</BreadcrumbPage>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="hidden md:block" />
                            <BreadcrumbItem>
                              <BreadcrumbPage>{activeFile.split('/')[activeFile.split('/').length-1]}</BreadcrumbPage>
                            </BreadcrumbItem>
                          </BreadcrumbList>
                        </Breadcrumb>
                      </div>

                      {/* Monaco Editor */}
                      <div className="w-full h-[calc(100%-100px)]">
                        <ErrorBoundary>
                          <MonacoEditor filePath={activeFile} height="100%" />
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
                          Select a file from the explorer to start editing, or use the Plugin Manager to configure your development environment
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
                            <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                              Quick Start
                            </h3>
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
                </>
              )}
            </div>
          </SidebarInset>
        </SidebarProvider>

        {/*<div*/}
        {/*  className={`hidden h-screen overflow-hidden dark:bg-gray-900 ${theme === 'dark' ? 'dark' : ''}`}*/}
        {/*>*/}
        {/*  /!* Header *!/*/}
        {/*  <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2">*/}
        {/*    <div className="flex items-center justify-between">*/}
        {/*      <div className="flex items-center space-x-4">*/}
        {/*        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Remix IDE Clone</h1>*/}
        {/*        <div className="text-sm text-gray-500 dark:text-gray-400">*/}
        {/*          Modern Solidity Development Environment*/}
        {/*        </div>*/}
        {/*      </div>*/}
        {/*      <div className="flex items-center space-x-4">*/}
        {/*        <div className="flex items-center space-x-2">*/}
        {/*          <span className="text-sm text-gray-600 dark:text-gray-300">*/}
        {/*            Files: {Array.from(files.values()).filter((f) => f.type === 'file').length}*/}
        {/*          </span>*/}
        {/*          <span className="text-sm text-gray-600 dark:text-gray-300">*/}
        {/*            Open: {openTabs.length}*/}
        {/*          </span>*/}
        {/*        </div>*/}
        {/*        <button*/}
        {/*          onClick={() => setShowPluginPanel(!showPluginPanel)}*/}
        {/*          className={`px-3 py-1 text-sm rounded ${*/}
        {/*            showPluginPanel*/}
        {/*              ? 'bg-blue-500 text-white'*/}
        {/*              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'*/}
        {/*          }`}*/}
        {/*        >*/}
        {/*          {showPluginPanel ? 'Hide Plugins' : 'Show Plugins'}*/}
        {/*        </button>*/}
        {/*      </div>*/}
        {/*    </div>*/}
        {/*  </header>*/}

        {/*  /!* Main Layout *!/*/}
        {/*  <div className="flex h-screen overflow-hidden">*/}
        {/*    /!* Sidebar *!/*/}
        {/*    <aside className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-y-scroll">*/}
        {/*      /!* File Explorer *!/*/}
        {/*      <div className="flex-1 border-b border-gray-200 dark:border-gray-700">*/}
        {/*        <ErrorBoundary>*/}
        {/*          <FileExplorer />*/}
        {/*        </ErrorBoundary>*/}
        {/*      </div>*/}

        {/*      /!* Compiler Panel *!/*/}
        {/*      <div className="flex-1 p-4 border-b border-gray-200 dark:border-gray-700">*/}
        {/*        <ErrorBoundary>*/}
        {/*          <CompilerPanel />*/}
        {/*        </ErrorBoundary>*/}
        {/*      </div>*/}

        {/*      /!* Deployment Panel *!/*/}
        {/*      <div className="flex-1 p-4">*/}
        {/*        <ErrorBoundary>*/}
        {/*          <DeploymentPanel />*/}
        {/*        </ErrorBoundary>*/}
        {/*      </div>*/}
        {/*    </aside>*/}

        {/*    /!* Plugin Panel - conditionally rendered *!/*/}
        {/*    {showPluginPanel && (*/}
        {/*      <div className="w-96 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">*/}
        {/*        <ErrorBoundary>*/}
        {/*          <PluginPanel />*/}
        {/*        </ErrorBoundary>*/}
        {/*      </div>*/}
        {/*    )}*/}

        {/*    /!* Main Content *!/*/}
        {/*    <main className="flex-1 bg-gray-50 dark:bg-gray-900">*/}
        {/*      /!* Tab Bar *!/*/}
        {/*      {openTabs.length > 0 && (*/}
        {/*        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">*/}
        {/*          <div className="flex">*/}
        {/*            {openTabs.map((filePath) => {*/}
        {/*              const file = files.get(filePath);*/}
        {/*              if (!file) return null;*/}

        {/*              return (*/}
        {/*                <div*/}
        {/*                  key={filePath}*/}
        {/*                  className={`px-4 py-2 text-sm border-r border-gray-200 dark:border-gray-700 cursor-pointer ${*/}
        {/*                    activeFile === filePath*/}
        {/*                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'*/}
        {/*                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'*/}
        {/*                  }`}*/}
        {/*                  onClick={() => openFile(filePath)}*/}
        {/*                >*/}
        {/*                  {file.name}*/}
        {/*                </div>*/}
        {/*              );*/}
        {/*            })}*/}
        {/*          </div>*/}
        {/*        </div>*/}
        {/*      )}*/}

        {/*      /!* Editor Area *!/*/}
        {/*      <div className="h-full">*/}
        {/*        {activeFile ? (*/}
        {/*          <div className="h-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">*/}
        {/*            <div className="mb-4">*/}
        {/*              <h3 className="text-lg font-medium text-gray-900 dark:text-white">*/}
        {/*                {files.get(activeFile)?.name}*/}
        {/*              </h3>*/}
        {/*              <p className="text-sm text-gray-500 dark:text-gray-400">{activeFile}</p>*/}
        {/*            </div>*/}

        {/*            /!* Monaco Editor *!/*/}
        {/*            <div className="h-[calc(100%-80px)] bg-gray-50 dark:bg-gray-900 rounded-sm border">*/}
        {/*              <ErrorBoundary>*/}
        {/*                <MonacoEditor filePath={activeFile} height="100%" />*/}
        {/*              </ErrorBoundary>*/}
        {/*            </div>*/}
        {/*          </div>*/}
        {/*        ) : (*/}
        {/*          <div className="h-full flex items-center justify-center">*/}
        {/*            <div className="text-center">*/}
        {/*              <div className="text-6xl mb-4">📝</div>*/}
        {/*              <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-2">*/}
        {/*                Welcome to Remix IDE Clone*/}
        {/*              </h2>*/}
        {/*              <p className="text-gray-600 dark:text-gray-400 mb-4">*/}
        {/*                Select a file from the explorer to start editing*/}
        {/*              </p>*/}
        {/*              <div className="grid grid-cols-2 gap-4 text-left max-w-md mx-auto">*/}
        {/*                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">*/}
        {/*                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">*/}
        {/*                    Features*/}
        {/*                  </h3>*/}
        {/*                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">*/}
        {/*                    <li>✅ Modern React + TypeScript</li>*/}
        {/*                    <li>✅ Zustand State Management</li>*/}
        {/*                    <li>✅ Tailwind CSS Styling</li>*/}
        {/*                    <li>✅ Monaco Editor Integration</li>*/}
        {/*                    <li>✅ Solidity Compilation</li>*/}
        {/*                    <li>✅ Web3 Deployment</li>*/}
        {/*                  </ul>*/}
        {/*                </div>*/}
        {/*                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">*/}
        {/*                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">*/}
        {/*                    Quick Start*/}
        {/*                  </h3>*/}
        {/*                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">*/}
        {/*                    <li>1. Open Example.sol</li>*/}
        {/*                    <li>2. Edit the contract</li>*/}
        {/*                    <li>3. Compile with Solidity</li>*/}
        {/*                    <li>4. Deploy to testnet</li>*/}
        {/*                    <li>5. Interact with contract</li>*/}
        {/*                  </ul>*/}
        {/*                </div>*/}
        {/*              </div>*/}
        {/*            </div>*/}
        {/*          </div>*/}
        {/*        )}*/}
        {/*      </div>*/}
        {/*    </main>*/}
        {/*  </div>*/}

        {/*  /!* Toast Notifications *!/*/}
        {/*  <Toaster*/}
        {/*    position="top-left"*/}
        {/*    toastOptions={{*/}
        {/*      className: 'dark:bg-gray-800 dark:text-white z-50',*/}
        {/*      duration: 4000,*/}
        {/*    }}*/}
        {/*  />*/}
        {/*</div>*/}
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
