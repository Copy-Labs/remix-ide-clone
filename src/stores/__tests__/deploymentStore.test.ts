import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useDeploymentStore } from '../deploymentStore';
import { web3Service } from '@/services/web3Service';
import toast from 'react-hot-toast';

// Mock dependencies
vi.mock('@/services/web3Service');
vi.mock('react-hot-toast');
vi.mock('@/services/loggerService', () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
}));

// Mock data
const mockCompiledContract = {
  name: 'TestContract',
  abi: [
    {
      type: 'constructor',
      inputs: [{ name: 'initialValue', type: 'uint256' }]
    },
    {
      type: 'function',
      name: 'getValue',
      inputs: [],
      outputs: [{ type: 'uint256' }],
      stateMutability: 'view'
    }
  ],
  bytecode: '0x608060405234801561001057600080fd5b50...'
};

const mockNetwork = {
  id: 'ethereum-mainnet',
  name: 'Ethereum Mainnet',
  chainId: 1,
  rpcUrl: 'https://mainnet.infura.io/v3/...',
  symbol: 'ETH',
  isTestnet: false
};

const mockDeployedContract = {
  address: '0x1234567890123456789012345678901234567890',
  name: 'TestContract',
  abi: mockCompiledContract.abi,
  deployedAt: Date.now(),
  networkId: 'ethereum-mainnet'
};

