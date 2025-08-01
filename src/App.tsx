import React, { useState } from 'react';
// import {Toaster} from 'react-hot-toast';
import { useFileStore } from './stores/fileStore';
import { useEditorStore } from './stores/editorStore';
import { usePluginStore } from './stores/pluginStore';
import PluginPanel from './components/PluginUI/PluginPanel';
import ErrorBoundary from './components/ErrorBoundary';
import MonacoEditor from './components/CodeEditor/MonacoEditor';
import EditorTabs from './components/CodeEditor/EditorTabs';
import { corePlugins } from './plugins';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar.tsx';
import { Separator } from '@/components/ui/separator.tsx';
import { Button } from '@/components/ui/button.tsx';
import { gitFileSystemIntegration } from './services/gitFileSystemIntegration';
import { gitHooksService } from './services/gitHooksService';
import { gitCompilerIntegration } from './services/gitCompilerIntegration';
import { gitDeploymentIntegration } from './services/gitDeploymentIntegration';
import { gitTestingIntegration } from './services/gitTestingIntegration';
import { gitCollaborationIntegration } from './services/gitCollaborationIntegration';
import { gitDebuggerIntegration } from './services/gitDebuggerIntegration';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card.tsx';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb.tsx';
import { AppSidebar } from './components/AppSidebar';
import { ThemeProvider } from '@/components/ThemeProvider.tsx';
import { LucidePlug, Settings } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner.tsx';

// Define main page views
type MainView = 'editor' | 'plugins';

