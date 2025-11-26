import React, { useEffect, useState } from 'react';
import { useDeploymentStore } from '@/stores/deploymentStore';
import { useCompilerStore } from '@/stores/compilerStore';
import type { CompiledContract } from '@/types';
import { toast } from 'sonner';
import { verificationService } from '@/services/verificationService';
import { web3Service } from '@/services/web3Service';
import { javascriptVMService } from '@/services/javascriptVMService';
import { Button } from '@/components/ui/button.tsx';
import { VMAccountSelector } from '@/components/VMAccountSelector.tsx';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { Input } from '@/components/ui/input.tsx';
import { selectBaseClass } from '@/utils/constant.ts';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils.ts';
import { LucideLoader2 } from 'lucide-react';
import WalletSelector from '@/components/WalletSelector.tsx';

const DeploymentPanel: React.FC = () => {
  const {
    account,
    balance,
    gasPrice,
    ethPrice,
    gasLimit,
    isDeploying,
    selectedNetwork,
    availableNetworks,
    deployedContracts,
    autoVerify,
    currentProvider,
    vmAccount,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    deployContract,
    callContractMethod,
    getDeployedContractsByNetwork,
    setAutoVerify,
    verifyContract,
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
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Wallet selector state
  const [showWalletSelector, setShowWalletSelector] = useState<boolean>(false);

  // Verification settings state
  const [apiKeys, setApiKeys] = useState<Map<string, string>>(new Map());
  const [selectedExplorer, setSelectedExplorer] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [showVerificationSettings, setShowVerificationSettings] = useState<boolean>(false);

  // Get the compiled contract
  const compiledContract = getSelectedContract();

  // Get deployed contracts for the current network
  const deployedContractsForNetwork = getDeployedContractsByNetwork(selectedNetwork);

  // Get the selected network object
  const selectedNetworkData = availableNetworks.find((n) => n.id === selectedNetwork);

  // Get the selected deployed contract
  const selectedDeployedContractData = selectedDeployedContract
    ? Array.from(deployedContracts.values()).find((c) => c.address === selectedDeployedContract)
    : null;

  // Get wallet provider information
  const getWalletProviderInfo = () => {
    const providers = web3Service.getAvailableWalletProviders();
    const provider = providers.find(p => p.id === currentProvider);
    return provider || null;
  };

  // Check if the selected deployed contract has a corresponding compiled contract
  const hasCompiledContract = selectedDeployedContractData
    ? Boolean(compilationResult?.success &&
      compilationResult.contracts &&
      Object.keys(compilationResult.contracts).some((contractName) =>
        contractName === selectedDeployedContractData.name,
      ))
    : false;

  // Get constructor inputs from ABI
  const getConstructorInputs = (contract: CompiledContract | null) => {
    if (!contract) return [];

    const constructorAbi = contract.abi.find((item) => item.type === 'constructor');
    return constructorAbi?.inputs || [];
  };

  // Get method inputs from ABI
  const getMethodInputs = (methodName: string) => {
    if (!selectedDeployedContractData) return [];

    const methodAbi = selectedDeployedContractData.abi.find(
      (item) => item.type === 'function' && item.name === methodName,
    );

    return methodAbi?.inputs || [];
  };

  // Get available methods from ABI
  const getAvailableMethods = () => {
    if (!selectedDeployedContractData) return [];

    return selectedDeployedContractData.abi
      .filter((item) => item.type === 'function')
      .map((item) => item.name);
  };

  // Check if method is read-only
  const isReadMethod = (methodName: string) => {
    if (!selectedDeployedContractData) return true;

    const methodAbi = selectedDeployedContractData.abi.find(
      (item) => item.type === 'function' && item.name === methodName,
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
    const recommendedProvider = web3Service.getRecommendedProvider();

    // If only one provider is available, connect directly
    const availableProviders = web3Service.getAvailableWalletProviders();
    if (availableProviders.length === 1) {
      setIsConnecting(true);
      try {
        await connectWallet();
      } catch (error) {
        console.error('Failed to connect wallet:', error);
        toast.error('Failed to connect wallet');
      } finally {
        setIsConnecting(false);
      }
    } else {
      // Show wallet selector for multiple providers
      setShowWalletSelector(true);
    }
  };

  // Handle wallet selection from the modal
  const handleWalletSelected = async (provider: 'metamask' | 'walletconnect' | 'javascriptvm') => {
    setIsConnecting(true);
    try {
      await connectWallet(provider);
      const providerName = provider === 'metamask' ? 'MetaMask' : provider === 'walletconnect' ? 'WalletConnect' : 'JavaScript VM';
      toast.success(`Connected using ${providerName}!`);
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleNetworkChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const chainId = parseInt(e.target.value);
    await switchNetwork(chainId);
  };

  const handleNetworkValueChange = async (value: string) => {
    const chainId = parseInt(value);
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

    return inputs.map((input: { type: string | string[] }, index: string | number) => {
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

    return inputs.map((input: { type: string | string[] }, index: string | number) => {
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

      const options = isReadMethod(methodName) ? {} : { gas: parseInt(customGasLimit) };

      const result = await callContractMethod(
        selectedDeployedContract,
        methodName,
        parsedArgs,
        options,
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

  // Load API keys when component mounts
  useEffect(() => {
    const keys = verificationService.getAllApiKeys();
    setApiKeys(keys);
  }, []);

  // Handle API key change
  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(e.target.value);
  };

  // Handle contract verification
  const handleVerifyContract = async (contractAddress: string) => {
    setIsVerifying(true);
    try {
      await verifyContract(contractAddress);
      // toast.success('Contract verified successfully');
    } catch (error) {
      console.error('Failed to verify contract:', error);
      toast.error('Failed to verify contract');
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle explorer selection
  const handleExplorerChange = (value: string) => {
    setSelectedExplorer(value);
    // If we already have a key for this explorer, load it
    const existingKey = apiKeys.get(value);
    if (existingKey) {
      setApiKey(existingKey);
    } else {
      setApiKey('');
    }
  };

  // Save API key
  const handleSaveApiKey = () => {
    if (!selectedExplorer || !apiKey) {
      toast.error('Please select an explorer and enter an API key');
      return;
    }

    // Save to verification service
    verificationService.setApiKey(selectedExplorer, apiKey);

    // Update local state
    const newApiKeys = new Map(apiKeys);
    newApiKeys.set(selectedExplorer, apiKey);
    setApiKeys(newApiKeys);

    toast.success(`API key saved for ${selectedExplorer}`);
  };

  // Remove API key
  const handleRemoveApiKey = (explorer: string) => {
    // Remove from verification service
    verificationService.setApiKey(explorer, '');

    // Update local state
    const newApiKeys = new Map(apiKeys);
    newApiKeys.delete(explorer);
    setApiKeys(newApiKeys);

    // If this was the selected explorer, reset the form
    if (explorer === selectedExplorer) {
      setSelectedExplorer('');
      setApiKey('');
    }

    toast.success(`API key removed for ${explorer}`);
  };

  return (
    <div className="h-full">
      {/* Header */}
      {/*<div className="p-4 border-b border-muted">
        <div className="text-sm font-semibold text-foreground">
          Deployment & Interaction
        </div>
      </div>*/}

      <Accordion type="single" collapsible className="w-full px-3" defaultValue="item-1">
        <AccordionItem value="item-1">
          <AccordionTrigger>Wallet Connection</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-4 text-balance">
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
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">Connected Account</div>
                  <Button
                    onClick={handleDisconnectWallet}
                    className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    // className={'h-8'}
                    size={'sm'}
                    variant={'ghost'}
                  >
                    Disconnect
                  </Button>
                </div>
                <div className="p-3 bg-secondary rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-normal text-foreground break-all">
                      {formatAddress(account)}
                    </div>
                    {getWalletProviderInfo() && (
                      <div className="flex items-center gap-2 px-2 py-1 bg-muted rounded-full text-xs">
                        <span>{getWalletProviderInfo()?.icon}</span>
                        <span>{getWalletProviderInfo()?.name}</span>
                      </div>
                    )}
                  </div>
                  <div className="font-medium text-xs text-muted-foreground">
                    Balance: {currentProvider === 'javascriptvm' ? (vmAccount ? formatBalance(vmAccount?.balance) : formatBalance('0.0')) : formatBalance(balance)} {selectedNetworkData?.symbol || 'ETH'}
                  </div>
                </div>

                {/* Network Selection */}
                {
                  currentProvider !== 'javascriptvm' &&
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Network
                    </label>
                    <Select
                      value={selectedNetworkData?.chainId.toString() || ''}
                      onValueChange={handleNetworkValueChange}
                    >
                      <SelectTrigger className="w-full text-xs">
                        <SelectValue placeholder="Select Network">
                          {selectedNetworkData
                            ? `${selectedNetworkData.name} ${selectedNetworkData.isTestnet ? '(Testnet)' : ''}`
                            : 'Select Network'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Blockchain Network</SelectLabel>
                          {availableNetworks.map((network) => (
                            <SelectItem key={network.id} value={network.chainId.toString()}>
                              {network.name} {network.isTestnet ? '(Testnet)' : ''}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                }

                {/* VM Account Selector - Show when JavaScript VM is connected */}
                {currentProvider === 'javascriptvm' && (
                  <VMAccountSelector
                    isVisible={true}
                    onAccountChange={(account) => {
                      // Refresh account info when VM account changes
                      setTimeout(() => {
                        // Force refresh the deployment store
                        window.location.reload();
                      }, 500);
                    }}
                  />
                )}

                {/* Gas Settings */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Gas Limit
                  </label>
                  <Input
                    type="text"
                    value={customGasLimit}
                    onChange={handleGasLimitChange}
                    className={'text-xs'}
                    // className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {gasPrice && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      <div>Current Gas Price: {parseFloat(gasPrice).toFixed(6)} Gwei</div>
                      {ethPrice && (
                        <div className="text-muted-foreground/80">
                          ≈ ${(parseFloat(gasPrice) * ethPrice * 1e-9).toFixed(18)} USD
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-2" disabled={!account}>
          <AccordionTrigger>Verification Settings</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-4 text-pretty">
            {/* Auto-verify Setting */}
            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={autoVerify}
                  onChange={(e) => setAutoVerify(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-foreground">
                  Auto-verify contracts on block explorer
                </span>
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                When enabled, contracts will be automatically verified on the block explorer after
                deployment. You need to provide API keys for the block explorers you want to use.
              </p>
            </div>

            {/* API Key Configuration */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-foreground">Block Explorer API Keys</h4>

              {/* Current API Keys */}
              {apiKeys.size > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Your saved API keys:</p>
                  <div className="bg-secondary rounded-md p-2">
                    {Array.from(apiKeys.entries()).map(([explorer, key]) => (
                      <div
                        key={explorer}
                        className="flex justify-between items-center py-1 border-b border-gray-200 dark:border-gray-700 last:border-0"
                      >
                        <span className="text-xs font-medium">{explorer}</span>
                        <div className="flex items-center">
                          <span className="text-xs text-muted-foreground mr-2">
                            {key.substring(0, 4)}...{key.substring(key.length - 4)}
                          </span>
                          <Button
                            onClick={() => handleRemoveApiKey(explorer)}
                            size="sm"
                            variant="ghost"
                            className="h-6 text-red-500 hover:text-red-700"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground bg-muted p-2 rounded-md">
                  You are using Sol-IDE's default API Key. Add an API key below to use your own API
                  Key.
                </div>
              )}

              {/* Add New API Key */}
              <div className="space-y-3 pt-2">
                <h5 className="text-xs font-medium text-foreground">Add New API Key</h5>

                {/* There's no need to use the network selection, we are now using etherscan's
                multi-chain verification API
                */}
                <div className={'hidden'}>
                  <label className="block text-xs text-muted-foreground mb-1">Block Explorer</label>
                  <Select value={selectedExplorer} onValueChange={handleExplorerChange}>
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue placeholder="Select Block Explorer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Ethereum</SelectLabel>
                        <SelectItem value="etherscan">Etherscan (Mainnet)</SelectItem>
                        <SelectItem value="sepolia.etherscan">Etherscan (Sepolia)</SelectItem>
                        <SelectItem value="holesky.etherscan">Etherscan (Holesky)</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Layer 2 - Arbitrum</SelectLabel>
                        <SelectItem value="arbiscan">Arbiscan (Arbitrum One)</SelectItem>
                        <SelectItem value="nova.arbiscan">Arbiscan (Nova)</SelectItem>
                        <SelectItem value="sepolia.arbiscan">Arbiscan (Sepolia)</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Layer 2 - Optimism</SelectLabel>
                        <SelectItem value="optimistic.etherscan">
                          Optimistic Etherscan (Mainnet)
                        </SelectItem>
                        <SelectItem value="sepolia.optimistic.etherscan">
                          Optimistic Etherscan (Sepolia)
                        </SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Layer 2 - Base</SelectLabel>
                        <SelectItem value="basescan">Basescan (Mainnet)</SelectItem>
                        <SelectItem value="sepolia.basescan">Basescan (Sepolia)</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Layer 2 - Polygon</SelectLabel>
                        <SelectItem value="polygonscan">Polygonscan (Mainnet)</SelectItem>
                        <SelectItem value="amoy.polygonscan">Polygonscan (Amoy)</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Layer 2 - Blast</SelectLabel>
                        <SelectItem value="blastscan">Blastscan (Mainnet)</SelectItem>
                        <SelectItem value="sepolia.blastscan">Blastscan (Sepolia)</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Layer 2 - Linea</SelectLabel>
                        <SelectItem value="lineascan">Lineascan (Mainnet)</SelectItem>
                        <SelectItem value="sepolia.lineascan">Lineascan (Sepolia)</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Layer 2 - Mantle</SelectLabel>
                        <SelectItem value="mantlescan">Mantlescan (Mainnet)</SelectItem>
                        <SelectItem value="sepolia.mantlescan">Mantlescan (Sepolia)</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Layer 2 - Scroll</SelectLabel>
                        <SelectItem value="scrollscan">Scrollscan (Mainnet)</SelectItem>
                        <SelectItem value="sepolia.scrollscan">Scrollscan (Sepolia)</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Layer 2 - zkSync</SelectLabel>
                        <SelectItem value="zksync">zkSync Era (Mainnet)</SelectItem>
                        <SelectItem value="sepolia.zksync">zkSync Era (Sepolia)</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>BNB Chain</SelectLabel>
                        <SelectItem value="bscscan">BSCScan (Mainnet)</SelectItem>
                        <SelectItem value="testnet.bscscan">BSCScan (Testnet)</SelectItem>
                        <SelectItem value="opbnbscan">opBNB (Mainnet)</SelectItem>
                        <SelectItem value="testnet.opbnbscan">opBNB (Testnet)</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Avalanche</SelectLabel>
                        <SelectItem value="snowtrace">Snowtrace (C-Chain)</SelectItem>
                        <SelectItem value="testnet.snowtrace">Snowtrace (Fuji)</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Other Networks</SelectLabel>
                        <SelectItem value="gnosisscan">Gnosisscan (Gnosis)</SelectItem>
                        <SelectItem value="celoscan">Celoscan (Celo)</SelectItem>
                        <SelectItem value="alfajores.celoscan">Celoscan (Alfajores)</SelectItem>
                        <SelectItem value="cronoscan">Cronoscan (Cronos)</SelectItem>
                        <SelectItem value="fraxscan">Fraxscan (Fraxtal)</SelectItem>
                        <SelectItem value="testnet.fraxscan">Fraxscan (Testnet)</SelectItem>
                        <SelectItem value="moonbeamscan">Moonbeamscan (Moonbeam)</SelectItem>
                        <SelectItem value="moonriverscan">Moonriverscan (Moonriver)</SelectItem>
                        <SelectItem value="testnet.moonbeamscan">
                          Moonbeamscan (Moonbase Alpha)
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs text-muted-foreground mb-1">API Key</label>
                  <Input
                    type="text"
                    value={apiKey}
                    onChange={handleApiKeyChange}
                    placeholder="Enter your API key"
                    className="text-xs"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    You can get API keys from the respective block explorer websites.
                  </p>
                </div>

                <Button
                  onClick={handleSaveApiKey}
                  className="w-full"
                  size="sm"
                  disabled={!selectedExplorer || !apiKey}
                >
                  Save API Key
                </Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Contract Deployment */}
        {account && (
          <AccordionItem value="item-3">
            <AccordionTrigger>Contract Deployment</AccordionTrigger>
            <AccordionContent className="flex flex-col gap-4 text-pretty">
              {!compilationResult?.success ? (
                <div className="text-sm text-muted-foreground">
                  Compile a contract first to deploy it.
                </div>
              ) : !compiledContract ? (
                <div className="text-sm text-muted-foreground">Select a contract to deploy.</div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-secondary rounded-md">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {compiledContract.name}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Bytecode Size: {compiledContract.bytecode.length / 2} bytes
                    </div>
                  </div>

                  {/* Constructor Arguments */}
                  {getConstructorInputs(compiledContract).length > 0 && (
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-muted-foreground">
                        Constructor Arguments
                      </label>
                      {getConstructorInputs(compiledContract).map((input, index) => (
                        <div key={index} className="space-y-1">
                          <label className="block text-xs text-muted-foreground">
                            {input.name} ({input.type})
                          </label>
                          <Input
                            type="text"
                            value={constructorArgs[index] || ''}
                            onChange={(e) => handleConstructorArgChange(index, e.target.value)}
                            placeholder={`Enter ${input.type} value`}
                            // className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={handleDeploy}
                    disabled={isDeploying}
                    className={cn(
                      'w-full px-4 py-2 text-sm font-medium rounded-md transition-colors',
                      isDeploying
                        ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700 text-white focus:ring-2 focus:ring-green-500 focus:ring-offset-2',
                    )}
                  >
                    {isDeploying ? (
                      <div className="flex items-center justify-center">
                        {/*<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>*/}
                        <LucideLoader2 size={16} className="animate-spin" />
                        Deploying...
                      </div>
                    ) : (
                      'Deploy Contract'
                    )}
                  </button>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Deployed Contracts */}
        {account && deployedContractsForNetwork.length > 0 && (
          <AccordionItem value="item-4">
            <AccordionTrigger>Deployed Contracts</AccordionTrigger>
            <AccordionContent className="flex flex-col gap-4 text-pretty">
              <div className="space-y-3">
                {/* Contract Selection */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Select Contract
                  </label>
                  <select
                    value={selectedDeployedContract || ''}
                    onChange={(e) => setSelectedDeployedContract(e.target.value)}
                    className="w-full px-2 py-2 text-sm outline-none rounded-md bg-secondary text-foreground"
                  >
                    <option value="">Select a contract</option>
                    {deployedContractsForNetwork.map((contract) => (
                      <option key={contract.address} value={contract.address}>
                        {contract.name} ({formatAddress(contract.address)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Contract Interaction */}
                {selectedDeployedContractData && (
                  <div className="space-y-3">
                    <div className="p-3 bg-secondary rounded-md">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            {selectedDeployedContractData.name}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground break-all">
                            Address: {selectedDeployedContractData.address}
                          </div>
                          <div className="mt-1 text-xs text-green-600">
                            Deployed:{' '}
                            {new Date(selectedDeployedContractData.deployedAt).toLocaleString()}
                          </div>
                        </div>
                        {selectedDeployedContractData.verified !== undefined && (
                          <div
                            className={`px-2 py-1 text-xs rounded ${
                              selectedDeployedContractData.verified
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
                            }`}
                          >
                            {selectedDeployedContractData.verified ? 'Verified' : 'Not Verified'}
                          </div>
                        )}
                      </div>
                      {selectedDeployedContractData.verified &&
                        selectedDeployedContractData.verificationUrl && (
                          <div className="mt-2">
                            <a
                              href={selectedDeployedContractData.verificationUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline"
                            >
                              View on Block Explorer
                            </a>
                          </div>
                        )}
                      {selectedDeployedContractData.verified === false && (
                        <div className="mt-2 space-y-2">
                          {!hasCompiledContract && (
                            <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                              <div className="flex items-start">
                                <div className="flex-shrink-0">
                                  <svg
                                    className="h-4 w-4 text-yellow-400"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                </div>
                                <div className="ml-2">
                                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                                    Please compile the{' '}
                                    <strong>{selectedDeployedContractData.name}</strong> contract
                                    before verifying it.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                          <Button
                            onClick={() =>
                              handleVerifyContract(selectedDeployedContractData.address)
                            }
                            size="sm"
                            className="text-xs"
                            disabled={isVerifying || !hasCompiledContract}
                          >
                            {isVerifying ? (
                              <div className="flex items-center">
                                <LucideLoader2 size={12} className="animate-spin mr-1" />
                                Verifying...
                              </div>
                            ) : (
                              'Verify Contract'
                            )}
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Method Selection */}
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        Select Method
                      </label>
                      <select
                        value={methodName}
                        onChange={(e) => setMethodName(e.target.value)}
                        className={selectBaseClass}
                      >
                        <option value="">Select a method</option>
                        {getAvailableMethods().map((method) => (
                          <option key={method} value={method}>
                            {method} {isReadMethod(method) ? '(read)' : '(write)'}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Method Arguments */}
                    {methodName && getMethodInputs(methodName).length > 0 && (
                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-foreground">
                          Method Arguments
                        </label>
                        {getMethodInputs(methodName).map((input, index) => (
                          <div key={index} className="space-y-1">
                            <label className="block text-xs text-muted-foreground">
                              {input.name} ({input.type})
                            </label>
                            <Input
                              type="text"
                              value={methodArgs[index] || ''}
                              onChange={(e) => handleMethodArgChange(index, e.target.value)}
                              placeholder={`Enter ${input.type} value`}
                              className={'text-xs'}
                              // className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      <div className="p-3 bg-secondary rounded-md">
                        <div className="text-xs font-medium text-muted-foreground mb-1">
                          Result:
                        </div>
                        <div className="text-sm text-foreground break-all">
                          {typeof methodResult === 'object'
                            ? JSON.stringify(methodResult, null, 2)
                            : String(methodResult)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      {/* Wallet Selector Modal */}
      <WalletSelector
        isOpen={showWalletSelector}
        onClose={() => setShowWalletSelector(false)}
        onConnect={handleWalletSelected}
        recommendedProvider={web3Service.getRecommendedProvider()}
      />
    </div>
  );
};

export default DeploymentPanel;
