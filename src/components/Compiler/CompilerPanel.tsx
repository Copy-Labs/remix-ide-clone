import React, { useEffect } from 'react';
import { useCompilerStore } from '@/stores/compilerStore.ts';
import { useFileStore } from '@/stores/fileStore.ts';
import { LucideLoader2 } from 'lucide-react';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { selectBaseClass } from '@/utils/constant.ts';
import { Separator } from '@/components/ui/separator.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { cn } from '@/lib/utils.ts';

const CompilerPanel: React.FC = () => {
  const {
    isCompiling,
    compilationResult,
    selectedContract,
    compilerVersion,
    availableVersions,
    optimizationEnabled,
    optimizationRuns,
    autoCompile,
    compile,
    setCompilerVersion,
    loadAvailableVersions,
    setOptimizationEnabled,
    setOptimizationRuns,
    setAutoCompile,
    selectContract,
    getSelectedContract,
    getCompilationSummary,
    clearCompilationResults,
    isContractSizeValid,
  } = useCompilerStore();

  const { files, getFileContent, activeFile } = useFileStore();

  // Load available versions when component mounts
  useEffect(() => {
    // Only load if not already loaded
    if (availableVersions.length === 0) {
      loadAvailableVersions();
    }
  }, [availableVersions.length, loadAvailableVersions]);

  const summary = getCompilationSummary();
  const selectedContractData = getSelectedContract();

  const handleCompile = async () => {
    // Check if there's an active file
    if (!activeFile) {
      alert('No file is currently active. Please open a Solidity file to compile.');
      return;
    }

    // Check if the active file is a Solidity file
    if (!activeFile.endsWith('.sol')) {
      alert('The active file is not a Solidity file. Please open a .sol file to compile.');
      return;
    }

    // Get the content of the active file
    const content = await getFileContent(activeFile);

    // Allow compilation of empty files (new files should be compilable)
    const solidityFiles: Record<string, string> = {
      [activeFile]: content || '',
    };

    console.log(
      'Compiling active file:',
      activeFile,
      'with content length:',
      (content || '').length,
    );
    await compile(solidityFiles);
  };

  const formatBytecode = (bytecode: string) => {
    if (!bytecode) return 'No bytecode';
    return `${bytecode.slice(0, 20)}...${bytecode.slice(-20)} (${bytecode.length / 2} bytes)`;
  };

  return (
    <div className="h-full max-w-full flex flex-col">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border flex-shrink-0">
        <h2 className="text-sm font-semibold text-foreground">Solidity Compiler</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Compiler Settings */}
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-foreground uppercase tracking-wide">
            Configuration
          </h3>

          {/* Version Selection */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Compiler Version
            </label>
            <select
              value={compilerVersion}
              onChange={(e) => setCompilerVersion(e.target.value)}
              className={selectBaseClass}
              disabled={availableVersions.length === 0 || isCompiling}
            >
              {availableVersions.length === 0 ? (
                <option value="">Loading versions...</option>
              ) : (
                availableVersions.map((version) => (
                  <option key={version} value={version}>
                    {version}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Auto Compile */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="autoCompile"
              checked={autoCompile}
              onChange={(e) => setAutoCompile(e.target.checked)}
              className="h-3 w-3 text-muted-foreground rounded-sm"
            />
            <label htmlFor="autoCompile" className="ml-2 text-xs text-muted-foreground">
              Auto compile
            </label>
          </div>

          {/* Optimization */}
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="optimization"
                checked={optimizationEnabled}
                onChange={(e) => setOptimizationEnabled(e.target.checked)}
                className="h-3 w-3 text-muted-foreground rounded-sm"
              />
              <label htmlFor="optimization" className="ml-2 text-xs text-muted-foreground">
                Enable optimization
              </label>
            </div>

            {optimizationEnabled && (
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Optimization Runs
                </label>
                <Input
                  type="number"
                  value={optimizationRuns}
                  onChange={(e) => setOptimizationRuns(parseInt(e.target.value) || 200)}
                  min="1"
                  max="10000"
                  // className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Compile Button */}
        <div>
          <Button
            onClick={handleCompile}
            disabled={isCompiling || availableVersions.length === 0}
            className={`w-full px-3 py-2 text-xs font-medium rounded-md transition-colors ${
              isCompiling || availableVersions.length === 0
                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-1 focus:ring-blue-500'
            }`}
          >
            {isCompiling ? (
              <div className="flex items-center justify-center gap-1">
                {/*<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>*/}
                <LucideLoader2 size={16} className="animate-spin" />
                Compiling...
              </div>
            ) : availableVersions.length === 0 ? (
              'Loading compiler...'
            ) : compilationResult ? (
              'Re-compile'
            ) : (
              'Compile'
            )}
          </Button>
        </div>

        {/* Compilation Results */}
        {compilationResult && (
          <div className="space-y-3">
            <Separator className={'my-6'} />
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wide">
                Results
              </h3>
              <button
                onClick={clearCompilationResults}
                className="text-xs text-muted-foreground px-1"
              >
                Clear
              </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <div className="bg-border p-1.5 rounded-sm">
                <div className="text-muted-foreground text-xs">Contracts</div>
                <div className="font-medium text-foreground text-sm">
                  {summary.successfulContracts}/{summary.totalContracts}
                </div>
              </div>
              <div className="bg-border p-1.5 rounded-sm">
                <div className="text-gray-600 dark:text-gray-400 text-xs">Errors</div>
                <div
                  className={`font-medium text-sm ${summary.totalErrors > 0 ? 'text-red-600' : 'text-green-600'}`}
                >
                  {summary.totalErrors}
                </div>
              </div>
            </div>

            {/* Errors */}
            {compilationResult.errors.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-red-600 mb-1">
                  Errors ({compilationResult.errors.length})
                </h4>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {compilationResult.errors.map((error, index) => (
                    <div
                      key={index}
                      className="text-xs bg-red-50 dark:bg-red-900/20 p-1.5 rounded border-l-2 border-red-500"
                    >
                      <div className="font-medium text-red-800 dark:text-red-400 text-xs">
                        {error.type}
                      </div>
                      <div className="text-red-700 dark:text-red-300 mt-0.5 text-xs leading-tight">
                        {error.message}
                      </div>
                      {error.sourceLocation.file && (
                        <div className="text-red-600 dark:text-red-400 mt-0.5 text-xs">
                          {error.sourceLocation.file}:{error.sourceLocation.start}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {compilationResult.warnings.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-yellow-600 mb-1">
                  Warnings ({compilationResult.warnings.length})
                </h4>
                <div className="space-y-1 max-h-20 overflow-y-auto">
                  {compilationResult.warnings.map((warning, index) => (
                    <div
                      key={index}
                      className="text-xs bg-yellow-50 dark:bg-yellow-900/20 p-1.5 rounded border-l-2 border-yellow-500"
                    >
                      <div className="text-yellow-700 dark:text-yellow-300 text-xs leading-tight">
                        {warning.message}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contracts */}
            {Object.keys(compilationResult.contracts).length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-900 dark:text-white mb-1">
                  Contracts ({Object.keys(compilationResult.contracts).length})
                </h4>
                <div className="w-full space-y-1">
                  {Object.keys(compilationResult.contracts).map((contractName) => (
                    <div
                      key={contractName}
                      className={`w-full p-1.5 rounded-sm border cursor-pointer transition-colors ${
                        selectedContract === contractName
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                      onClick={() => selectContract(contractName)}
                    >
                      <div className="text-xs font-medium text-gray-900 dark:text-white">
                        {contractName}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 w-full break-words leading-tight">
                        {formatBytecode(compilationResult.contracts[contractName].bytecode)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Selected Contract Details */}
            {selectedContractData && (
              <div className="bg-secondary rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">
                    Contract Name
                  </h4>
                  <div className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-sm">
                    {selectedContract}
                  </div>
                </div>

                {/* Basic Details - Always Visible */}
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Functions:</span>
                    <span className="text-gray-900 dark:text-white">
                      {
                        selectedContractData.abi.filter((item: any) => item.type === 'function')
                          .length
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Events:</span>
                    <span className="text-gray-900 dark:text-white">
                      {selectedContractData.abi.filter((item: any) => item.type === 'event').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Size:</span>
                    <span className="text-gray-900 dark:text-white">
                      {(selectedContractData.bytecode.length / 2).toLocaleString()} bytes
                      {!isContractSizeValid(selectedContractData.bytecode) && (
                        <span className="ml-1 text-red-500">(!)</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* More Info Accordion */}
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="more-info" className="border-border">
                    <AccordionTrigger className="text-xs font-medium text-foreground/85 py-2">
                      More Info
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-0">
                      <div className="space-y-3">
                        {/* Contract Overview */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-border p-2 rounded-sm border">
                            <div className="text-xs text-muted-foreground mb-0.5">
                              Contract Size
                            </div>
                            <div className="flex items-center gap-1 text-base">
                              <span
                                className={cn(
                                  'text-xs font-medium',
                                  !isContractSizeValid(selectedContractData.bytecode)
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-green-600 dark:text-green-400',
                                )}
                              >
                                {(selectedContractData.bytecode.length / 2).toLocaleString()} bytes
                              </span>
                              {!isContractSizeValid(selectedContractData.bytecode) && (
                                <span
                                  className="text-xs text-red-500 font-medium"
                                  title="Exceeds 24KB limit"
                                >
                                  ⚠️
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {((selectedContractData.bytecode.length / 2 / 24576) * 100).toFixed(
                                2,
                              )}
                              % of 24KB limit
                            </div>
                          </div>

                          <div className="bg-border p-2 rounded-sm border">
                            <div className="text-xs text-muted-foreground mb-0.5">
                              Total Elements
                            </div>
                            <div className="text-xs font-medium text-gray-900 dark:text-white">
                              {selectedContractData.abi.length} items
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">in ABI</div>
                          </div>
                        </div>

                        {/* ABI Breakdown */}
                        <div className="space-y-2">
                          <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            ABI Elements
                          </h5>

                          <div className="grid grid-cols-2 gap-1.5 text-xs">
                            {/* Functions */}
                            <div className="flex justify-between items-center py-1 px-2 bg-border rounded-sm border">
                              <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                Functions
                              </span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {
                                  selectedContractData.abi.filter(
                                    (item: any) => item.type === 'function',
                                  ).length
                                }
                              </span>
                            </div>

                            {/* Events */}
                            <div className="flex justify-between items-center py-1 px-2 bg-border rounded-sm border">
                              <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                Events
                              </span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {
                                  selectedContractData.abi.filter(
                                    (item: any) => item.type === 'event',
                                  ).length
                                }
                              </span>
                            </div>

                            {/* Constructor */}
                            <div className="flex justify-between items-center py-1 px-2 bg-border rounded-sm border">
                              <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                                Constructor
                              </span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {
                                  selectedContractData.abi.filter(
                                    (item: any) => item.type === 'constructor',
                                  ).length
                                }
                              </span>
                            </div>

                            {/* Errors */}
                            <div className="flex justify-between items-center py-1 px-2 bg-border rounded-sm border">
                              <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                Errors
                              </span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {
                                  selectedContractData.abi.filter(
                                    (item: any) => item.type === 'error',
                                  ).length
                                }
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Function Details */}
                        {selectedContractData.abi.filter((item: any) => item.type === 'function')
                          .length > 0 && (
                          <div className="space-y-1.5">
                            <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Function Types
                            </h5>
                            <div className="space-y-1">
                              {(() => {
                                const functions = selectedContractData.abi.filter(
                                  (item: any) => item.type === 'function',
                                );
                                const publicFunctions = functions.filter(
                                  (f: any) =>
                                    !f.stateMutability ||
                                    f.stateMutability === 'nonpayable' ||
                                    f.stateMutability === 'payable',
                                );
                                const viewFunctions = functions.filter(
                                  (f: any) => f.stateMutability === 'view',
                                );
                                const pureFunctions = functions.filter(
                                  (f: any) => f.stateMutability === 'pure',
                                );
                                const payableFunctions = functions.filter(
                                  (f: any) => f.stateMutability === 'payable',
                                );

                                return (
                                  <div className="grid grid-cols-2 gap-1 text-xs">
                                    {viewFunctions.length > 0 && (
                                      <div className="flex justify-between py-1.5 px-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-sm text-blue-700 dark:text-blue-300 border">
                                        <span>View</span>
                                        <span className="font-medium">{viewFunctions.length}</span>
                                      </div>
                                    )}
                                    {pureFunctions.length > 0 && (
                                      <div className="flex justify-between py-1.5 px-1.5 bg-green-50 dark:bg-green-900/20 rounded-sm text-green-700 dark:text-green-300 border">
                                        <span>Pure</span>
                                        <span className="font-medium">{pureFunctions.length}</span>
                                      </div>
                                    )}
                                    {payableFunctions.length > 0 && (
                                      <div className="flex justify-between py-1.5 px-1.5 bg-yellow-50 dark:bg-yellow-900/20 rounded-sm text-yellow-700 dark:text-yellow-300 border">
                                        <span>Payable</span>
                                        <span className="font-medium">
                                          {payableFunctions.length}
                                        </span>
                                      </div>
                                    )}
                                    {publicFunctions.length - payableFunctions.length > 0 && (
                                      <div className="flex justify-between py-1.5 px-1.5 bg-gray-50 dark:bg-gray-700 rounded-sm text-gray-700 dark:text-gray-300 border">
                                        <span>State-changing</span>
                                        <span className="font-medium">
                                          {publicFunctions.length - payableFunctions.length}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        )}

                        {/* Constructor Info */}
                        {(() => {
                          const constructor = selectedContractData.abi.find(
                            (item: any) => item.type === 'constructor',
                          );
                          if (constructor && constructor.inputs && constructor.inputs.length > 0) {
                            return (
                              <div className="space-y-1.5">
                                <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                                  Constructor Parameters
                                </h5>
                                <div className="bg-white dark:bg-gray-700 rounded border p-2 space-y-1">
                                  {constructor.inputs.map((input: any, index: number) => (
                                    <div
                                      key={index}
                                      className="flex justify-between items-center text-xs"
                                    >
                                      <span className="text-gray-600 dark:text-gray-400">
                                        {input.name || `param${index}`}
                                      </span>
                                      <span className="font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-600 px-1.5 py-0.5 rounded text-xs">
                                        {input.type}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompilerPanel;