function App() {
  const { files, activeFile, openTabs, createFile, createFolder, openFile } = useFileStore();
  const { theme } = useEditorStore();
  const { registerPlugin } = usePluginStore();
  const [showPluginPanel, setShowPluginPanel] = useState(false);
  const [mainView, setMainView] = useState<MainView>('editor');

  // Initialize sample files on first load
  React.useEffect(() => {
    // Check if specific files exist
    const contractExists = Array.from(files.keys()).some(
      (path) => path === '/contracts/SimpleStorage.sol',
    );
    const scriptExists = Array.from(files.keys()).some((path) => path === '/scripts/example.js');
    const testExists = Array.from(files.keys()).some(
      (path) => path === '/tests/SimpleStorage.test.js',
    );

    // Create sample Solidity contract if it doesn't exist
    if (!contractExists) {
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

      // Create directory first if it doesn't exist
      if (!Array.from(files.keys()).some((path) => path === '/contracts')) {
        createFolder('/contracts');
      }

      // Then create file
      createFile('/contracts/SimpleStorage.sol', sampleContract);
    }

    // Create sample JavaScript file if it doesn't exist
    if (!scriptExists) {
      const sampleJS = `// Sample JavaScript file
console.log("Hello, Remix IDE Clone!");

// Example function
function calculateSum(a, b) {
    return a + b;
}

// Example usage
const result = calculateSum(5, 3);
console.log("Result:", result);`;

      // Create directory first if it doesn't exist
      if (!Array.from(files.keys()).some((path) => path === '/scripts')) {
        createFolder('/scripts');
      }

      // Then create file
      createFile('/scripts/example.js', sampleJS);
    }

    // Create sample test file for SimpleStorage contract if it doesn't exist
    if (!testExists) {
      const sampleTest = `// Test file for SimpleStorage contract
const { expect } = require("chai");

describe("SimpleStorage Contract", function() {
  let simpleStorage;

  beforeEach(async function() {
    // Deploy a new SimpleStorage contract for each test
    const SimpleStorage = await ethers.getContractFactory("SimpleStorage");
    simpleStorage = await SimpleStorage.deploy();
    await simpleStorage.deployed();
  });

  it("Should return 0 initially", async function() {
    // Initial value should be 0
    expect(await simpleStorage.get()).to.equal(0);
  });

  it("Should set and retrieve the value correctly", async function() {
    // Set the value to 42
    const setTx = await simpleStorage.set(42);
    await setTx.wait();

    // Get the value and check if it's 42
    expect(await simpleStorage.get()).to.equal(42);
  });

  it("Should emit ValueChanged event when setting a value", async function() {
    // Check if the ValueChanged event is emitted with the correct value
    await expect(simpleStorage.set(100))
      .to.emit(simpleStorage, "ValueChanged")
      .withArgs(100);
  });
});`;

      // Create directory first if it doesn't exist
      if (!Array.from(files.keys()).some((path) => path === '/tests')) {
        createFolder('/tests');
      }

      // Then create file
      createFile('/tests/SimpleStorage.test.js', sampleTest);
    }

    // Always open the Solidity file by default
    // openFile('/contracts/SimpleStorage.sol');
  }, [files, createFile, createFolder, openFile]);

  // Initialize plugins on first load
  React.useEffect(() => {
    const { loadPlugins } = usePluginStore.getState();

    // First, register core plugins
    corePlugins.forEach((plugin) => {
      try {
        const currentPlugins = usePluginStore.getState().plugins;
        // Only register if plugin doesn't already exist
        const existingPlugin = currentPlugins.find((p) => p.id === plugin.id);
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

      // Initialize Git file system integration
      gitFileSystemIntegration.initialize();
      console.log('Git file system integration initialized');

      // Initialize Git hooks service
      gitHooksService.initialize();
      console.log('Git hooks service initialized');

      // Initialize Git compiler integration
      gitCompilerIntegration.initialize();
      console.log('Git compiler integration initialized');

      // Initialize Git deployment integration
      gitDeploymentIntegration.initialize();
      console.log('Git deployment integration initialized');

      // Initialize Git testing integration
      gitTestingIntegration.initialize();
      console.log('Git testing integration initialized');

      // Initialize Git collaboration integration
      gitCollaborationIntegration.initialize();
      console.log('Git collaboration integration initialized');

      // Initialize Git debugger integration
      gitDebuggerIntegration.initialize();
      console.log('Git debugger integration initialized');
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
          className={'h-screen overflow-hidden'}
          style={
            {
              '--sidebar-width': '400px',
            } as React.CSSProperties
          }
        >
          <AppSidebar />
          <SidebarInset className={'h-screen overflow-y-auto'}>
            <div className="bg-card sticky top-0 flex shrink-0 items-center gap-2 border-b border-border px-4 py-2 overflow-x-auto z-10 max-w-[calc(100%-var(--sidebar-width-icon)+var(--sidebar-width-icon))]!">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
              <div className="flex-1 space-x-1 overflow-x-auto w-full">
                {openTabs.length > 0 && <EditorTabs />}
                {/*{openTabs.map((filePath) => {
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
                  })}*/}
              </div>
              <div className={'flex items-center justify-end gap-2'}>
                <div className="flex items-center space-x-4">
                  {/* Main View Navigation */}
                  {/*<div className="flex items-center space-x-2">
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
                      <LucidePlug className="h-4 w-4" />
                      Plugins
                    </Button>
                  </div>*/}

                  {/*<Separator orientation="vertical" className="h-4" />*/}

                  {/*<div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Files: {Array.from(files.values()).filter((f) => f.type === 'file').length}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Open: {openTabs.length}
                    </span>
                  </div>*/}
                </div>
              </div>
            </div>
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
                    <div className="h-full bg-card">
                      {/*<div className="p-4">
                        <Breadcrumb>
                          <BreadcrumbList>
                            <BreadcrumbItem className="hidden md:block">
                              <BreadcrumbPage>{activeFile.split('/')[1]}</BreadcrumbPage>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="hidden md:block" />
                            <BreadcrumbItem>
                              <BreadcrumbPage>
                                {activeFile.split('/')[activeFile.split('/').length - 1]}
                              </BreadcrumbPage>
                            </BreadcrumbItem>
                          </BreadcrumbList>
                        </Breadcrumb>
                      </div>*/}

                      {/* Monaco Editor */}
                      <div className="w-full h-[calc(100%-100px)]">
                        <ErrorBoundary>
                          <MonacoEditor filePath={activeFile} height="100%" />
                        </ErrorBoundary>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center p-6">
                      <div className="max-w-4xl w-full">
                        <div className="text-center mb-8">
                          <div className="inline-flex items-center justify-center bg-primary/10 p-3 rounded-full mb-4">
                            <div className="text-4xl">🚀</div>
                          </div>
                          <h1 className="text-3xl font-bold tracking-tight mb-2">
                            Welcome to Solide
                          </h1>
                          <div className="font-bold text-muted-foreground text-lg">
                            A Modern Remix IDE alternative
                          </div>
                          <p className="text-muted-foreground max-w-2xl mx-auto">
                            A modern Solidity development environment with powerful features for
                            smart contract development
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-3 items-start gap-6 mb-8">
                          <Card>
                            <CardHeader>
                              <CardTitle>Create</CardTitle>
                              <CardDescription>Start building your smart contracts</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <ul className="space-y-2 text-sm">
                                <li className="flex items-center">
                                  <div className="mr-2 h-4 w-4 text-primary">✓</div>
                                  <span>Open the file explorer</span>
                                </li>
                                <li className="flex items-center">
                                  <div className="mr-2 h-4 w-4 text-primary">✓</div>
                                  <span>Create or edit Solidity files</span>
                                </li>
                                {/*<li className="flex items-center">
                                  <div className="mr-2 h-4 w-4 text-primary">✓</div>
                                  <span>Syntax highlighting</span>
                                </li>*/}
                                <li className="flex items-center">
                                  <div className="mr-2 h-4 w-4 text-primary">✓</div>
                                  <span>Your files are persisted</span>
                                </li>
                                <li className="flex items-center">
                                  <div className="mr-2 h-4 w-4 text-primary">✓</div>
                                  <span>All basic editor operations supported</span>
                                </li>
                              </ul>
                            </CardContent>
                            <CardFooter>
                              <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => openFile('/contracts/SimpleStorage.sol')}
                              >
                                Open Example Contract
                              </Button>
                            </CardFooter>
                          </Card>

                          <Card>
                            <CardHeader>
                              <CardTitle>Compile</CardTitle>
                              <CardDescription>Compile your smart contracts</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <ul className="space-y-2 text-sm">
                                <li className="flex items-center">
                                  <div className="mr-2 h-4 w-4 text-primary">✓</div>
                                  <span>Select Solidity compiler version</span>
                                </li>
                                <li className="flex items-center text-amber-400">
                                  <div className="mr-2 h-4 w-4 text-primary">✓</div>
                                  <span>Use your favourite wallet</span>
                                </li>
                                <li className="flex items-center">
                                  <div className="mr-2 h-4 w-4 text-primary">✓</div>
                                  <span>View compilation output and errors</span>
                                </li>
                                <li className="flex items-center">
                                  <div className="mr-2 h-4 w-4 text-primary">✓</div>
                                  <span>
                                    View contract breakdowns (such as events, functions,
                                    constructor, errors, etc)
                                  </span>
                                </li>
                                <li className="flex items-center">
                                  <div className="mr-2 h-4 w-4 text-primary">✓</div>
                                  <span>Get contract Bytecode, etc</span>
                                </li>
                              </ul>
                            </CardContent>
                            {/*<CardFooter>
                              <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => setMainView('plugins')}
                              >
                                Open Compiler Plugin
                              </Button>
                            </CardFooter>*/}
                          </Card>

                          <Card>
                            <CardHeader>
                              <CardTitle>Deploy</CardTitle>
                              <CardDescription>Deploy and interact with contracts</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <ul className="space-y-2 text-sm">
                                <li className="flex items-center">
                                  <div className="mr-2 h-4 w-4 text-primary">✓</div>
                                  <span>Connect to Ethereum networks</span>
                                </li>
                                <li className="flex items-center">
                                  <div className="mr-2 h-4 w-4 text-primary">✓</div>
                                  <span>Deploy contracts to testnet or mainnet</span>
                                </li>
                                <li className="flex items-center">
                                  <div className="mr-2 h-4 w-4 text-primary">✓</div>
                                  <span>Interact with deployed contracts</span>
                                </li>
                                <li className="flex items-center text-amber-400">
                                  <div className="mr-2 h-4 w-4 text-primary">✓</div>
                                  <span>
                                    Auto-verify contracts or Manually Verify contract with retries
                                  </span>
                                </li>
                                <li className="flex items-center text-amber-400">
                                  <div className="mr-2 h-4 w-4 text-primary">✓</div>
                                  <span>
                                    Interact with multiple instances of deployed contracts.
                                  </span>
                                </li>
                              </ul>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                                Tests
                                <span className="text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded-full">
                                  Available
                                </span>
                              </CardTitle>
                              <CardDescription>Testing and verification tools</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <ul className="space-y-2 text-sm">
                                <li className="flex items-center">
                                  <div className="mr-2 h-4 w-4 text-primary">✓</div>
                                  <span>Unit testing framework integration</span>
                                </li>
                                <li className="flex items-center">
                                  <div className="mr-2 h-4 w-4 text-primary">✓</div>
                                  <span>Gas usage analysis</span>
                                </li>
                                <li className="flex items-center">
                                  <div className="mr-2 h-4 w-4 text-primary">✓</div>
                                  <span>Coverage reports</span>
                                </li>
                                <li className="flex items-center">
                                  <div className="mr-2 h-4 w-4 text-primary">✓</div>
                                  <span>Test automation tools</span>
                                </li>
                              </ul>
                            </CardContent>
                            <CardFooter>
                              <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => {
                                  // Ensure the testing plugin is enabled
                                  const pluginStore = usePluginStore.getState();
                                  const testingPlugin = pluginStore.plugins.find(p => p.id === 'testing-framework');
                                  if (testingPlugin) {
                                    // Enable and activate the plugin if needed
                                    if (!testingPlugin.enabled) {
                                      pluginStore.enablePlugin('testing-framework');
                                    }
                                    pluginStore.activatePlugin('testing-framework');

                                    // Open the file explorer sidebar
                                    document.querySelector('[data-sidebar="trigger"]')?.dispatchEvent(
                                      new MouseEvent('click', { bubbles: true })
                                    );

                                    // Find and click the testing framework sidebar item
                                    setTimeout(() => {
                                      const testingButton = Array.from(
                                        document.querySelectorAll('[data-sidebar="menu-button"]')
                                      ).find(el => el.textContent?.includes('Testing Framework'));

                                      if (testingButton) {
                                        testingButton.dispatchEvent(
                                          new MouseEvent('click', { bubbles: true })
                                        );
                                      }
                                    }, 100);
                                  }
                                }}
                              >
                                Open Testing Framework
                              </Button>
                            </CardFooter>
                          </Card>

                          <Card className="opacity-50 cursor-not-allowed">
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                                Git Integration
                                <span className="text-xs bg-yellow-500/10 text-blue-500 px-2 py-1 rounded-full">
                                  Planned Feature
                                </span>
                              </CardTitle>
                              <CardDescription>Version control and collaboration</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <ul className="space-y-2 text-sm">
                                <li className="flex items-center">
                                  <div className="mr-2 h-4 w-4 text-muted-foreground">✓</div>
                                  <span>Git repository management</span>
                                </li>
                                <li className="flex items-center">
                                  <div className="mr-2 h-4 w-4 text-muted-foreground">✓</div>
                                  <span>Branch and commit handling</span>
                                </li>
                                <li className="flex items-center">
                                  <div className="mr-2 h-4 w-4 text-muted-foreground">✓</div>
                                  <span>Pull request integration</span>
                                </li>
                                <li className="flex items-center">
                                  <div className="mr-2 h-4 w-4 text-muted-foreground">✓</div>
                                  <span>Collaborative coding features</span>
                                </li>
                              </ul>
                            </CardContent>
                          </Card>

                          <Card className="opacity-50 cursor-not-allowed">
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                                Debugger
                                <span className="text-xs bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded-full">
                                  Coming Soon
                                </span>
                              </CardTitle>
                              <CardDescription>Smart contract debugging tools</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <ul className="space-y-2 text-sm">
                                <li className="flex items-center">
                                  <div className="mr-2 h-4 w-4 text-muted-foreground">✓</div>
                                  <span>Step-by-step execution</span>
                                </li>
                                <li className="flex items-center">
                                  <div className="mr-2 h-4 w-4 text-muted-foreground">✓</div>
                                  <span>Variable inspection</span>
                                </li>
                                <li className="flex items-center">
                                  <div className="mr-2 h-4 w-4 text-muted-foreground">✓</div>
                                  <span>Stack trace analysis</span>
                                </li>
                                <li className="flex items-center">
                                  <div className="mr-2 h-4 w-4 text-muted-foreground">✓</div>
                                  <span>Breakpoint management</span>
                                </li>
                              </ul>
                            </CardContent>
                          </Card>
                        </div>

                        <div className="hidden bg-card border rounded-lg p-6">
                          <h2 className="text-xl font-semibold mb-4">Technology Stack</h2>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="flex items-center">
                              <div className="mr-2 h-5 w-5 text-primary">✓</div>
                              <span>Modern React + TypeScript</span>
                            </div>
                            <div className="flex items-center">
                              <div className="mr-2 h-5 w-5 text-primary">✓</div>
                              <span>Zustand State Management</span>
                            </div>
                            <div className="flex items-center">
                              <div className="mr-2 h-5 w-5 text-primary">✓</div>
                              <span>Tailwind CSS Styling</span>
                            </div>
                            <div className="flex items-center">
                              <div className="mr-2 h-5 w-5 text-primary">✓</div>
                              <span>Monaco Editor Integration</span>
                            </div>
                            <div className="flex items-center">
                              <div className="mr-2 h-5 w-5 text-primary">✓</div>
                              <span>Solidity Compilation</span>
                            </div>
                            <div className="flex items-center">
                              <div className="mr-2 h-5 w-5 text-primary">✓</div>
                              <span>Web3 Deployment</span>
                            </div>
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