describe('DeploymentStore', () => {
  let store: ReturnType<typeof useDeploymentStore>;

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();

    // Reset mocks
    vi.clearAllMocks();

    // Mock web3Service methods
    vi.mocked(web3Service.connect).mockResolvedValue(true);
    vi.mocked(web3Service.disconnect).mockImplementation(() => {});
    vi.mocked(web3Service.switchNetwork).mockResolvedValue(true);
    vi.mocked(web3Service.addNetwork).mockResolvedValue(true);
    vi.mocked(web3Service.deployContract).mockResolvedValue({
      options: { address: '0x1234567890123456789012345678901234567890' }
    } as any);
    vi.mocked(web3Service.callContractMethod).mockResolvedValue('42');
    vi.mocked(web3Service.isWalletConnected).mockReturnValue(true);
    vi.mocked(web3Service.getAccount).mockReturnValue('0x1234567890123456789012345678901234567890');
    vi.mocked(web3Service.getBalance).mockResolvedValue('1.5');
    vi.mocked(web3Service.getGasPrice).mockResolvedValue('20');
    vi.mocked(web3Service.getNetwork).mockReturnValue(mockNetwork);
    vi.mocked(web3Service.getAvailableNetworks).mockReturnValue([mockNetwork]);
    vi.mocked(web3Service.estimateGas).mockResolvedValue(21000);

    // Mock toast
    vi.mocked(toast.success).mockImplementation(() => 'toast-id');
    vi.mocked(toast.error).mockImplementation(() => 'toast-id');

    // Get fresh store instance
    store = useDeploymentStore.getState();
  });

  afterEach(() => {
    // Reset store state
    useDeploymentStore.setState({
      account: null,
      balance: null,
      gasPrice: null,
      gasLimit: '3000000',
      isDeploying: false,
      selectedNetwork: 'ethereum-mainnet',
      availableNetworks: [],
      deployedContracts: new Map()
    });
  });

  describe('Wallet Connection', () => {
    it('should connect wallet successfully', async () => {
      await store.connectWallet('metamask');

      expect(web3Service.connect).toHaveBeenCalledWith('metamask');
      expect(store.account).toBe('0x1234567890123456789012345678901234567890');
      expect(store.balance).toBe('1.5');
      expect(store.gasPrice).toBe('20');
    });

    it('should handle wallet connection failure', async () => {
      vi.mocked(web3Service.connect).mockRejectedValue(new Error('Connection failed'));

      await store.connectWallet('metamask');

      expect(toast.error).toHaveBeenCalled();
    });

    it('should disconnect wallet', () => {
      // Set initial connected state
      useDeploymentStore.setState({
        account: '0x1234567890123456789012345678901234567890',
        balance: '1.5',
        gasPrice: '20'
      });

      store.disconnectWallet();

      expect(web3Service.disconnect).toHaveBeenCalled();
      expect(store.account).toBeNull();
      expect(store.balance).toBeNull();
      expect(store.gasPrice).toBeNull();
    });
  });

  describe('Network Management', () => {
    it('should switch network successfully', async () => {
      const success = await store.switchNetwork(5);

      expect(web3Service.switchNetwork).toHaveBeenCalledWith(5);
      expect(success).toBe(true);
      expect(toast.success).toHaveBeenCalledWith(`Switched to ${mockNetwork.name}`);
    });

    it('should handle network switch failure', async () => {
      vi.mocked(web3Service.switchNetwork).mockRejectedValue(new Error('Switch failed'));

      const success = await store.switchNetwork(5);

      expect(success).toBe(false);
      expect(toast.error).toHaveBeenCalled();
    });

    it('should add network successfully', async () => {
      const newNetwork = {
        id: 'polygon-mainnet',
        name: 'Polygon Mainnet',
        chainId: 137,
        rpcUrl: 'https://polygon-rpc.com',
        symbol: 'MATIC',
        isTestnet: false
      };

      const success = await store.addNetwork(newNetwork);

      expect(web3Service.addNetwork).toHaveBeenCalledWith(newNetwork);
      expect(success).toBe(true);
      expect(toast.success).toHaveBeenCalledWith(`Added and switched to ${newNetwork.name}`);
    });
  });

  describe('Contract Deployment', () => {
    beforeEach(() => {
      // Set wallet as connected
      useDeploymentStore.setState({
        account: '0x1234567890123456789012345678901234567890'
      });
    });

    it('should deploy contract successfully', async () => {
      const args = [100];
      const options = { gas: 3000000 };

      const result = await store.deployContract(mockCompiledContract, args, options);

      expect(web3Service.deployContract).toHaveBeenCalledWith(
        mockCompiledContract.abi,
        mockCompiledContract.bytecode,
        args,
        options
      );
      expect(result).toBeDefined();
      expect(store.deployedContracts.size).toBe(1);
      expect(toast.success).toHaveBeenCalledWith('Contract deployed successfully!');
    });

    it('should handle deployment failure', async () => {
      vi.mocked(web3Service.deployContract).mockRejectedValue(new Error('Deployment failed'));

      const result = await store.deployContract(mockCompiledContract, [], {});

      expect(result).toBeNull();
      expect(toast.error).toHaveBeenCalledWith('Failed to deploy contract');
    });

    it('should not deploy when wallet is not connected', async () => {
      useDeploymentStore.setState({ account: null });
      vi.mocked(web3Service.isWalletConnected).mockReturnValue(false);

      const result = await store.deployContract(mockCompiledContract, [], {});

      expect(result).toBeNull();
      expect(toast.error).toHaveBeenCalledWith('Please connect your wallet first');
      expect(web3Service.deployContract).not.toHaveBeenCalled();
    });

    it('should set deploying state during deployment', async () => {
      let deployingState = false;

      // Mock a slow deployment
      vi.mocked(web3Service.deployContract).mockImplementation(async () => {
        deployingState = store.isDeploying;
        return { options: { address: '0x1234567890123456789012345678901234567890' } } as any;
      });

      await store.deployContract(mockCompiledContract, [], {});

      expect(deployingState).toBe(true);
      expect(store.isDeploying).toBe(false);
    });
  });

  describe('Contract Interaction', () => {
    beforeEach(() => {
      // Set wallet as connected and add a deployed contract
      useDeploymentStore.setState({
        account: '0x1234567890123456789012345678901234567890',
        deployedContracts: new Map([
          ['0x1234567890123456789012345678901234567890', mockDeployedContract]
        ])
      });
    });

    it('should call contract method successfully', async () => {
      const result = await store.callContractMethod(
        '0x1234567890123456789012345678901234567890',
        'getValue',
        [],
        {}
      );

      expect(web3Service.callContractMethod).toHaveBeenCalledWith(
        '0x1234567890123456789012345678901234567890',
        mockDeployedContract.abi,
        'getValue',
        [],
        {}
      );
      expect(result).toBe('42');
    });

    it('should handle method call failure', async () => {
      vi.mocked(web3Service.callContractMethod).mockRejectedValue(new Error('Call failed'));

      const result = await store.callContractMethod(
        '0x1234567890123456789012345678901234567890',
        'getValue',
        [],
        {}
      );

      expect(result).toBeNull();
      expect(toast.error).toHaveBeenCalledWith('Failed to call method getValue');
    });

    it('should not call method when wallet is not connected', async () => {
      useDeploymentStore.setState({ account: null });
      vi.mocked(web3Service.isWalletConnected).mockReturnValue(false);

      const result = await store.callContractMethod(
        '0x1234567890123456789012345678901234567890',
        'getValue',
        [],
        {}
      );

      expect(result).toBeNull();
      expect(toast.error).toHaveBeenCalledWith('Please connect your wallet first');
      expect(web3Service.callContractMethod).not.toHaveBeenCalled();
    });

    it('should not call method for non-existent contract', async () => {
      const result = await store.callContractMethod(
        '0x9999999999999999999999999999999999999999',
        'getValue',
        [],
        {}
      );

      expect(result).toBeNull();
      expect(toast.error).toHaveBeenCalledWith('Contract not found');
      expect(web3Service.callContractMethod).not.toHaveBeenCalled();
    });
  });

  describe('Contract Management', () => {
    beforeEach(() => {
      useDeploymentStore.setState({
        deployedContracts: new Map([
          ['0x1234567890123456789012345678901234567890', mockDeployedContract]
        ])
      });
    });

    it('should get deployed contract by address', () => {
      const contract = store.getDeployedContract('0x1234567890123456789012345678901234567890');
      expect(contract).toEqual(mockDeployedContract);
    });

    it('should return null for non-existent contract', () => {
      const contract = store.getDeployedContract('0x9999999999999999999999999999999999999999');
      expect(contract).toBeNull();
    });

    it('should get deployed contracts by network', () => {
      const contracts = store.getDeployedContractsByNetwork('ethereum-mainnet');
      expect(contracts).toHaveLength(1);
      expect(contracts[0]).toEqual(mockDeployedContract);
    });

    it('should return empty array for network with no contracts', () => {
      const contracts = store.getDeployedContractsByNetwork('polygon-mainnet');
      expect(contracts).toHaveLength(0);
    });

    it('should clear all deployed contracts', () => {
      store.clearDeployedContracts();
      expect(store.deployedContracts.size).toBe(0);
    });

    it('should remove specific deployed contract', () => {
      store.removeDeployedContract('0x1234567890123456789012345678901234567890');
      expect(store.deployedContracts.size).toBe(0);
    });
  });

  describe('Account Management', () => {
    it('should update account info successfully', async () => {
      await store.updateAccountInfo();

      expect(web3Service.getAccount).toHaveBeenCalled();
      expect(web3Service.getBalance).toHaveBeenCalled();
      expect(web3Service.getGasPrice).toHaveBeenCalled();
      expect(store.account).toBe('0x1234567890123456789012345678901234567890');
      expect(store.balance).toBe('1.5');
      expect(store.gasPrice).toBe('20');
    });

    it('should handle account info update failure', async () => {
      vi.mocked(web3Service.getBalance).mockRejectedValue(new Error('Failed to get balance'));

      await store.updateAccountInfo();

      expect(toast.error).toHaveBeenCalled();
    });

    it('should not update account info when wallet is not connected', async () => {
      vi.mocked(web3Service.isWalletConnected).mockReturnValue(false);

      await store.updateAccountInfo();

      expect(web3Service.getAccount).not.toHaveBeenCalled();
      expect(web3Service.getBalance).not.toHaveBeenCalled();
    });
  });

  describe('Gas Estimation', () => {
    it('should estimate gas successfully', async () => {
      const tx = { to: '0x1234567890123456789012345678901234567890', data: '0x' };
      const gasEstimate = await store.estimateGas(tx);

      expect(web3Service.estimateGas).toHaveBeenCalledWith(tx);
      expect(gasEstimate).toBe(21000);
    });

    it('should handle gas estimation failure', async () => {
      vi.mocked(web3Service.estimateGas).mockRejectedValue(new Error('Estimation failed'));

      const tx = { to: '0x1234567890123456789012345678901234567890', data: '0x' };
      const gasEstimate = await store.estimateGas(tx);

      expect(gasEstimate).toBeNull();
    });
  });

  describe('Wallet Synchronization', () => {
    it('should sync with wallet successfully', async () => {
      await store.syncWithWallet();

      expect(web3Service.getNetwork).toHaveBeenCalled();
      expect(web3Service.getAvailableNetworks).toHaveBeenCalled();
      expect(store.selectedNetwork).toBe(mockNetwork.id);
      expect(store.availableNetworks).toEqual([mockNetwork]);
    });

    it('should handle sync failure', async () => {
      vi.mocked(web3Service.getNetwork).mockImplementation(() => {
        throw new Error('Sync failed');
      });

      await store.syncWithWallet();

      expect(toast.error).toHaveBeenCalled();
    });
  });
});
