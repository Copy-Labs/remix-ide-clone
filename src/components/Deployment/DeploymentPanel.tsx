import React, { useEffect, useState } from 'react';
import { useDeploymentStore } from '@/stores/deploymentStore';
import { useCompilerStore } from '@/stores/compilerStore';
import type { CompiledContract } from '@/types';
import { toast } from 'sonner';
import { verificationService } from '@/services/verificationService';
import { Button } from '@/components/ui/button.tsx';
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
import { Separator } from '@/components/ui/separator.tsx';
import { selectBaseClass } from '@/utils/constant.ts';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils.ts';
import { LucideLoader2 } from 'lucide-react';

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
    autoVerify,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    deployContract,
    callContractMethod,
    getDeployedContractsByNetwork,
    setAutoVerify,
    verifyContract,
    getTestAccounts,
    isUsingTestWallet,
    getSelectedTestAccountIndex,
    switchVMAccount,
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

  // Test accounts state
  const [testAccounts, setTestAccounts] = useState<Array<{address: string, balance: string}>>([]);
  const [selectedTestAccount, setSelectedTestAccount] = useState<number>(-1);
  const [isUsingTest, setIsUsingTest] = useState<boolean>(false);

  // Verification settings state
  const [apiKeys, setApiKeys] = useState<Map<string, string>>(new Map());
  const [selectedExplorer, setSelectedExplorer] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [showVerificationSettings, setShowVerificationSettings] = useState<boolean>(false);

  // Get the compiled contract
  const compiledContract = getSelectedContract();

  // Get deployed contracts for the current network
  const deployedContractsForNetwork = getDeployedContractsByNetwork(selectedNetwork);

  // Get the selected deployed contract
  const selectedDeployedContractData = selectedDeployedContract
    ? Array.from(deployedContracts.values()).find((c) => c.address === selectedDeployedContract)
    : null;

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
  const handleConnectWallet = async (type: 'metamask' | 'walletconnect' | 'vm' = 'metamask') => {
    setIsConnecting(true);
    try {
      const success = await connectWallet(type);

      if (success && type === 'vm') {
        // If using VM, we need to refresh the test accounts
        const accounts = getTestAccounts();
        setTestAccounts(accounts);

        // Get selected test account index
        const selectedIndex = getSelectedTestAccountIndex();
        setSelectedTestAccount(selectedIndex);

        // Set isUsingTest to true for VM
        setIsUsingTest(true);
      }
    } catch (error) {
      console.error(`Failed to connect to ${type}:`, error);
      toast.error(`Failed to connect to ${type}`);
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle test account connection
  const handleConnectTestAccount = async (index: number) => {
    setIsConnecting(true);
    try {
      const success = await connectWallet('test', index);

      if (success) {
        setIsUsingTest(true);
        setSelectedTestAccount(index);
      } else {
        toast.error('Failed to connect to test account');
      }
    } catch (error) {
      console.error('Failed to connect to test account:', error);
      toast.error('Failed to connect to test account');
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle VM account switching
  const handleSwitchVMAccount = async (index: number) => {
    setIsConnecting(true);
    try {
      const success = await switchVMAccount(index);

      if (success) {
        setSelectedTestAccount(index);
      } else {
        toast.error('Failed to switch VM account');
      }
    } catch (error) {
      console.error('Failed to switch VM account:', error);
      toast.error('Failed to switch VM account');
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle wallet disconnection
  const handleDisconnectWallet = () => {
    disconnectWallet();
    setIsUsingTest(false);
    setSelectedTestAccount(-1);
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

  // Load test accounts and check if using test account
  useEffect(() => {
    const accounts = getTestAccounts();
    setTestAccounts(accounts);

    const isUsingTestWalletValue = isUsingTestWallet();
    setIsUsingTest(isUsingTestWalletValue);

    const selectedIndex = getSelectedTestAccountIndex();
    setSelectedTestAccount(selectedIndex);
  }, [getTestAccounts, isUsingTestWallet, getSelectedTestAccountIndex, account]);

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
              <div className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => handleConnectWallet('vm')}
                    disabled={isConnecting}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      isConnecting
                        ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700 text-white focus:ring-2 focus:ring-green-500 focus:ring-offset-2'
                    }`}
                  >
                    {isConnecting ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Connecting...
                      </div>
                    ) : (
                      'JavaScript VM'
                    )}
                  </button>

                  <button
                    onClick={() => handleConnectWallet('metamask')}
                    disabled={isConnecting}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
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
                      'Connect MetaMask'
                    )}
                  </button>
                </div>

                {/* Test Accounts Section */}
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-foreground mb-2">Test Accounts</h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    Use test accounts for development and testing without connecting a real wallet.
                  </p>

                  {testAccounts.length > 0 ? (
                    <div className="border rounded-md overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                              Address
                            </th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                              Balance
                            </th>
                            <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                          {testAccounts.map((account, index) => (
                            <tr key={index}>
                              <td className="px-3 py-2 whitespace-nowrap text-xs font-mono text-gray-900 dark:text-gray-300">
                                {formatAddress(account.address)}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-gray-300">
                                {account.balance} ETH
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-right text-xs">
                                <button
                                  onClick={() => handleConnectTestAccount(index)}
                                  disabled={isConnecting}
                                  className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                  {isConnecting ? 'Connecting...' : 'Use'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">No test accounts available.</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {isUsingTest ? 'Connected Test Account' : 'Connected Account'}
                  </div>
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
                  <div className="text-sm font-normal text-foreground break-all">{account}</div>
                  <div className="font-medium text-xs text-muted-foreground">
                    Balance: {formatBalance(balance)}{' '}
                    {availableNetworks.find((n) => n.id === selectedNetwork)?.symbol || 'ETH'}
                    {isUsingTest && <span className="ml-2 text-green-500">(Test Account)</span>}
                  </div>
                </div>

                {/* Test Account Selector - Only show when using VM/test accounts */}
                {isUsingTest && testAccounts.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Select Test Account
                    </label>
                    <Select
                      value={selectedTestAccount >= 0 ? selectedTestAccount.toString() : "0"}
                      onValueChange={(value) => handleSwitchVMAccount(parseInt(value))}
                    >
                      <SelectTrigger className="w-full text-xs">
                        <SelectValue placeholder="Select Test Account" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Available Test Accounts</SelectLabel>
                          {testAccounts.map((testAccount, index) => (
                            <SelectItem key={index} value={index.toString()}>
                              <div className="flex flex-col">
                                <span className="font-mono text-xs">
                                  {formatAddress(testAccount.address)}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {testAccount.balance} ETH
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Network Selection */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Network
                  </label>
                  {/*<select
                defaultValue={
                  availableNetworks.find((n) => n.id === selectedNetwork)?.chainId.toString() ||
                  ''
                }
                onChange={handleNetworkChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {availableNetworks.map((network) => (
                  <option key={network.id} value={network.chainId.toString()}>
                    {network.name} {network.isTestnet ? '(Testnet)' : ''}
                  </option>
                ))}
              </select>*/}
                  {/* Because selectedNetwork is in this form: ChainId-${chainId}, we use the split to retrieve the chainId */}
                  <Select
                    defaultValue={
                      availableNetworks
                        .find((n) => n.id === selectedNetwork?.split('-')[1])
                        ?.chainId.toString() || ''
                    }
                    onValueChange={handleNetworkValueChange}
                  >
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue placeholder="Select Network" />
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
                      Current Gas Price: {parseFloat(gasPrice).toFixed(6)} Gwei
                    </div>
                  )}
                </div>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-2" disabled={!account}>
          <AccordionTrigger>Verification Settings</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-4 text-balance">
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
                <p className="text-xs text-muted-foreground">
                  No API keys configured. Add API keys below to enable contract verification.
                </p>
              )}

              {/* Add New API Key */}
              <div className="space-y-3 pt-2">
                <h5 className="text-xs font-medium text-foreground">Add New API Key</h5>

                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Block Explorer</label>
                  <Select value={selectedExplorer} onValueChange={handleExplorerChange}>
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue placeholder="Select Block Explorer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Ethereum</SelectLabel>
                        <SelectItem value="etherscan">Etherscan (Mainnet)</SelectItem>
                        <SelectItem value="goerli.etherscan">Etherscan (Goerli)</SelectItem>
                        <SelectItem value="sepolia.etherscan">Etherscan (Sepolia)</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Polygon</SelectLabel>
                        <SelectItem value="polygonscan">Polygonscan (Mainnet)</SelectItem>
                        <SelectItem value="mumbai.polygonscan">Polygonscan (Mumbai)</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Other Networks</SelectLabel>
                        <SelectItem value="bscscan">BSCScan (BNB Chain)</SelectItem>
                        <SelectItem value="arbiscan">Arbiscan (Arbitrum)</SelectItem>
                        <SelectItem value="optimistic.etherscan">Optimistic Etherscan</SelectItem>
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
      </Accordion>

      <div className="p-3 space-y-6">

        {/* Contract Deployment */}
        {account && (
          <div className="space-y-4">
            <Separator />
            <h3 className="text-sm font-medium text-foreground">Contract Deployment</h3>

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
          </div>
        )}

        {/* Deployed Contracts */}
        {account && deployedContractsForNetwork.length > 0 && (
          <div className="space-y-4">
            <Separator />
            <h3 className="text-sm font-medium text-foreground">Deployed Contracts</h3>

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
                      <div className="mt-2">
                        <Button
                          onClick={() => handleVerifyContract(selectedDeployedContractData.address)}
                          size="sm"
                          className="text-xs"
                          disabled={isVerifying}
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
                      <div className="text-xs font-medium text-muted-foreground mb-1">Result:</div>
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
          </div>
        )}
      </div>
    </div>
  );
};

export default DeploymentPanel;
