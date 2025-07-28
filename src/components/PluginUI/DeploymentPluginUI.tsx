import React, { useState, useEffect } from 'react';
import { usePluginStore } from '@/stores/pluginStore';
import { useFileStore } from '@/stores/fileStore';
import { DeploymentPluginImplementation } from '@/plugins/deploymentPlugin';

interface DeploymentPluginUIProps {
  pluginId: string;
}

const DeploymentPluginUI: React.FC<DeploymentPluginUIProps> = ({ pluginId }) => {
  const { getPlugin, updatePluginConfig } = usePluginStore();
  const { files } = useFileStore();

  const [implementation, setImplementation] = useState<DeploymentPluginImplementation | null>(null);
  const [networks, setNetworks] = useState<any[]>([]);
  const [deploymentScripts, setDeploymentScripts] = useState<any[]>([]);
  const [deploymentResults, setDeploymentResults] = useState<any[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [selectedContract, setSelectedContract] = useState('');
  const [contractBytecode, setContractBytecode] = useState('');
  const [contractAbi, setContractAbi] = useState<any[]>([]);
  const [constructorArgs, setConstructorArgs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  // Network form
  const [newNetworkName, setNewNetworkName] = useState('');
  const [newNetworkRpcUrl, setNewNetworkRpcUrl] = useState('');
  const [newNetworkChainId, setNewNetworkChainId] = useState('');
  const [newNetworkSymbol, setNewNetworkSymbol] = useState('');
  const [newNetworkExplorer, setNewNetworkExplorer] = useState('');

  // Script form
  const [newScriptName, setNewScriptName] = useState('');
  const [newScriptDescription, setNewScriptDescription] = useState('');
  const [newScriptNetworks, setNewScriptNetworks] = useState<string[]>([]);
  const [newScriptAutoRun, setNewScriptAutoRun] = useState(false);

  // Config options
  const [defaultNetwork, setDefaultNetwork] = useState('');
  const [gasPrice, setGasPrice] = useState('auto');
  const [gasLimit, setGasLimit] = useState(3000000);
  const [confirmations, setConfirmations] = useState(2);
  const [autoVerify, setAutoVerify] = useState(true);

  // Initialize the implementation when the component mounts
  useEffect(() => {
    const plugin = getPlugin(pluginId);
    if (plugin) {
      const impl = new DeploymentPluginImplementation(plugin.config);
      setImplementation(impl);

      // Load networks
      const networks = impl.getNetworks();
      setNetworks(networks);

      // Load deployment scripts
      const scripts = impl.getDeploymentScripts();
      setDeploymentScripts(scripts);

      // Load deployment results
      const results = impl.getDeploymentResults();
      setDeploymentResults(results);

      // Load config values
      setDefaultNetwork(plugin.config.defaultNetwork || '');
      setGasPrice(plugin.config.gasPrice || 'auto');
      setGasLimit(plugin.config.gasLimit || 3000000);
      setConfirmations(plugin.config.confirmations || 2);
      setAutoVerify(plugin.config.autoVerify || true);

      // Set selected network to default
      if (
        plugin.config.defaultNetwork &&
        networks.some((n) => n.id === plugin.config.defaultNetwork)
      ) {
        setSelectedNetwork(plugin.config.defaultNetwork);
      } else if (networks.length > 0) {
        setSelectedNetwork(networks[0].id);
      }
    }
  }, [pluginId, getPlugin]);

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

  // Handle contract selection
  const handleContractSelection = (contractName: string) => {
    setSelectedContract(contractName);

    // In a real implementation, this would compile the contract and get the bytecode and ABI
    // For now, we'll use mock data
    setContractBytecode(
      '0x608060405234801561001057600080fd5b50610150806100206000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c80632e64cec11461003b5780636057361d14610059575b600080fd5b610043610075565b60405161005091906100d9565b60405180910390f35b610073600480360381019061006e919061009d565b61007e565b005b60008054905090565b8060008190555050565b60008135905061009781610103565b92915050565b6000602082840312156100b3576100b26100fe565b5b60006100c184828501610088565b91505092915050565b6100d3816100f4565b82525050565b60006020820190506100ee60008301846100ca565b92915050565b6000819050919050565b600080fd5b61010c816100f4565b811461011757600080fd5b5056fea2646970667358221220223b76b2a4b83584962b3155b370beb66a7a7d6869dd947e2a7c8a6b0ffa58d364736f6c63430008070033',
    );
    setContractAbi([
      {
        inputs: [],
        name: 'retrieve',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
      {
        inputs: [{ internalType: 'uint256', name: 'num', type: 'uint256' }],
        name: 'store',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
      },
    ]);

    // Check if the contract has constructor arguments
    setConstructorArgs([]);
  };

  // Deploy contract
  const handleDeployContract = async () => {
    if (!implementation || !selectedContract || !selectedNetwork) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await implementation.deployContract(
        selectedContract,
        contractBytecode,
        contractAbi,
        constructorArgs,
        selectedNetwork,
      );

      if (result.success) {
        // Refresh deployment results
        const results = implementation.getDeploymentResults();
        setDeploymentResults(results);
      } else {
        setError(result.error || 'Deployment failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deploy contract');
    } finally {
      setIsLoading(false);
    }
  };

  // Run deployment script
  const handleRunScript = async (scriptId: string) => {
    if (!implementation) return;

    setIsLoading(true);
    setError(null);

    try {
      const results = await implementation.runDeploymentScript(scriptId);

      // Refresh deployment results
      const allResults = implementation.getDeploymentResults();
      setDeploymentResults(allResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to run script: ${scriptId}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Add network
  const handleAddNetwork = async () => {
    if (!implementation || !newNetworkName || !newNetworkRpcUrl || !newNetworkChainId) return;

    setIsLoading(true);
    setError(null);

    try {
      const network = {
        id: newNetworkName.toLowerCase().replace(/\s+/g, '-'),
        name: newNetworkName,
        rpcUrl: newNetworkRpcUrl,
        chainId: parseInt(newNetworkChainId),
        symbol: newNetworkSymbol || 'ETH',
        explorer: newNetworkExplorer || '',
        enabled: true,
      };

      const success = implementation.addNetwork(network);

      if (success) {
        // Refresh networks
        const networks = implementation.getNetworks();
        setNetworks(networks);

        // Clear form
        setNewNetworkName('');
        setNewNetworkRpcUrl('');
        setNewNetworkChainId('');
        setNewNetworkSymbol('');
        setNewNetworkExplorer('');
      } else {
        setError('Failed to add network');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add network');
    } finally {
      setIsLoading(false);
    }
  };

  // Add deployment script
  const handleAddScript = async () => {
    if (!implementation || !newScriptName || !selectedContract || newScriptNetworks.length === 0)
      return;

    setIsLoading(true);
    setError(null);

    try {
      const script = {
        id: `script-${Date.now()}`,
        name: newScriptName,
        description: newScriptDescription || `Deployment script for ${selectedContract}`,
        contractName: selectedContract,
        constructorArgs: constructorArgs,
        networks: newScriptNetworks,
        autoRun: newScriptAutoRun,
      };

      const success = implementation.addDeploymentScript(script);

      if (success) {
        // Refresh scripts
        const scripts = implementation.getDeploymentScripts();
        setDeploymentScripts(scripts);

        // Clear form
        setNewScriptName('');
        setNewScriptDescription('');
        setNewScriptNetworks([]);
        setNewScriptAutoRun(false);
      } else {
        setError('Failed to add deployment script');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add deployment script');
    } finally {
      setIsLoading(false);
    }
  };

  // Set default network
  const handleSetDefaultNetwork = async (networkId: string) => {
    if (!implementation) return;

    setIsLoading(true);
    setError(null);

    try {
      const success = implementation.setDefaultNetwork(networkId);

      if (success) {
        setDefaultNetwork(networkId);

        // Update config
        const plugin = getPlugin(pluginId);
        if (plugin) {
          updatePluginConfig(pluginId, {
            ...plugin.config,
            defaultNetwork: networkId,
          });
        }
      } else {
        setError(`Failed to set ${networkId} as default network`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set default network');
    } finally {
      setIsLoading(false);
    }
  };

  // Save configuration
  const handleSaveConfig = () => {
    if (!implementation) return;

    const config = {
      defaultNetwork,
      gasPrice,
      gasLimit,
      confirmations,
      autoVerify,
    };

    updatePluginConfig(pluginId, config);

    // Update implementation config
    implementation.updateConfig(config);

    setShowConfig(false);
  };

  // Format timestamp to readable date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // Toggle network in script networks
  const toggleNetworkInScript = (networkId: string) => {
    setNewScriptNetworks((prev) =>
      prev.includes(networkId) ? prev.filter((id) => id !== networkId) : [...prev, networkId],
    );
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Deployment Automation</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}

      {/* Networks */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Networks</h3>
        <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded mb-4">
          <div className="overflow-x-auto">
            <table className="min-w-full border">
              <thead>
                <tr className="bg-gray-200 dark:bg-gray-600">
                  <th className="border px-4 py-2 text-left">Name</th>
                  <th className="border px-4 py-2 text-left">Chain ID</th>
                  <th className="border px-4 py-2 text-left">Symbol</th>
                  <th className="border px-4 py-2 text-left">RPC URL</th>
                  <th className="border px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {networks.map((network) => (
                  <tr key={network.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="border px-4 py-2">
                      {network.name}
                      {defaultNetwork === network.id && (
                        <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                          Default
                        </span>
                      )}
                    </td>
                    <td className="border px-4 py-2">{network.chainId}</td>
                    <td className="border px-4 py-2">{network.symbol}</td>
                    <td className="border px-4 py-2 truncate max-w-xs">{network.rpcUrl}</td>
                    <td className="border px-4 py-2">
                      <button
                        onClick={() => setSelectedNetwork(network.id)}
                        className={`px-2 py-1 text-xs rounded mr-2 ${
                          selectedNetwork === network.id
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                        }`}
                      >
                        Select
                      </button>
                      {defaultNetwork !== network.id && (
                        <button
                          onClick={() => handleSetDefaultNetwork(network.id)}
                          className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                        >
                          Set Default
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add Network Form */}
          <div className="mt-4 border-t pt-4">
            <h4 className="font-medium mb-2">Add Network</h4>
            <div className="grid grid-cols-2 gap-4 mb-2">
              <div>
                <label className="block text-sm font-medium mb-1">Network Name</label>
                <input
                  type="text"
                  value={newNetworkName}
                  onChange={(e) => setNewNetworkName(e.target.value)}
                  placeholder="e.g., Ethereum Mainnet"
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">RPC URL</label>
                <input
                  type="text"
                  value={newNetworkRpcUrl}
                  onChange={(e) => setNewNetworkRpcUrl(e.target.value)}
                  placeholder="e.g., https://mainnet.infura.io/v3/your-api-key"
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Chain ID</label>
                <input
                  type="number"
                  value={newNetworkChainId}
                  onChange={(e) => setNewNetworkChainId(e.target.value)}
                  placeholder="e.g., 1"
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Symbol</label>
                <input
                  type="text"
                  value={newNetworkSymbol}
                  onChange={(e) => setNewNetworkSymbol(e.target.value)}
                  placeholder="e.g., ETH"
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Block Explorer</label>
                <input
                  type="text"
                  value={newNetworkExplorer}
                  onChange={(e) => setNewNetworkExplorer(e.target.value)}
                  placeholder="e.g., https://etherscan.io"
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
            <button
              onClick={handleAddNetwork}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={isLoading || !newNetworkName || !newNetworkRpcUrl || !newNetworkChainId}
            >
              Add Network
            </button>
          </div>
        </div>
      </div>

      {/* Contract Deployment */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Contract Deployment</h3>
        <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Contract</label>
              <select
                value={selectedContract}
                onChange={(e) => handleContractSelection(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="">Select a contract</option>
                {getSolidityContracts().map(({ path, contractName }) => (
                  <option key={path} value={contractName}>
                    {contractName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Network</label>
              <select
                value={selectedNetwork}
                onChange={(e) => setSelectedNetwork(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="">Select a network</option>
                {networks.map((network) => (
                  <option key={network.id} value={network.id}>
                    {network.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Constructor Arguments */}
          {contractAbi.length > 0 && contractAbi.some((item) => item.type === 'constructor') && (
            <div className="mb-4">
              <h4 className="font-medium mb-2">Constructor Arguments</h4>
              <div className="bg-white dark:bg-gray-800 p-3 rounded border">
                <p className="text-gray-500 dark:text-gray-400">
                  This contract requires constructor arguments. In a real implementation, this would
                  show input fields for each argument.
                </p>
              </div>
            </div>
          )}

          <button
            onClick={handleDeployContract}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            disabled={isLoading || !selectedContract || !selectedNetwork}
          >
            Deploy Contract
          </button>
        </div>
      </div>

      {/* Deployment Scripts */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Deployment Scripts</h3>

        {deploymentScripts.length > 0 ? (
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded mb-4">
            <div className="space-y-3">
              {deploymentScripts.map((script) => (
                <div key={script.id} className="bg-white dark:bg-gray-800 p-3 rounded border">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{script.name}</h4>
                      <p className="text-sm text-gray-500">{script.description}</p>
                      <div className="mt-1">
                        <span className="text-sm">
                          Contract: <span className="font-medium">{script.contractName}</span>
                        </span>
                        <span className="mx-2">•</span>
                        <span className="text-sm">
                          Networks:{' '}
                          <span className="font-medium">{script.networks.join(', ')}</span>
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRunScript(script.id)}
                      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                      disabled={isLoading}
                    >
                      Run Script
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded mb-4 text-center">
            <p className="text-gray-600 dark:text-gray-400">No deployment scripts created yet.</p>
          </div>
        )}

        {/* Add Script Form */}
        <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded">
          <h4 className="font-medium mb-2">Create Deployment Script</h4>
          <div className="grid grid-cols-2 gap-4 mb-2">
            <div>
              <label className="block text-sm font-medium mb-1">Script Name</label>
              <input
                type="text"
                value={newScriptName}
                onChange={(e) => setNewScriptName(e.target.value)}
                placeholder="e.g., Deploy to Testnet"
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contract</label>
              <select
                value={selectedContract}
                onChange={(e) => handleContractSelection(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="">Select a contract</option>
                {getSolidityContracts().map(({ path, contractName }) => (
                  <option key={path} value={contractName}>
                    {contractName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Description</label>
            <input
              type="text"
              value={newScriptDescription}
              onChange={(e) => setNewScriptDescription(e.target.value)}
              placeholder="Brief description of this deployment script"
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Networks</label>
            <div className="bg-white dark:bg-gray-800 p-3 rounded border max-h-40 overflow-y-auto">
              {networks.length > 0 ? (
                <div className="space-y-1">
                  {networks.map((network) => (
                    <label key={network.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newScriptNetworks.includes(network.id)}
                        onChange={() => toggleNetworkInScript(network.id)}
                        className="mr-2"
                      />
                      {network.name}
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No networks available. Add a network first.</p>
              )}
            </div>
          </div>

          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={newScriptAutoRun}
                onChange={(e) => setNewScriptAutoRun(e.target.checked)}
                className="mr-2"
              />
              Auto-run on file save
            </label>
          </div>

          <button
            onClick={handleAddScript}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            disabled={
              isLoading || !newScriptName || !selectedContract || newScriptNetworks.length === 0
            }
          >
            Create Script
          </button>
        </div>
      </div>

      {/* Deployment Results */}
      {deploymentResults.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Deployment Results</h3>
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded">
            <div className="space-y-3">
              {deploymentResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded border ${
                    result.success
                      ? 'bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-800'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{result.contractName}</h4>
                      <p className="text-sm">
                        Network: <span className="font-medium">{result.network}</span>
                        {result.deployedAt && (
                          <>
                            <span className="mx-2">•</span>
                            Deployed:{' '}
                            <span className="font-medium">{formatDate(result.deployedAt)}</span>
                          </>
                        )}
                      </p>
                      {result.success ? (
                        <div className="mt-1">
                          <p className="text-sm">
                            Address: <span className="font-mono">{result.address}</span>
                          </p>
                          <p className="text-sm">
                            Transaction: <span className="font-mono">{result.txHash}</span>
                          </p>
                          {result.gasUsed && (
                            <p className="text-sm">
                              Gas Used:{' '}
                              <span className="font-medium">{result.gasUsed.toLocaleString()}</span>
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-red-600 mt-1">{result.error}</p>
                      )}
                    </div>
                    {result.success && result.verified !== undefined && (
                      <div
                        className={`px-2 py-1 text-xs rounded ${
                          result.verified
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {result.verified ? 'Verified' : 'Not Verified'}
                      </div>
                    )}
                  </div>
                  {result.success && result.verified && result.verificationUrl && (
                    <div className="mt-2">
                      <a
                        href={result.verificationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        View on Block Explorer
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
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
              <label className="block text-sm font-medium mb-1">Default Network</label>
              <select
                value={defaultNetwork}
                onChange={(e) => setDefaultNetwork(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="">Select a default network</option>
                {networks.map((network) => (
                  <option key={network.id} value={network.id}>
                    {network.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Gas Price</label>
              <div className="flex space-x-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={gasPrice === 'auto'}
                    onChange={() => setGasPrice('auto')}
                    className="mr-2"
                  />
                  Auto
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={gasPrice !== 'auto'}
                    onChange={() => setGasPrice('20')}
                    className="mr-2"
                  />
                  Custom
                </label>
                {gasPrice !== 'auto' && (
                  <input
                    type="number"
                    value={gasPrice}
                    onChange={(e) => setGasPrice(e.target.value)}
                    placeholder="Gas price in Gwei"
                    className="flex-1 p-2 border rounded"
                    min="1"
                  />
                )}
              </div>
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Gas Limit</label>
              <input
                type="number"
                value={gasLimit}
                onChange={(e) => setGasLimit(parseInt(e.target.value))}
                className="w-full p-2 border rounded"
                min="21000"
              />
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Confirmations</label>
              <input
                type="number"
                value={confirmations}
                onChange={(e) => setConfirmations(parseInt(e.target.value))}
                className="w-full p-2 border rounded"
                min="1"
                max="24"
              />
            </div>

            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={autoVerify}
                  onChange={(e) => setAutoVerify(e.target.checked)}
                  className="mr-2"
                />
                Auto-verify contracts on block explorer
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

export default DeploymentPluginUI;
