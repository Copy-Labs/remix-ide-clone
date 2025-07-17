import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { DeploymentState, DeployedContract, Network, CompiledContract } from '@/types';
import { web3Service } from '@/services/web3Service';
import { debug, info, warn, error } from '@/services/loggerService';
import toast from 'react-hot-toast';

interface DeploymentStoreActions {
  // Connection actions
  connectWallet: (providerType?: 'metamask' | 'walletconnect') => Promise<boolean>;
  disconnectWallet: () => void;

  // Network actions
  switchNetwork: (chainId: number) => Promise<boolean>;
  addNetwork: (network: Network) => Promise<boolean>;

  // Deployment actions
  deployContract: (contract: CompiledContract, args: any[], options?: any) => Promise<DeployedContract | null>;
  clearDeployedContracts: () => void;
  removeDeployedContract: (address: string) => void;

  // Contract interaction
  callContractMethod: (
    contractAddress: string,
    method: string,
    args: any[],
    options?: any
  ) => Promise<any>;

  // Utility functions
  getDeployedContract: (address: string) => DeployedContract | null;
  getDeployedContractsByNetwork: (networkId: string) => DeployedContract[];
  updateAccountInfo: () => Promise<void>;
  estimateGas: (tx: any) => Promise<number>;

  // State synchronization
  syncWithWallet: () => Promise<void>;
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
  gasLimit: '3000000',
};

export const useDeploymentStore = create<DeploymentStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        connectWallet: async (providerType = 'metamask') => {
          try {
            const connected = await web3Service.connect(providerType);

            if (connected) {
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

          set((state) => {
            state.account = null;
            state.balance = null;
            state.gasPrice = null;
          });

          toast('Wallet disconnected');
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

            // Show toast notification
            const deployToast = toast.loading('Deploying contract...');

            // Set gas limit if not provided
            if (!options.gas && !options.gasLimit) {
              options.gas = parseInt(get().gasLimit);
            }

            // Deploy the contract
            const result = await web3Service.deployContract(
              contract.abi,
              contract.bytecode,
              args,
              options
            );

            if (!result) {
              toast.error('Failed to deploy contract', { id: deployToast });
              set((state) => {
                state.isDeploying = false;
              });
              return null;
            }

            // Get current timestamp
            const deployedAt = Date.now();

            // Get current network
            const network = web3Service.getNetwork();

            if (!network) {
              toast.error('Network information not available', { id: deployToast });
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
            };

            // Add to deployed contracts
            set((state) => {
              state.deployedContracts.set(result.address, deployedContract);
              state.isDeploying = false;
            });

            // Show success notification
            toast.success(`Contract deployed at ${result.address}`, { id: deployToast });

            return deployedContract;
          } catch (err) {
            error('DeploymentStore', 'Failed to deploy contract', err);
            toast.error('Failed to deploy contract');

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

          toast('Cleared deployed contracts');
        },

        removeDeployedContract: (address: string) => {
          set((state) => {
            state.deployedContracts.delete(address);
          });

          toast(`Removed contract at ${address}`);
        },

        callContractMethod: async (
          contractAddress: string,
          method: string,
          args: any[] = [],
          options: any = {}
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

            // Show toast notification for write operations
            const methodAbi = deployedContract.abi.find(item => item.name === method);
            const isReadOperation = methodAbi?.stateMutability === 'view' || methodAbi?.stateMutability === 'pure';

            let toastId;
            if (!isReadOperation) {
              toastId = toast.loading(`Calling ${method}...`);
            }

            // Call the contract method
            const result = await web3Service.callContractMethod(
              contractAddress,
              deployedContract.abi,
              method,
              args,
              options
            );

            // Update toast notification
            if (!isReadOperation && toastId) {
              if (result) {
                toast.success(`${method} called successfully`, { id: toastId });
              } else {
                toast.error(`Failed to call ${method}`, { id: toastId });
              }
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
          return contracts.filter(contract => contract.network === networkId);
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

            set((state) => {
              state.account = account;
              state.balance = balance;
              state.gasPrice = gasPrice;
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

            set((state) => {
              if (network) {
                state.selectedNetwork = network.id;
              }
              state.availableNetworks = availableNetworks;
            });

            debug('DeploymentStore', 'Synced with wallet', {
              account: get().account,
              network: network?.name,
              balance: get().balance
            });
          } catch (err) {
            error('DeploymentStore', 'Failed to sync with wallet', err);
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

          return mergedState;
        },
        version: 1, // Add version for future migrations
        onRehydrateStorage: () => (state) => {
          // Log when state is rehydrated from storage
          debug('DeploymentStore', 'Deployment store state rehydrated from localStorage');

          // Sync with wallet if available
          if (state) {
            setTimeout(() => {
              state.syncWithWallet();
            }, 1000);
          }
        },
      }
    ),
    {
      name: 'deployment-store',
    }
  )
);

// Set up event listeners for wallet events
if (typeof window !== 'undefined') {
  web3Service.on('connected', async () => {
    await useDeploymentStore.getState().syncWithWallet();
  });

  web3Service.on('disconnected', () => {
    useDeploymentStore.getState().disconnectWallet();
  });

  web3Service.on('accountChanged', async () => {
    await useDeploymentStore.getState().updateAccountInfo();
  });

  web3Service.on('networkChanged', async () => {
    await useDeploymentStore.getState().syncWithWallet();
  });
}

// Initialize the store
(async () => {
  // Check if wallet is already connected (e.g., MetaMask auto-connects)
  if (typeof window !== 'undefined' && window.ethereum && window.ethereum.isConnected && window.ethereum.selectedAddress) {
    try {
      await web3Service.connect();
    } catch (err) {
      // Ignore errors during initialization
    }
  }
})();
