import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';
import type { CompiledContract, DeployedContract, DeploymentState, Network, LocalVMAccount } from '@/types';
import { web3Service } from '@/services/web3Service';
import { javascriptVMService } from '@/services/javascriptVMService';
import { debug, error, info } from '@/services/loggerService';
import { verificationService } from '@/services/verificationService';
import { useCompilerStore } from '@/stores/compilerStore';
import { toast } from 'sonner';

interface DeploymentStoreActions {
  // Connection actions
  connectWallet: (providerType?: 'metamask' | 'walletconnect' | 'javascriptvm') => Promise<boolean>;
  disconnectWallet: () => void;

  // Persistence actions
  persistConnection: (provider: 'metamask' | 'walletconnect' | 'javascriptvm') => void;
  getPersistedConnection: () => 'metamask' | 'walletconnect' | 'javascriptvm' | null;
  clearPersistedConnection: () => void;

  // Network actions
  switchNetwork: (chainId: number) => Promise<boolean>;
  addNetwork: (network: Network) => Promise<boolean>;

  // Deployment actions
  deployContract: (
    contract: CompiledContract,
    args: any[],
    options?: any,
  ) => Promise<DeployedContract | null>;
  clearDeployedContracts: () => void;
  removeDeployedContract: (address: string) => void;

  // Contract interaction
  callContractMethod: (
    contractAddress: string,
    method: string,
    args: any[],
    options?: any,
  ) => Promise<any>;

  // Verification actions
  verifyContract: (contractAddress: string) => Promise<boolean>;

  // Utility functions
  getDeployedContract: (address: string) => DeployedContract | null;
  getDeployedContractsByNetwork: (networkId: string) => DeployedContract[];
  updateAccountInfo: () => Promise<void>;
  estimateGas: (tx: any) => Promise<number>;

  // Auto-verify settings
  setAutoVerify: (autoVerify: boolean) => void;

  // State synchronization
  syncWithWallet: () => Promise<void>;
  syncProviderAndVMAccount: () => Promise<void>;
}

type DeploymentStore = DeploymentState & DeploymentStoreActions;

const initialState: DeploymentState = {
  deployedContracts: new Map(),
  isDeploying: false,
  selectedNetwork: 'localhost',
  availableNetworks: [],
  account: null,
  balance: null,
  gasPrice: null,
  ethPrice: null,
  gasLimit: '3000000',
  autoVerify: true,
  // Centralized provider and VM account state
  currentProvider: null,
  vmAccount: null,
};

