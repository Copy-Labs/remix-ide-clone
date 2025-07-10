import React, { useEffect } from 'react';
import { useCompilerStore } from '@/stores/compilerStore.ts';
import { useFileStore } from '@/stores/fileStore.ts';

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
  } = useCompilerStore();

  const { files, getFileContent } = useFileStore();

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
    // Get all Solidity files
    const solidityFiles: Record<string, string> = {};

    Array.from(files.values())
      .filter(file => file.type === 'file' && file.name.endsWith('.sol'))
      .forEach(file => {
        const content = getFileContent(file.path);
        if (content) {
          solidityFiles[file.path] = content;
        }
      });

    if (Object.keys(solidityFiles).length === 0) {
      alert('No Solidity files found to compile');
      return;
    }

    await compile(solidityFiles);
  };

  const formatBytecode = (bytecode: string) => {
    if (!bytecode) return 'No bytecode';
    return `${bytecode.slice(0, 20)}...${bytecode.slice(-20)} (${bytecode.length / 2} bytes)`;
  };

  return (
    <div className="h-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Solidity Compiler
        </h2>
      </div>

      <div className="p-4 space-y-6">
        {/* Compiler Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            Compiler Configuration
          </h3>

          {/* Version Selection */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Compiler Version
            </label>
            <select
              value={compilerVersion}
              onChange={(e) => setCompilerVersion(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={availableVersions.length === 0 || isCompiling}
            >
              {availableVersions.length === 0 ? (
                <option value="">Loading versions...</option>
              ) : (
                availableVersions.map(version => (
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
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="autoCompile" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Auto compile
            </label>
          </div>

          {/* Optimization */}
          <div className="space-y-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="optimization"
                checked={optimizationEnabled}
                onChange={(e) => setOptimizationEnabled(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="optimization" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Enable optimization
              </label>
            </div>

            {optimizationEnabled && (
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Optimization Runs
                </label>
                <input
                  type="number"
                  value={optimizationRuns}
                  onChange={(e) => setOptimizationRuns(parseInt(e.target.value) || 200)}
                  min="1"
                  max="10000"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Compile Button */}
        <div>
          <button
            onClick={handleCompile}
            disabled={isCompiling || availableVersions.length === 0}
            className={`w-full px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              isCompiling || availableVersions.length === 0
                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            }`}
          >
            {isCompiling ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Compiling...
              </div>
            ) : availableVersions.length === 0 ? (
              'Loading compiler...'
            ) : (
              'Compile'
            )}
          </button>
        </div>

        {/* Compilation Results */}
        {compilationResult && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Compilation Results
              </h3>
              <button
                onClick={clearCompilationResults}
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Clear
              </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                <div className="text-gray-600 dark:text-gray-400">Contracts</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {summary.successfulContracts}/{summary.totalContracts}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                <div className="text-gray-600 dark:text-gray-400">Errors</div>
                <div className={`font-medium ${summary.totalErrors > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {summary.totalErrors}
                </div>
              </div>
            </div>

            {/* Errors */}
            {compilationResult.errors.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-red-600 mb-2">Errors</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {compilationResult.errors.map((error, index) => (
                    <div key={index}
                         className="text-xs bg-red-50 dark:bg-red-900/20 p-2 rounded border-l-2 border-red-500">
                      <div className="font-medium text-red-800 dark:text-red-400">
                        {error.type}
                      </div>
                      <div className="text-red-700 dark:text-red-300 mt-1">
                        {error.message}
                      </div>
                      {error.sourceLocation.file && (
                        <div className="text-red-600 dark:text-red-400 mt-1">
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
                <h4 className="text-xs font-medium text-yellow-600 mb-2">Warnings</h4>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {compilationResult.warnings.map((warning, index) => (
                    <div key={index}
                         className="text-xs bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border-l-2 border-yellow-500">
                      <div className="text-yellow-700 dark:text-yellow-300">
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
                <h4 className="text-xs font-medium text-gray-900 dark:text-white mb-2">
                  Compiled Contracts
                </h4>
                <div className="space-y-2">
                  {Object.keys(compilationResult.contracts).map(contractName => (
                    <div
                      key={contractName}
                      className={`p-2 rounded border cursor-pointer transition-colors ${
                        selectedContract === contractName
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                      onClick={() => selectContract(contractName)}
                    >
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {contractName}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatBytecode(compilationResult.contracts[contractName].bytecode)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Selected Contract Details */}
            {selectedContractData && (
              <div>
                <h4 className="text-xs font-medium text-gray-900 dark:text-white mb-2">
                  Contract Details: {selectedContract}
                </h4>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">ABI Functions:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {selectedContractData.abi.filter((item: any) => item.type === 'function').length}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Events:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {selectedContractData.abi.filter((item: any) => item.type === 'event').length}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Bytecode Size:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {selectedContractData.bytecode.length / 2} bytes
                      {!isContractSizeValid(selectedContractData.bytecode) && (
                        <span className="ml-2 text-red-500">
                          (Exceeds size limit)
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompilerPanel;
