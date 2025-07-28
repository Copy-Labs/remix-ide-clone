import React, { useState, useEffect } from 'react';
import { usePluginStore } from '@/stores/pluginStore';
import { DebuggerPluginImplementation } from '@/plugins/debuggerPlugin';

interface DebuggerPluginUIProps {
  pluginId: string;
}

const DebuggerPluginUI: React.FC<DebuggerPluginUIProps> = ({ pluginId }) => {
  const { getPlugin, updatePluginConfig } = usePluginStore();

  const [implementation, setImplementation] = useState<DebuggerPluginImplementation | null>(null);
  const [debugState, setDebugState] = useState<any>(null);
  const [transactionHash, setTransactionHash] = useState('');
  const [breakpoints, setBreakpoints] = useState<number[]>([]);
  const [newBreakpoint, setNewBreakpoint] = useState<number>(0);
  const [expression, setExpression] = useState('');
  const [evaluationResult, setEvaluationResult] = useState<any>(null);
  const [isDebugging, setIsDebugging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  // Config options
  const [showLocalVariables, setShowLocalVariables] = useState(true);
  const [showStateVariables, setShowStateVariables] = useState(true);
  const [showCallStack, setShowCallStack] = useState(true);
  const [showMemory, setShowMemory] = useState(true);
  const [showStorage, setShowStorage] = useState(true);
  const [autoBreakOnError, setAutoBreakOnError] = useState(true);

  // Initialize the implementation when the component mounts
  useEffect(() => {
    const plugin = getPlugin(pluginId);
    if (plugin) {
      const impl = new DebuggerPluginImplementation(plugin.config);
      setImplementation(impl);

      // Load config values
      setShowLocalVariables(plugin.config.showLocalVariables);
      setShowStateVariables(plugin.config.showStateVariables);
      setShowCallStack(plugin.config.showCallStack);
      setShowMemory(plugin.config.showMemory);
      setShowStorage(plugin.config.showStorage);
      setAutoBreakOnError(plugin.config.autoBreakOnError);

      // Load breakpoints
      loadBreakpoints(impl);
    }
  }, [pluginId, getPlugin]);

  // Load breakpoints
  const loadBreakpoints = async (impl: DebuggerPluginImplementation | null = implementation) => {
    if (!impl) return;

    try {
      const breakpoints = await impl.getBreakpoints();
      setBreakpoints(breakpoints);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load breakpoints');
    }
  };

  // Update debug state
  const updateDebugState = async () => {
    if (!implementation || !isDebugging) return;

    try {
      const state = await implementation.getDebugState();
      setDebugState(state);
      setIsDebugging(state.isDebugging);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update debug state');
    }
  };

  // Start debugging
  const handleStartDebugging = async () => {
    if (!implementation || !transactionHash) return;

    setIsLoading(true);
    setError(null);

    try {
      await implementation.startDebugging(transactionHash);
      setIsDebugging(true);
      await updateDebugState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start debugging');
    } finally {
      setIsLoading(false);
    }
  };

  // Stop debugging
  const handleStopDebugging = async () => {
    if (!implementation || !isDebugging) return;

    setIsLoading(true);
    setError(null);

    try {
      await implementation.stopDebugging();
      setIsDebugging(false);
      setDebugState(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop debugging');
    } finally {
      setIsLoading(false);
    }
  };

  // Step into
  const handleStepInto = async () => {
    if (!implementation || !isDebugging) return;

    setIsLoading(true);
    setError(null);

    try {
      await implementation.stepInto();
      await updateDebugState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to step into');
    } finally {
      setIsLoading(false);
    }
  };

  // Step over
  const handleStepOver = async () => {
    if (!implementation || !isDebugging) return;

    setIsLoading(true);
    setError(null);

    try {
      await implementation.stepOver();
      await updateDebugState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to step over');
    } finally {
      setIsLoading(false);
    }
  };

  // Step out
  const handleStepOut = async () => {
    if (!implementation || !isDebugging) return;

    setIsLoading(true);
    setError(null);

    try {
      await implementation.stepOut();
      await updateDebugState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to step out');
    } finally {
      setIsLoading(false);
    }
  };

  // Continue to next breakpoint
  const handleContinue = async () => {
    if (!implementation || !isDebugging) return;

    setIsLoading(true);
    setError(null);

    try {
      await implementation.continue();
      await updateDebugState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to continue');
    } finally {
      setIsLoading(false);
    }
  };

  // Add breakpoint
  const handleAddBreakpoint = async () => {
    if (!implementation || newBreakpoint <= 0) return;

    setIsLoading(true);
    setError(null);

    try {
      await implementation.addBreakpoint(newBreakpoint);
      await loadBreakpoints();
      setNewBreakpoint(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add breakpoint');
    } finally {
      setIsLoading(false);
    }
  };

  // Remove breakpoint
  const handleRemoveBreakpoint = async (line: number) => {
    if (!implementation) return;

    setIsLoading(true);
    setError(null);

    try {
      await implementation.removeBreakpoint(line);
      await loadBreakpoints();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove breakpoint');
    } finally {
      setIsLoading(false);
    }
  };

  // Evaluate expression
  const handleEvaluateExpression = async () => {
    if (!implementation || !isDebugging || !expression) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await implementation.evaluateExpression(expression);
      setEvaluationResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to evaluate expression');
    } finally {
      setIsLoading(false);
    }
  };

  // Save configuration
  const handleSaveConfig = () => {
    if (!implementation) return;

    const config = {
      showLocalVariables,
      showStateVariables,
      showCallStack,
      showMemory,
      showStorage,
      autoBreakOnError,
    };

    updatePluginConfig(pluginId, config);
    setShowConfig(false);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Solidity Debugger</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}

      {/* Debug Controls */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Debug Transaction</h3>
        <div className="flex space-x-2 mb-2">
          <input
            type="text"
            value={transactionHash}
            onChange={(e) => setTransactionHash(e.target.value)}
            placeholder="Transaction hash"
            className="flex-1 p-2 border rounded"
            disabled={isDebugging}
          />
          {!isDebugging ? (
            <button
              onClick={handleStartDebugging}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              disabled={isLoading || !transactionHash}
            >
              Start Debugging
            </button>
          ) : (
            <button
              onClick={handleStopDebugging}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              disabled={isLoading}
            >
              Stop Debugging
            </button>
          )}
        </div>
      </div>

      {/* Stepping Controls */}
      {isDebugging && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Stepping Controls</h3>
          <div className="flex space-x-2">
            <button
              onClick={handleStepInto}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={isLoading}
            >
              Step Into
            </button>
            <button
              onClick={handleStepOver}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={isLoading}
            >
              Step Over
            </button>
            <button
              onClick={handleStepOut}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={isLoading}
            >
              Step Out
            </button>
            <button
              onClick={handleContinue}
              className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
              disabled={isLoading}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Breakpoints */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Breakpoints</h3>
        <div className="flex space-x-2 mb-2">
          <input
            type="number"
            value={newBreakpoint || ''}
            onChange={(e) => setNewBreakpoint(parseInt(e.target.value) || 0)}
            placeholder="Line number"
            className="flex-1 p-2 border rounded"
            min="1"
          />
          <button
            onClick={handleAddBreakpoint}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            disabled={isLoading || newBreakpoint <= 0}
          >
            Add Breakpoint
          </button>
        </div>

        {breakpoints.length > 0 ? (
          <div className="mt-2">
            <h4 className="font-medium mb-1">Current Breakpoints:</h4>
            <ul className="list-disc pl-5">
              {breakpoints.map((line) => (
                <li key={line} className="mb-1 flex items-center justify-between">
                  <span>Line {line}</span>
                  <button
                    onClick={() => handleRemoveBreakpoint(line)}
                    className="text-red-500 hover:text-red-700"
                    disabled={isLoading}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-gray-500">No breakpoints set</p>
        )}
      </div>

      {/* Debug State */}
      {isDebugging && debugState && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Debug State</h3>
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded">
            <p>
              <span className="font-medium">Current Line:</span> {debugState.currentLine}
            </p>
            <p>
              <span className="font-medium">Contract Address:</span>{' '}
              {debugState.contractAddress || 'N/A'}
            </p>

            {/* Local Variables */}
            {showLocalVariables && debugState.localVariables && (
              <div className="mt-3">
                <h4 className="font-medium mb-1">Local Variables:</h4>
                {Object.keys(debugState.localVariables).length > 0 ? (
                  <ul className="list-disc pl-5">
                    {Object.entries(debugState.localVariables).map(([name, value]) => (
                      <li key={name}>
                        {name}: {String(value)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">No local variables</p>
                )}
              </div>
            )}

            {/* State Variables */}
            {showStateVariables && debugState.stateVariables && (
              <div className="mt-3">
                <h4 className="font-medium mb-1">State Variables:</h4>
                {Object.keys(debugState.stateVariables).length > 0 ? (
                  <ul className="list-disc pl-5">
                    {Object.entries(debugState.stateVariables).map(([name, value]) => (
                      <li key={name}>
                        {name}: {String(value)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">No state variables</p>
                )}
              </div>
            )}

            {/* Call Stack */}
            {showCallStack && debugState.callStack && (
              <div className="mt-3">
                <h4 className="font-medium mb-1">Call Stack:</h4>
                {debugState.callStack.length > 0 ? (
                  <ul className="list-disc pl-5">
                    {debugState.callStack.map((call: any, index: number) => (
                      <li key={index}>
                        {call.function} {call.from ? `from: ${call.from}` : ''}{' '}
                        {call.to ? `to: ${call.to}` : ''}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">Call stack is empty</p>
                )}
              </div>
            )}

            {/* Memory */}
            {showMemory && debugState.memory && (
              <div className="mt-3">
                <h4 className="font-medium mb-1">Memory:</h4>
                {debugState.memory.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border">
                      <thead>
                        <tr>
                          <th className="border px-2 py-1">Offset</th>
                          <th className="border px-2 py-1">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {debugState.memory.map((item: any, index: number) => (
                          <tr key={index}>
                            <td className="border px-2 py-1">{item.offset}</td>
                            <td className="border px-2 py-1 font-mono">{item.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500">Memory is empty</p>
                )}
              </div>
            )}

            {/* Storage */}
            {showStorage && debugState.storage && (
              <div className="mt-3">
                <h4 className="font-medium mb-1">Storage:</h4>
                {Object.keys(debugState.storage).length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border">
                      <thead>
                        <tr>
                          <th className="border px-2 py-1">Slot</th>
                          <th className="border px-2 py-1">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(debugState.storage).map(([slot, value], index) => (
                          <tr key={index}>
                            <td className="border px-2 py-1 font-mono">{slot}</td>
                            <td className="border px-2 py-1 font-mono">{String(value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500">Storage is empty</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Expression Evaluation */}
      {isDebugging && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Evaluate Expression</h3>
          <div className="flex space-x-2 mb-2">
            <input
              type="text"
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              placeholder="Enter expression (e.g., 'balance')"
              className="flex-1 p-2 border rounded"
            />
            <button
              onClick={handleEvaluateExpression}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={isLoading || !expression}
            >
              Evaluate
            </button>
          </div>

          {evaluationResult !== null && (
            <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded">
              <p>
                <span className="font-medium">Result:</span> {String(evaluationResult)}
              </p>
            </div>
          )}
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
            <div className="mb-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showLocalVariables}
                  onChange={(e) => setShowLocalVariables(e.target.checked)}
                  className="mr-2"
                />
                Show Local Variables
              </label>
            </div>

            <div className="mb-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showStateVariables}
                  onChange={(e) => setShowStateVariables(e.target.checked)}
                  className="mr-2"
                />
                Show State Variables
              </label>
            </div>

            <div className="mb-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showCallStack}
                  onChange={(e) => setShowCallStack(e.target.checked)}
                  className="mr-2"
                />
                Show Call Stack
              </label>
            </div>

            <div className="mb-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showMemory}
                  onChange={(e) => setShowMemory(e.target.checked)}
                  className="mr-2"
                />
                Show Memory
              </label>
            </div>

            <div className="mb-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showStorage}
                  onChange={(e) => setShowStorage(e.target.checked)}
                  className="mr-2"
                />
                Show Storage
              </label>
            </div>

            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={autoBreakOnError}
                  onChange={(e) => setAutoBreakOnError(e.target.checked)}
                  className="mr-2"
                />
                Auto Break on Error
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

export default DebuggerPluginUI;