export const useDeploymentStore = create<DeploymentStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        connectWallet: async (providerType: 'metamask' | 'walletconnect' | 'javascriptvm' = 'metamask') => {
          try {
            const connected = await web3Service.connect(providerType);

            if (connected) {
              // Persist the connection type
              get().persistConnection(providerType);
              await get().syncWithWallet();
              toast.success('Wallet connected successfully');
              return true;
            } else {
              toast.error('Failed to connect wallet');
              return false;
            }
          } catch (err) {
            error('DeploymentStore', 'Failed to connect wallet', err);
            toast.error('Failed to connect wallet');
            return false;
          }
        },

        disconnectWallet: () => {
          web3Service.disconnect();

          // Clear persisted connection
          get().clearPersistedConnection();

          set((state) => {
            state.account = null;
            state.balance = null;
            state.gasPrice = null;
            state.ethPrice = null;
          });

          toast.info('Wallet disconnected');
        },

        switchNetwork: async (chainId: number) => {
          try {
            const success = await web3Service.switchNetwork(chainId);

            if (success) {
              await get().syncWithWallet();
              toast.success(`Switched to ${web3Service.getNetwork()?.name}`);
              return true;
            } else {
              toast.error('Failed to switch network');
              return false;
            }
          } catch (err) {
            error('DeploymentStore', 'Failed to switch network', err);
            toast.error('Failed to switch network');
            return false;
          }
        },

        addNetwork: async (network: Network) => {
          try {
            const success = await web3Service.addNetwork(network);

            if (success) {
              await get().syncWithWallet();
              toast.success(`Added network: ${network.name}`);
              return true;
            } else {
              toast.error('Failed to add network');
              return false;
            }
          } catch (err) {
            error('DeploymentStore', 'Failed to add network', err);
            toast.error('Failed to add network');
            return false;
          }
        },

        deployContract: async (contract: CompiledContract, args: any[] = [], options: any = {}) => {
          try {
            if (!web3Service.isWalletConnected()) {
              toast.error('Please connect your wallet first');
              return null;
            }

            set((state) => {
              state.isDeploying = true;
            });

            // Set gas limit if not provided
            if (!options.gas && !options.gasLimit) {
              options.gas = parseInt(get().gasLimit);
            }

            // Show a toast indicating that the deployment process is starting
            const toastId = toast.loading(
              'Preparing to deploy contract. Please confirm the transaction in your wallet...',
            );

            try {
              // Deploy the contract
              // Note: This will wait for the user to confirm the transaction in their wallet
              const result = await web3Service.deployContract(
                contract.abi,
                contract.bytecode,
                args,
                options,
              );

              if (!result) {
                toast.error('Failed to deploy contract', { id: toastId });
                set((state) => {
                  state.isDeploying = false;
                });
                return null;
              }

              // Show success toast
              toast.success(`Contract deployed at ${result.address}`, { id: toastId });

              // Get current timestamp
              const deployedAt = Date.now();

              // Get current network
              const network = web3Service.getNetwork();

              if (!network) {
                toast.error('Network information not available', { id: toastId });
                set((state) => {
                  state.isDeploying = false;
                });
                return null;
              }

              // Create deployed contract object
              const deployedContract: DeployedContract = {
                name: contract.name,
                address: result.address,
                abi: contract.abi,
                bytecode: contract.bytecode,
                network: network.id,
                deployedAt,
                transactionHash: result.transactionHash,
                deploymentCost: '0', // Will be updated when tx receipt is available
                constructorArgs: args,
                // Pass-through optional libraries mapping if provided in options
                libraries: options?.libraries,
                shouldVerify: get().autoVerify,
                verified: false,
                metadata: contract.metadata, // Store metadata for later verification
              };

              // Add to deployed contracts
              set((state) => {
                state.deployedContracts.set(result.address, deployedContract);
                state.isDeploying = false;
              });

              // Auto-verify contract if enabled
              if (deployedContract.shouldVerify && result.address) {
                // We'll return the deployed contract first and let the verification happen separately
                // This ensures the deployment completes before verification starts
                toast.info(
                  'Contract deployed successfully. Waiting for blockchain confirmation before verification...',
                );

                // Start a background process to wait for the contract to be confirmed on the blockchain
                // before attempting verification
                await (async () => {
                  try {
                    // Wait for the contract to be confirmed on the blockchain
                    const contractConfirmed = await web3Service.waitForContract(
                      result.address,
                      15,
                      2000,
                    );

                    if (contractConfirmed) {
                      // Contract is confirmed, proceed with verification
                      toast.info(
                        'Contract confirmed on blockchain. Starting verification process...',
                      );
                      // Skip the existence check since we've already confirmed the contract exists
                      await get().verifyContract(result.address);
                    } else {
                      // Contract not confirmed after multiple attempts
                      toast.error(
                        'Contract not confirmed on blockchain after multiple attempts. Verification skipped.',
                      );
                      error(
                        'DeploymentStore',
                        `Contract not confirmed on blockchain at ${result.address}. Verification skipped.`,
                      );
                    }
                  } catch (err) {
                    toast.error(
                      `Error waiting for contract confirmation: ${err instanceof Error ? err.message : 'Unknown error'}`,
                    );
                    error('DeploymentStore', 'Error waiting for contract confirmation', err);
                  }
                })();
              }

              return deployedContract;
            } catch (err) {
              error('DeploymentStore', 'Failed to deploy contract', err);
              toast.error(
                `Failed to deploy contract: ${err instanceof Error ? err.message : 'Unknown error'}`,
                { id: toastId },
              );

              set((state) => {
                state.isDeploying = false;
              });

              return null;
            }
          } catch (outerErr) {
            error('DeploymentStore', 'Unexpected error in deployContract', outerErr);
            toast.error('Unexpected error occurred during contract deployment');

            set((state) => {
              state.isDeploying = false;
            });

            return null;
          }
        },

        clearDeployedContracts: () => {
          set((state) => {
            state.deployedContracts.clear();
          });

          toast.info('Cleared deployed contracts');
        },

        removeDeployedContract: (address: string) => {
          set((state) => {
            state.deployedContracts.delete(address);
          });

          toast.info(`Removed contract at ${address}`);
        },

        callContractMethod: async (
          contractAddress: string,
          method: string,
          args: any[] = [],
          options: any = {},
        ) => {
          try {
            if (!web3Service.isWalletConnected()) {
              toast.error('Please connect your wallet first');
              return null;
            }

            const deployedContract = get().getDeployedContract(contractAddress);

            if (!deployedContract) {
              toast.error('Contract not found');
              return null;
            }

            // Get method info
            const methodAbi = deployedContract.abi.find((item) => item.name === method);
            const isReadOperation =
              methodAbi?.stateMutability === 'view' || methodAbi?.stateMutability === 'pure';

            // Call the contract method
            let result;
            if (isReadOperation) {
              // For read operations, don't show a toast
              result = await web3Service.callContractMethod(
                contractAddress,
                deployedContract.abi,
                method,
                args,
                options,
              );
            } else {
              // For write operations, use toast.promise
              result = toast.promise(
                web3Service.callContractMethod(
                  contractAddress,
                  deployedContract.abi,
                  method,
                  args,
                  options,
                ),
                {
                  loading: `Calling ${method}...`,
                  success: (result) =>
                    result ? `${method} called successfully` : `Failed to call ${method}`,
                  error: `Failed to call ${method}`,
                },
              );
            }

            return result;
          } catch (err) {
            error('DeploymentStore', `Failed to call contract method ${method}`, err);
            toast.error(`Failed to call ${method}`);
            return null;
          }
        },

        getDeployedContract: (address: string) => {
          return get().deployedContracts.get(address) || null;
        },

        getDeployedContractsByNetwork: (networkId: string) => {
          const contracts = Array.from(get().deployedContracts.values());
          return contracts.filter((contract) => contract.network === networkId);
        },

        updateAccountInfo: async () => {
          try {
            if (!web3Service.isWalletConnected()) {
              return;
            }

            // Get account
            const account = web3Service.getAccount();

            // Get balance
            const balance = await web3Service.getBalance();

            // Get gas price
            const gasPrice = await web3Service.getGasPrice();

            // Get ETH price in USD
            let ethPrice = null;
            try {
              const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
              const data = await response.json();
              ethPrice = data.ethereum?.usd || null;
            } catch (ethPriceErr) {
              debug('DeploymentStore', 'Failed to fetch ETH price', ethPriceErr);
            }

            set((state) => {
              state.account = account;
              state.balance = balance;
              state.gasPrice = gasPrice;
              state.ethPrice = ethPrice;
            });
          } catch (err) {
            error('DeploymentStore', 'Failed to update account info', err);
          }
        },

        estimateGas: async (tx: any) => {
          try {
            return await web3Service.estimateGas(tx);
          } catch (err) {
            error('DeploymentStore', 'Failed to estimate gas', err);
            return 0;
          }
        },

        syncWithWallet: async () => {
          try {
            // Get network information
            const network = web3Service.getNetwork();
            const availableNetworks = web3Service.getAvailableNetworks();

            // Update account info
            await get().updateAccountInfo();

            // Sync provider and VM account info
            await get().syncProviderAndVMAccount();

            set((state) => {
              if (network) {
                state.selectedNetwork = network.id;
              }
              state.availableNetworks = availableNetworks;
            });

            debug('DeploymentStore', 'Synced with wallet', {
              account: get().account,
              network: network?.name,
              balance: get().balance,
              provider: get().currentProvider,
            });
          } catch (err) {
            error('DeploymentStore', 'Failed to sync with wallet', err);
          }
        },

        syncProviderAndVMAccount: async () => {
          try {
            // Get current provider from Web3Service
            const currentProvider = web3Service.getWalletProvider();

            // Get VM account if provider is JavaScript VM
            let vmAccount: LocalVMAccount | null = null;
            if (currentProvider === 'javascriptvm') {
              try {
                vmAccount = javascriptVMService.getSelectedAccount();
              } catch (err) {
                debug('DeploymentStore', 'Failed to get VM account', err);
              }
            }

            set((state) => {
              state.currentProvider = currentProvider;
              state.vmAccount = vmAccount;
            });

            debug('DeploymentStore', 'Synced provider and VM account', {
              provider: currentProvider,
              vmAccount: vmAccount?.name || null,
            });
          } catch (err) {
            error('DeploymentStore', 'Failed to sync provider and VM account', err);
          }
        },

        setAutoVerify: (autoVerify: boolean) => {
          set((state) => {
            state.autoVerify = autoVerify;
          });

          debug('DeploymentStore', 'Auto-verify setting updated', { autoVerify });
        },

        persistConnection: (provider: 'metamask' | 'walletconnect' | 'javascriptvm') => {
          try {
            localStorage.setItem('remix-ide-wallet-provider', provider);
            debug('DeploymentStore', `Persisted wallet provider: ${provider}`);
          } catch (err) {
            error('DeploymentStore', 'Failed to persist wallet provider', err);
          }
        },

        getPersistedConnection: () => {
          try {
            const persisted = localStorage.getItem('remix-ide-wallet-provider');
            if (persisted && ['metamask', 'walletconnect', 'javascriptvm'].includes(persisted)) {
              debug('DeploymentStore', `Retrieved persisted wallet provider: ${persisted}`);
              return persisted as 'metamask' | 'walletconnect' | 'javascriptvm';
            }
          } catch (err) {
            error('DeploymentStore', 'Failed to retrieve persisted wallet provider', err);
          }
          return null;
        },

        clearPersistedConnection: () => {
          try {
            localStorage.removeItem('remix-ide-wallet-provider');
            debug('DeploymentStore', 'Cleared persisted wallet provider');
          } catch (err) {
            error('DeploymentStore', 'Failed to clear persisted wallet provider', err);
          }
        },

        verifyContract: async (contractAddress: string, skipExistenceCheck = false) => {
          try {
            // First check if the contract address is valid
            if (!contractAddress || !contractAddress.startsWith('0x')) {
              const errorMsg = `Missing or invalid contractAddress (should start with 0x): ${contractAddress}`;
              error('DeploymentStore', errorMsg);
              toast.error(`Verification failed: ${errorMsg}`);
              return false;
            }

            // Check if the contract exists in our store
            const deployedContract = get().getDeployedContract(contractAddress);
            if (!deployedContract) {
              error(
                'DeploymentStore',
                `Contract not found in deployment store: ${contractAddress}`,
              );
              toast.error('Verification failed: Contract not found in deployment store');
              return false;
            }

            // Get network information
            const network = web3Service.getNetwork();
            if (!network) {
              error('DeploymentStore', 'Network information not available');
              toast.error('Verification failed: Network information not available');
              return false;
            }

            // Check if the contract exists on the blockchain (skip if called after waitForContract)
            if (!skipExistenceCheck) {
              const contractExists = await web3Service.contractExists(contractAddress);
              if (!contractExists) {
                const errorMsg = `Contract not found on blockchain at address ${contractAddress}`;
                error('DeploymentStore', errorMsg);
                toast.error(`Verification failed: ${errorMsg}`);
                return false;
              }
            }

            info(
              'DeploymentStore',
              `Verifying contract ${deployedContract.name} on ${network.id}...`,
            );

            // Check if network is supported for verification
            if (!verificationService.isNetworkSupported(network)) {
              toast.error(`Verification not supported for ${network.name}`);
              return false;
            }

            // Check if we have an API key for this network
            if (!verificationService.hasApiKey(network)) {
              toast.error(
                `API key not found for ${network.name}. Please add an API key in settings.`,
              );
              return false;
            }

            // Create a detailed verification toast
            const verificationToastId = toast.loading(
              `Verifying contract ${deployedContract.name} on ${network.name}... This may take a few moments.`,
            );

            // First check if the deployed contract has metadata
            let compiledContract: CompiledContract | null = null;

            if (deployedContract.metadata) {
              // Use the metadata from the deployed contract
              compiledContract = {
                name: deployedContract.name,
                bytecode: deployedContract.bytecode,
                deployedBytecode: '', // Not needed for verification
                abi: deployedContract.abi,
                metadata: deployedContract.metadata,
                devdoc: {}, // Not needed for verification
                userdoc: {}, // Not needed for verification
                storageLayout: {}, // Not needed for verification
                gasEstimates: {}, // Not needed for verification
                assembly: {}, // Not needed for verification
              };
            } else {
              // Fall back to the compiler store if metadata is not stored with the deployed contract
              const compilerStore = useCompilerStore.getState();
              compiledContract = compilerStore.getContractByName(deployedContract.name);

              if (!compiledContract) {
                const errorMsg = `Compiled contract data not found for ${deployedContract.name}`;
                error('DeploymentStore', errorMsg);
                toast.error(`Verification failed: ${errorMsg}. Please recompile the contract.`, {
                  id: verificationToastId,
                });
                return false;
              }
            }

            // Ensure we have metadata for verification
            if (!compiledContract.metadata) {
              const errorMsg = `Contract metadata not found for ${deployedContract.name}`;
              error('DeploymentStore', errorMsg);
              toast.error(`Verification failed: ${errorMsg}. Please recompile the contract.`, {
                id: verificationToastId,
              });
              return false;
            }

            console.log('DeploymentStore::', deployedContract, compiledContract);

            // Call the verification service
            const result = await verificationService.verifyContract(
              deployedContract,
              compiledContract,
            );
            console.log('DeploymentStore::Verification Result', result);

            // Update the toast based on the result
            if (result.success) {
              // Check if the contract was already verified
              if (result.message && result.message.toLowerCase().includes('already verified')) {
                toast.success(
                  `Contract ${deployedContract.name} is already verified! The code is publicly viewable on the block explorer.`,
                  { id: verificationToastId },
                );
              } else {
                toast.success(
                  `Contract ${deployedContract.name} verified successfully! The code is now publicly viewable on the block explorer.`,
                  { id: verificationToastId },
                );
              }
            } else {
              toast.error(`Verification failed: ${result.message}.`, { id: verificationToastId });
            }

            if (result.success) {
              // Update the deployed contract with verification info
              set((state) => {
                const contract = state.deployedContracts.get(contractAddress);
                if (contract) {
                  contract.verified = true;
                  if (result.url) {
                    contract.verificationUrl = result.url;
                  } else if (network.blockExplorer) {
                    contract.verificationUrl = `${network.blockExplorer}/address/${contractAddress}#code`;
                  }
                  state.deployedContracts.set(contractAddress, contract);
                }
              });

              info('DeploymentStore', `Contract ${deployedContract.name} verified successfully`);
              return true;
            } else {
              set((state) => {
                const contract = state.deployedContracts.get(contractAddress);
                if (contract) {
                  contract.verified = false;
                  state.deployedContracts.set(contractAddress, contract);
                }
              });

              error(
                'DeploymentStore',
                `Contract ${deployedContract.name} verification failed: ${result.message}`,
              );
              return false;
            }
          } catch (err) {
            error('DeploymentStore', 'Failed to verify contract', err);
            toast.error('Failed to verify contract');
            return false;
          }
        },
      })),
      {
        name: 'deployment-storage',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => {
          // Convert Map to array of entries for serialization
          const deployedContractsArray = Array.from(state.deployedContracts.entries());

          return {
            // Return serializable version of the state
            deployedContractsArray,
            selectedNetwork: state.selectedNetwork,
            gasLimit: state.gasLimit,
            autoVerify: state.autoVerify,
            // Persist provider and VM account state
            currentProvider: state.currentProvider,
            vmAccount: state.vmAccount,
          };
        },
        // Custom merge function to handle Map reconstruction
        merge: (persistedState: any, currentState) => {
          const mergedState = { ...currentState };

          if (persistedState.deployedContractsArray) {
            // Convert array back to Map
            mergedState.deployedContracts = new Map(persistedState.deployedContractsArray);
          }

          if (persistedState.selectedNetwork) {
            mergedState.selectedNetwork = persistedState.selectedNetwork;
          }

          if (persistedState.gasLimit) {
            mergedState.gasLimit = persistedState.gasLimit;
          }

          if (persistedState.autoVerify !== undefined) {
            mergedState.autoVerify = persistedState.autoVerify;
          }

          // Merge provider and VM account state
          if (persistedState.currentProvider !== undefined) {
            mergedState.currentProvider = persistedState.currentProvider;
          }

          if (persistedState.vmAccount !== undefined) {
            mergedState.vmAccount = persistedState.vmAccount;
          }

          return mergedState;
        },
        version: 1, // Add version for future migrations
        onRehydrateStorage: () => (state) => {
          // Log when state is rehydrated from storage
          debug('DeploymentStore', 'Deployment store state rehydrated from localStorage');

          // Sync with wallet if available
          if (state) {
            setTimeout(() => {
              void state.syncWithWallet();
            }, 1000);
          }
        },
      },
    ),
    {
      name: 'deployment-store',
    },
  ),
);

