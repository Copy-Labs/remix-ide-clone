import React, { useState, useEffect } from 'react';
import { usePluginStore } from '@/stores/pluginStore';
import { useFileStore } from '@/stores/fileStore';
import { TestingPluginImplementation } from '@/plugins/testingPlugin';

interface TestingPluginUIProps {
  pluginId: string;
}

const TestingPluginUI: React.FC<TestingPluginUIProps> = ({ pluginId }) => {
  const { getPlugin, updatePluginConfig } = usePluginStore();
  const { files } = useFileStore();

  const [implementation, setImplementation] = useState<TestingPluginImplementation | null>(null);
  const [testResults, setTestResults] = useState<Map<string, any>>(new Map());
  const [coverageData, setCoverageData] = useState<Map<string, any>>(new Map());
  const [selectedContract, setSelectedContract] = useState('');
  const [testName, setTestName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  // Config options
  const [testFolder, setTestFolder] = useState('/tests');
  const [autoRunOnSave, setAutoRunOnSave] = useState(false);
  const [gasLimit, setGasLimit] = useState(6000000);
  const [showCoverage, setShowCoverage] = useState(true);
  const [testTimeout, setTestTimeout] = useState(5000);
  const [testFramework, setTestFramework] = useState('mocha');

  // Initialize the implementation when the component mounts
  useEffect(() => {
    const plugin = getPlugin(pluginId);
    if (plugin) {
      const impl = new TestingPluginImplementation(plugin.config);
      setImplementation(impl);

      // Load config values
      setTestFolder(plugin.config.testFolder || '/tests');
      setAutoRunOnSave(plugin.config.autoRunOnSave || false);
      setGasLimit(plugin.config.gasLimit || 6000000);
      setShowCoverage(plugin.config.showCoverage || true);
      setTestTimeout(plugin.config.testTimeout || 5000);
      setTestFramework(plugin.config.testFramework || 'mocha');

      // Load initial test results if available
      loadTestResults(impl);
    }
  }, [pluginId, getPlugin]);

  // Load test results
  const loadTestResults = async (impl: TestingPluginImplementation | null = implementation) => {
    if (!impl) return;

    try {
      const results = await impl.getTestResults();
      setTestResults(results);

      if (showCoverage) {
        const coverage = await impl.getCoverageData();
        setCoverageData(coverage);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load test results');
    }
  };

  // Get Solidity contracts from files
  const getSolidityContracts = () => {
    return Array.from(files.entries())
      .filter(([path, file]) => file.type === 'file' && path.endsWith('.sol'))
      .map(([path, file]) => {
        // Extract contract name from path
        const parts = path.split('/');
        const fileName = parts[parts.length - 1];
        const contractName = fileName.replace('.sol', '');
        return { path, contractName };
      });
  };

  // Run all tests
  const handleRunAllTests = async () => {
    if (!implementation) return;

    setIsLoading(true);
    setError(null);

    try {
      await implementation.runAllTests();
      await loadTestResults();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run tests');
    } finally {
      setIsLoading(false);
    }
  };

  // Run a specific test
  const handleRunTest = async (testPath: string) => {
    if (!implementation) return;

    setIsLoading(true);
    setError(null);

    try {
      await implementation.runTest(testPath);
      await loadTestResults();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to run test: ${testPath}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new test file
  const handleCreateTestFile = async () => {
    if (!implementation || !selectedContract || !testName) return;

    setIsLoading(true);
    setError(null);

    try {
      const testPath = await implementation.createTestFile(
        `${testName}.test.js`,
        selectedContract
      );

      setTestName('');
      setSelectedContract('');

      // Refresh test results
      await loadTestResults();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create test file');
    } finally {
      setIsLoading(false);
    }
  };

  // Save configuration
  const handleSaveConfig = () => {
    if (!implementation) return;

    const config = {
      testFolder,
      autoRunOnSave,
      gasLimit,
      showCoverage,
      testTimeout,
      testFramework,
    };

    updatePluginConfig(pluginId, config);

    // Update implementation config
    implementation.updateConfig(config);

    setShowConfig(false);
  };

  // Format duration in ms to readable format
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Testing Framework</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}

      {/* Test Controls */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">Test Controls</h3>
          <button
            onClick={handleRunAllTests}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            disabled={isLoading}
          >
            Run All Tests
          </button>
        </div>

        {/* Test Results Summary */}
        {testResults.size > 0 && (
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded mb-4">
            <h4 className="font-medium mb-2">Test Results Summary</h4>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 p-3 rounded shadow">
                <div className="text-lg font-bold">{Array.from(testResults.values()).reduce((sum, result) => sum + result.passed, 0)}</div>
                <div className="text-sm text-green-600">Tests Passed</div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-3 rounded shadow">
                <div className="text-lg font-bold">{Array.from(testResults.values()).reduce((sum, result) => sum + result.failed, 0)}</div>
                <div className="text-sm text-red-600">Tests Failed</div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-3 rounded shadow">
                <div className="text-lg font-bold">{testResults.size}</div>
                <div className="text-sm text-gray-600">Test Suites</div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-3 rounded shadow">
                <div className="text-lg font-bold">
                  {formatDuration(Array.from(testResults.values()).reduce((sum, result) => sum + result.duration, 0))}
                </div>
                <div className="text-sm text-gray-600">Total Duration</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Test */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Create Test</h3>
        <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded">
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Contract to Test</label>
            <select
              value={selectedContract}
              onChange={(e) => setSelectedContract(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">Select a contract</option>
              {getSolidityContracts().map(({ path, contractName }) => (
                <option key={path} value={contractName}>{contractName}</option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Test Name</label>
            <input
              type="text"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              placeholder="Enter test name"
              className="w-full p-2 border rounded"
            />
          </div>

          <button
            onClick={handleCreateTestFile}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            disabled={isLoading || !selectedContract || !testName}
          >
            Create Test File
          </button>
        </div>
      </div>

      {/* Test Results */}
      {testResults.size > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Test Results</h3>
          <div className="space-y-4">
            {Array.from(testResults.entries()).map(([testPath, result]) => (
              <div key={testPath} className="bg-white dark:bg-gray-800 border rounded shadow">
                <div className="flex justify-between items-center p-3 border-b">
                  <div>
                    <h4 className="font-medium">{result.name}</h4>
                    <div className="text-sm text-gray-500">{testPath}</div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className={`text-sm ${result.failed > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {result.passed}/{result.passed + result.failed} passed
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDuration(result.duration)}
                    </div>
                    <button
                      onClick={() => handleRunTest(testPath)}
                      className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                      disabled={isLoading}
                    >
                      Run
                    </button>
                  </div>
                </div>

                <div className="p-3">
                  <h5 className="font-medium mb-2">Tests:</h5>
                  <ul className="space-y-2">
                    {result.tests.map((test: any, index: number) => (
                      <li key={index} className={`p-2 rounded ${test.passed ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
                        <div className="flex justify-between">
                          <div className="font-medium">{test.name}</div>
                          <div className="text-sm text-gray-500">{formatDuration(test.duration)}</div>
                        </div>
                        {!test.passed && test.error && (
                          <div className="mt-1 text-sm text-red-600">{test.error}</div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Coverage Data */}
      {showCoverage && coverageData.size > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Coverage Report</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full border">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700">
                  <th className="border px-4 py-2 text-left">Contract</th>
                  <th className="border px-4 py-2 text-left">Lines</th>
                  <th className="border px-4 py-2 text-left">Functions</th>
                  <th className="border px-4 py-2 text-left">Branches</th>
                  <th className="border px-4 py-2 text-left">Statements</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(coverageData.entries()).map(([contractName, data]) => (
                  <tr key={contractName}>
                    <td className="border px-4 py-2 font-medium">{contractName}</td>
                    <td className="border px-4 py-2">
                      <div className="flex items-center">
                        <div className="w-24 bg-gray-200 rounded-full h-2.5 mr-2">
                          <div
                            className="bg-blue-600 h-2.5 rounded-full"
                            style={{ width: `${data.lines.percentage}%` }}
                          ></div>
                        </div>
                        <span>{data.lines.percentage}%</span>
                      </div>
                    </td>
                    <td className="border px-4 py-2">
                      <div className="flex items-center">
                        <div className="w-24 bg-gray-200 rounded-full h-2.5 mr-2">
                          <div
                            className="bg-green-600 h-2.5 rounded-full"
                            style={{ width: `${data.functions.percentage}%` }}
                          ></div>
                        </div>
                        <span>{data.functions.percentage}%</span>
                      </div>
                    </td>
                    <td className="border px-4 py-2">
                      <div className="flex items-center">
                        <div className="w-24 bg-gray-200 rounded-full h-2.5 mr-2">
                          <div
                            className="bg-yellow-600 h-2.5 rounded-full"
                            style={{ width: `${data.branches.percentage}%` }}
                          ></div>
                        </div>
                        <span>{data.branches.percentage}%</span>
                      </div>
                    </td>
                    <td className="border px-4 py-2">
                      <div className="flex items-center">
                        <div className="w-24 bg-gray-200 rounded-full h-2.5 mr-2">
                          <div
                            className="bg-purple-600 h-2.5 rounded-full"
                            style={{ width: `${data.statements.percentage}%` }}
                          ></div>
                        </div>
                        <span>{data.statements.percentage}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Configuration */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Configuration</h3>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="text-blue-500 hover:text-blue-700"
          >
            {showConfig ? 'Hide' : 'Show'}
          </button>
        </div>

        {showConfig && (
          <div className="mt-2 p-4 bg-gray-100 dark:bg-gray-700 rounded">
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Test Folder</label>
              <input
                type="text"
                value={testFolder}
                onChange={(e) => setTestFolder(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Gas Limit</label>
              <input
                type="number"
                value={gasLimit}
                onChange={(e) => setGasLimit(parseInt(e.target.value))}
                className="w-full p-2 border rounded"
                min="1000000"
              />
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Test Timeout (ms)</label>
              <input
                type="number"
                value={testTimeout}
                onChange={(e) => setTestTimeout(parseInt(e.target.value))}
                className="w-full p-2 border rounded"
                min="1000"
              />
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Test Framework</label>
              <select
                value={testFramework}
                onChange={(e) => setTestFramework(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="mocha">Mocha</option>
                <option value="truffle">Truffle</option>
                <option value="hardhat">Hardhat</option>
              </select>
            </div>

            <div className="mb-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={autoRunOnSave}
                  onChange={(e) => setAutoRunOnSave(e.target.checked)}
                  className="mr-2"
                />
                Auto-run tests on file save
              </label>
            </div>

            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showCoverage}
                  onChange={(e) => setShowCoverage(e.target.checked)}
                  className="mr-2"
                />
                Show coverage report
              </label>
            </div>

            <button
              onClick={handleSaveConfig}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Save Configuration
            </button>
          </div>
        )}
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded shadow-lg">
            <p>Processing...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestingPluginUI;
