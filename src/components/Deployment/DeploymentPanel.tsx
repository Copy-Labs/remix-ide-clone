import React, { useEffect, useState } from 'react';
import { useDeploymentStore } from '@/stores/deploymentStore';
import { useCompilerStore } from '@/stores/compilerStore';
import type {CompiledContract} from '@/types';
import toast from 'react-hot-toast';

const DeploymentPanel: React.FC = () => {
  const {
    account,
    balance,
    gasPrice,
    gasLimit,
    isDeploying,
    selectedNetwork,
    availableNetworks,
    deployedContracts,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    deployContract,
    callContractMethod,
    getDeployedContractsByNetwork,
  } = useDeploymentStore();

  const {
    compilationResult,
    selectedContract: selectedCompiledContract,
    getSelectedContract,
  } = useCompilerStore();

  // Local state
  const [constructorArgs, setConstructorArgs] = useState<string[]>([]);
  const [selectedDeployedContract, setSelectedDeployedContract] = useState<string | null>(null);
  const [methodName, setMethodName] = useState<string>('');
  const [methodArgs, setMethodArgs] = useState<string[]>([]);
  const [methodResult, setMethodResult] = useState<any>(null);
  const [customGasLimit, setCustomGasLimit] = useState<string>(gasLimit);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  // Get the compiled contract
  const compiledContract = getSelectedContract();

  // Get deployed contracts for the current network
  const deployedContractsForNetwork = getDeployedContractsByNetwork(selectedNetwork);

  // Get the selected deployed contract
  const selectedDeployedContractData = selectedDeployedContract
    ? Array.from(deployedContracts.values()).find(c => c.address === selectedDeployedContract)
    : null;

  // Get constructor inputs from ABI
  const getConstructorInputs = (contract: CompiledContract | null) => {
    if (!contract) return [];

    const constructorAbi = contract.abi.find(item => item.type === 'constructor');
    return constructorAbi?.inputs || [];
  };

  // Get method inputs from ABI
  const getMethodInputs = (methodName: string) => {
    if (!selectedDeployedContractData) return [];

    const methodAbi = selectedDeployedContractData.abi.find(
      item => item.type === 'function' && item.name === methodName
    );

    return methodAbi?.inputs || [];
  };

  // Get available methods from ABI
  const getAvailableMethods = () => {
    if (!selectedDeployedContractData) return [];

    return selectedDeployedContractData.abi
      .filter(item => item.type === 'function')
      .map(item => item.name);
  };

  // Check if method is read-only
  const isReadMethod = (methodName: string) => {
    if (!selectedDeployedContractData) return true;

    const methodAbi = selectedDeployedContractData.abi.find(
      item => item.type === 'function' && item.name === methodName
    );

    return methodAbi?.stateMutability === 'view' || methodAbi?.stateMutability === 'pure';
  };

  // Reset constructor args when selected contract changes
  useEffect(() => {
    if (compiledContract) {
      const inputs = getConstructorInputs(compiledContract);
      setConstructorArgs(Array(inputs.length).fill(''));
    }
  }, [compiledContract]);

  // Reset method args when selected method changes
  useEffect(() => {
    const inputs = getMethodInputs(methodName);
    setMethodArgs(Array(inputs.length).fill(''));
    setMethodResult(null);
  }, [methodName, selectedDeployedContract]);

  // Handle wallet connection
  const handleConnectWallet = async () => {
    setIsConnecting(true);
    try {
      await connectWallet();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      toast.error('Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle wallet disconnection
  const handleDisconnectWallet = () => {
    disconnectWallet();
  };

  // Handle network switching
  const handleNetworkChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const chainId = parseInt(e.target.value);
    await switchNetwork(chainId);
  };

  // Handle constructor arg changes
  const handleConstructorArgChange = (index: number, value: string) => {
    const newArgs = [...constructorArgs];
    newArgs[index] = value;
    setConstructorArgs(newArgs);
  };

  // Handle method arg changes
  const handleMethodArgChange = (index: number, value: string) => {
    const newArgs = [...methodArgs];
    newArgs[index] = value;
    setMethodArgs(newArgs);
  };

  // Handle gas limit change
  const handleGasLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomGasLimit(e.target.value);
  };

  // Parse constructor arguments based on ABI types
  const parseConstructorArgs = () => {
    if (!compiledContract) return [];

    const inputs = getConstructorInputs(compiledContract);

    return inputs.map((input, index) => {
      const value = constructorArgs[index];

      // Parse based on type
      if (input.type.includes('int')) {
        return parseInt(value);
      } else if (input.type === 'bool') {
        return value.toLowerCase() === 'true';
      } else if (input.type.includes('[]')) {
        try {
          return JSON.parse(value);
        } catch {
          return [];
        }
      } else {
        return value;
      }
    });
  };

  // Parse method arguments based on ABI types
  const parseMethodArgs = () => {
    const inputs = getMethodInputs(methodName);

    return inputs.map((input, index) => {
      const value = methodArgs[index];

      // Parse based on type
      if (input.type.includes('int')) {
        return parseInt(value);
      } else if (input.type === 'bool') {
        return value.toLowerCase() === 'true';
      } else if (input.type.includes('[]')) {
        try {
          return JSON.parse(value);
        } catch {
          return [];
        }
      } else {
        return value;
      }
    });
  };

  // Handle contract deployment
  const handleDeploy = async () => {
    if (!compiledContract) {
      toast.error('No contract selected for deployment');
      return;
    }

    try {
      const parsedArgs = parseConstructorArgs();

      const options = {
        gas: parseInt(customGasLimit),
      };

      await deployContract(compiledContract, parsedArgs, options);
    } catch (error) {
      console.error('Failed to deploy contract:', error);
      toast.error('Failed to deploy contract');
    }
  };

  // Handle method call
  const handleCallMethod = async () => {
    if (!selectedDeployedContract || !methodName) {
      toast.error('Please select a contract and method');
      return;
    }

    try {
      const parsedArgs = parseMethodArgs();

      const options = isReadMethod(methodName)
        ? {}
        : { gas: parseInt(customGasLimit) };

      const result = await callContractMethod(
        selectedDeployedContract,
        methodName,
        parsedArgs,
        options
      );

      setMethodResult(result);
    } catch (error) {
      console.error(`Failed to call method ${methodName}:`, error);
      toast.error(`Failed to call method ${methodName}`);
    }
  };

  // Format address for display
  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Format balance for display
  const formatBalance = (balance: string | null) => {
    if (!balance) return '0';
    // Limit to 6 decimal places
    return parseFloat(balance).toFixed(6);
  };

  return (
    <div className="h-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Deployment & Interaction
        </h2>
      </div>

      <div className="p-4 space-y-6">
        {/* Wallet Connection */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            Wallet Connection
          </h3>

          {!account ? (
            <button
              onClick={handleConnectWallet}
              disabled={isConnecting}
              className={`w-full px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                isConnecting
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
              }`}
            >
              {isConnecting ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Connecting...
                </div>
              ) : (
                'Connect Wallet'
              )}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Connected Account
                </div>
                <button
                  onClick={handleDisconnectWallet}
                  className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                >
                  Disconnect
                </button>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                <div className="text-sm font-medium text-gray-900 dark:text-white break-all">
                  {account}
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Balance: {formatBalance(balance)} {availableNetworks.find(n => n.id === selectedNetwork)?.symbol || 'ETH'}
                </div>
              </div>

              {/* Network Selection */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Network
                </label>
                <select
                  value={availableNetworks.find(n => n.id === selectedNetwork)?.chainId.toString() || ''}
                  onChange={handleNetworkChange}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {availableNetworks.map(network => (
                    <option key={network.id} value={network.chainId.toString()}>
                      {network.name} {network.isTestnet ? '(Testnet)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Gas Settings */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Gas Limit
                </label>
                <input
                  type="text"
                  value={customGasLimit}
                  onChange={handleGasLimitChange}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {gasPrice && (
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Current Gas Price: {parseFloat(gasPrice).toFixed(2)} Gwei
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Contract Deployment */}
        {account && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Contract Deployment
            </h3>

            {!compilationResult?.success ? (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Compile a contract first to deploy it.
              </div>
            ) : !compiledContract ? (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Select a contract to deploy.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {compiledContract.name}
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Bytecode Size: {compiledContract.bytecode.length / 2} bytes
                  </div>
                </div>

                {/* Constructor Arguments */}
                {getConstructorInputs(compiledContract).length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                      Constructor Arguments
                    </label>
                    {getConstructorInputs(compiledContract).map((input, index) => (
                      <div key={index} className="space-y-1">
                        <label className="block text-xs text-gray-600 dark:text-gray-400">
                          {input.name} ({input.type})
                        </label>
                        <input
                          type="text"
                          value={constructorArgs[index] || ''}
                          onChange={(e) => handleConstructorArgChange(index, e.target.value)}
                          placeholder={`Enter ${input.type} value`}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={handleDeploy}
                  disabled={isDeploying}
                  className={`w-full px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    isDeploying
                      ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white focus:ring-2 focus:ring-green-500 focus:ring-offset-2'
                  }`}
                >
                  {isDeploying ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Deploying...
                    </div>
                  ) : (
                    'Deploy Contract'
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Deployed Contracts */}
        {account && deployedContractsForNetwork.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Deployed Contracts
            </h3>

            <div className="space-y-3">
              {/* Contract Selection */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Select Contract
                </label>
                <select
                  value={selectedDeployedContract || ''}
                  onChange={(e) => setSelectedDeployedContract(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a contract</option>
                  {deployedContractsForNetwork.map(contract => (
                    <option key={contract.address} value={contract.address}>
                      {contract.name} ({formatAddress(contract.address)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Contract Interaction */}
              {selectedDeployedContractData && (
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedDeployedContractData.name}
                    </div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 break-all">
                      Address: {selectedDeployedContractData.address}
                    </div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Deployed: {new Date(selectedDeployedContractData.deployedAt).toLocaleString()}
                    </div>
                  </div>

                  {/* Method Selection */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Select Method
                    </label>
                    <select
                      value={methodName}
                      onChange={(e) => setMethodName(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select a method</option>
                      {getAvailableMethods().map(method => (
                        <option key={method} value={method}>
                          {method} {isReadMethod(method) ? '(read)' : '(write)'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Method Arguments */}
                  {methodName && getMethodInputs(methodName).length > 0 && (
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                        Method Arguments
                      </label>
                      {getMethodInputs(methodName).map((input, index) => (
                        <div key={index} className="space-y-1">
                          <label className="block text-xs text-gray-600 dark:text-gray-400">
                            {input.name} ({input.type})
                          </label>
                          <input
                            type="text"
                            value={methodArgs[index] || ''}
                            onChange={(e) => handleMethodArgChange(index, e.target.value)}
                            placeholder={`Enter ${input.type} value`}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Call Method Button */}
                  {methodName && (
                    <button
                      onClick={handleCallMethod}
                      className={`w-full px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        isReadMethod(methodName)
                          ? 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                          : 'bg-yellow-600 hover:bg-yellow-700 text-white focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2'
                      }`}
                    >
                      {isReadMethod(methodName) ? 'Call' : 'Send'} {methodName}
                    </button>
                  )}

                  {/* Method Result */}
                  {methodResult !== null && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                      <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Result:
                      </div>
                      <div className="text-sm text-gray-900 dark:text-white break-all">
                        {typeof methodResult === 'object'
                          ? JSON.stringify(methodResult, null, 2)
                          : String(methodResult)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeploymentPanel;