// Set up event listeners for wallet events
if (typeof window !== 'undefined') {
  web3Service.on('connected', async () => {
    const store = useDeploymentStore.getState();
    await store.syncWithWallet();
    await store.syncProviderAndVMAccount();
  });

  web3Service.on('disconnected', () => {
    // Update store state without calling disconnectWallet to avoid infinite loop
    useDeploymentStore.setState((state) => ({
      ...state,
      account: null,
      balance: null,
      gasPrice: null,
      ethPrice: null,
      currentProvider: null,
      vmAccount: null,
    }));
    toast.info('Wallet disconnected');
  });

  web3Service.on('accountChanged', async () => {
    const store = useDeploymentStore.getState();
    await store.updateAccountInfo();
    await store.syncProviderAndVMAccount();
  });

  web3Service.on('networkChanged', async () => {
    await useDeploymentStore.getState().syncWithWallet();
  });

  // Listen for JavaScript VM account changes
  javascriptVMService.on('accountChanged', async () => {
    await useDeploymentStore.getState().syncProviderAndVMAccount();
  });
}

// Initialize the store
await (async () => {
  // Try to restore persisted connection first
  const deploymentStore = useDeploymentStore.getState();
  const persistedProvider = deploymentStore.getPersistedConnection();

  if (persistedProvider) {
    debug('DeploymentStore', `Attempting to restore connection to ${persistedProvider}`);

    try {
      if (persistedProvider === 'javascriptvm') {
        // JavaScript VM can always be restored
        await web3Service.connect(persistedProvider);
        debug('DeploymentStore', 'Restored JavaScript VM connection');
      } else if (persistedProvider === 'metamask') {
        // Only connect to MetaMask if it's actually available
        if (typeof window !== 'undefined' && window.ethereum && window.ethereum.isConnected && window.ethereum.selectedAddress) {
          await web3Service.connect(persistedProvider);
          debug('DeploymentStore', 'Restored MetaMask connection');
        }
      } else if (persistedProvider === 'walletconnect') {
        // WalletConnect connection requires user interaction, so we don't auto-restore
        debug('DeploymentStore', 'Skipping WalletConnect restoration (requires user interaction)');
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      // If restoration fails, clear the persisted connection
      debug('DeploymentStore', 'Failed to restore connection, clearing persisted data');
      deploymentStore.clearPersistedConnection();
    }
  }

  // Fallback: Check if wallet is already connected (e.g., MetaMask auto-connects)
  else if (
    typeof window !== 'undefined' &&
    window.ethereum &&
    window.ethereum.isConnected &&
    window.ethereum.selectedAddress
  ) {
    try {
      await web3Service.connect();
      debug('DeploymentStore', 'Connected via MetaMask auto-detection');
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      // Ignore errors during initialization
    }
  }

  // Sync provider and VM account state after initialization
  await deploymentStore.syncProviderAndVMAccount();
})();
