import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { web3Service } from '@/services/web3Service';
import { vmProviderService } from '@/services/vmProviderService';
import Web3 from 'web3';

// Mock the web3Service
vi.mock('@/services/web3Service', () => {
  const originalModule = vi.importActual('@/services/web3Service');
  return {
    web3Service: {
      // Mock the methods we'll use in our tests
      connect: vi.fn(),
      disconnect: vi.fn(),
      deployContract: vi.fn(),
      callContractMethod: vi.fn(),
      isWalletConnected: vi.fn(),
      isUsingTestWallet: vi.fn(),
      getSelectedTestAccountIndex: vi.fn(),
      getAccount: vi.fn(),
    },
  };
});

// Mock the vmProviderService
vi.mock('@/services/vmProviderService', () => ({
  vmProviderService: {
    start: vi.fn(),
    stop: vi.fn(),
    getProvider: vi.fn(),
    getAccounts: vi.fn(),
  },
}));

// Mock the logger service
vi.mock('@/services/loggerService', () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

describe('Web3Service VM Contract Interaction', () => {
  // Simple storage contract bytecode (store/retrieve a uint256)
  const bytecode = '0x608060405234801561001057600080fd5b50610150806100206000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c80632e64cec11461003b5780636057361d14610059575b600080fd5b610043610075565b60405161005091906100d9565b60405180910390f35b610073600480360381019061006e919061009d565b61007e565b005b60008054905090565b8060008190555050565b60008135905061009781610103565b92915050565b6000602082840312156100b3576100b26100fe565b5b60006100c184828501610088565b91505092915050565b6100d3816100f4565b82525050565b60006020820190506100ee60008301846100ca565b92915050565b6000819050919050565b600080fd5b61010c816100f4565b811461011757600080fd5b5056fea2646970667358221220223b76b2a4b83584962b3155b370beb66a7a7d6869dd947e2a7c8a6b0ffa58d364736f6c63430008070033';

  // Contract ABI
  const abi = [
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
  ];

  // Mock Web3 instance and contract
  let mockWeb3: any;
  let mockContract: any;
  let mockDeployedContract: any;
  let mockAccounts: any[];

  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();

    // Mock accounts
    mockAccounts = [
      {
        address: '0x1234567890123456789012345678901234567890',
        privateKey: '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        balance: '100000000000000000000', // 100 ETH
      },
    ];

    // Mock VM provider
    vi.mocked(vmProviderService.start).mockResolvedValue(true);
    vi.mocked(vmProviderService.getAccounts).mockReturnValue(mockAccounts);

    // Mock Web3 provider
    const mockProvider = {};
    vi.mocked(vmProviderService.getProvider).mockReturnValue(mockProvider);

    // Set up web3Service mock return values
    vi.mocked(web3Service.connect).mockResolvedValue(true);
    vi.mocked(web3Service.isWalletConnected).mockReturnValue(true);
    vi.mocked(web3Service.isUsingTestWallet).mockReturnValue(true);
    vi.mocked(web3Service.getSelectedTestAccountIndex).mockReturnValue(0);
    vi.mocked(web3Service.getAccount).mockReturnValue(mockAccounts[0].address);

    // Mock deployContract to return a successful deployment
    vi.mocked(web3Service.deployContract).mockResolvedValue({
      address: '0xContractAddress',
      transactionHash: '0xTransactionHash',
    });

    // Mock callContractMethod to return different values based on the method
    vi.mocked(web3Service.callContractMethod).mockImplementation((address, abi, method, args) => {
      if (method === 'retrieve') {
        // For the retrieve method, return 0 initially, then 42 after store is called
        if (vi.mocked(web3Service.callContractMethod).mock.calls.some(call => call[2] === 'store')) {
          return Promise.resolve('42');
        }
        return Promise.resolve('0');
      } else if (method === 'store') {
        // For the store method, return a transaction receipt
        return Promise.resolve({
          transactionHash: '0xStoreTransactionHash',
        });
      }
      return Promise.resolve(null);
    });
  });

  afterEach(async () => {
    // Disconnect from web3Service if connected
    if (web3Service.isWalletConnected()) {
      await web3Service.disconnect();
    }

    // Stop VM provider
    await vmProviderService.stop();
  });

  describe('VM Account Connection', () => {
    it('should connect to a VM account successfully', async () => {
      // Connect to VM with the first test account (index 0)
      const connected = await web3Service.connect('vm', 0);

      // Verify connection was successful
      expect(connected).toBe(true);

      // Verify connect was called with the correct parameters
      expect(web3Service.connect).toHaveBeenCalledWith('vm', 0);
    });
  });

  describe('Contract Deployment', () => {
    it('should deploy a contract using a VM account', async () => {
      // Connect to VM first
      await web3Service.connect('vm', 0);

      // Deploy the contract
      const deployResult = await web3Service.deployContract(abi, bytecode, []);

      // Verify deployment was successful
      expect(deployResult).not.toBeNull();
      expect(deployResult?.address).toBe('0xContractAddress');
      expect(deployResult?.transactionHash).toBe('0xTransactionHash');

      // Verify deployContract was called with the correct parameters
      expect(web3Service.deployContract).toHaveBeenCalledWith(abi, bytecode, []);
    });
  });

  describe('Contract Read Methods', () => {
    it('should call a read method on a deployed contract', async () => {
      // Connect to VM first
      await web3Service.connect('vm', 0);

      // Mock the deployed contract address
      const contractAddress = '0xContractAddress';

      // Call the retrieve method
      const result = await web3Service.callContractMethod(
        contractAddress,
        abi,
        'retrieve',
        []
      );

      // Verify the method call was successful
      expect(result).toBe('0');

      // Verify callContractMethod was called with the correct parameters
      expect(web3Service.callContractMethod).toHaveBeenCalledWith(
        contractAddress,
        abi,
        'retrieve',
        []
      );
    });
  });

  describe('Contract Write Methods', () => {
    it('should execute a transaction on a deployed contract', async () => {
      // Connect to VM first
      await web3Service.connect('vm', 0);

      // Mock the deployed contract address
      const contractAddress = '0xContractAddress';

      // Call the store method
      const txResult = await web3Service.callContractMethod(
        contractAddress,
        abi,
        'store',
        [42]
      );

      // Verify the transaction was successful
      expect(txResult).not.toBeNull();
      expect(txResult.transactionHash).toBe('0xStoreTransactionHash');

      // Verify callContractMethod was called with the correct parameters
      expect(web3Service.callContractMethod).toHaveBeenCalledWith(
        contractAddress,
        abi,
        'store',
        [42]
      );

      // Call retrieve again to verify the state change
      const updatedValue = await web3Service.callContractMethod(
        contractAddress,
        abi,
        'retrieve',
        []
      );

      // Verify the value was updated
      expect(updatedValue).toBe('42');
    });
  });

  describe('Full Contract Interaction Flow', () => {
    it('should connect, deploy, and interact with a contract', async () => {
      // 1. Connect to VM
      const connected = await web3Service.connect('vm', 0);
      expect(connected).toBe(true);

      // 2. Deploy contract
      const deployResult = await web3Service.deployContract(abi, bytecode, []);
      expect(deployResult).not.toBeNull();
      const contractAddress = deployResult?.address;

      // 3. Call retrieve (should be 0 initially)
      const initialValue = await web3Service.callContractMethod(
        contractAddress,
        abi,
        'retrieve',
        []
      );
      expect(initialValue).toBe('0');

      // 4. Call store to update the value
      const storeValue = 42;
      const txResult = await web3Service.callContractMethod(
        contractAddress,
        abi,
        'store',
        [storeValue]
      );
      expect(txResult).not.toBeNull();

      // 5. Call retrieve again to verify the state change
      const updatedValue = await web3Service.callContractMethod(
        contractAddress,
        abi,
        'retrieve',
        []
      );
      expect(updatedValue).toBe('42');

      // 6. Disconnect
      await web3Service.disconnect();

      // Verify all methods were called in the correct sequence
      expect(web3Service.connect).toHaveBeenCalledWith('vm', 0);
      expect(web3Service.deployContract).toHaveBeenCalledWith(abi, bytecode, []);
      expect(web3Service.callContractMethod).toHaveBeenCalledWith(
        contractAddress,
        abi,
        'retrieve',
        []
      );
      expect(web3Service.callContractMethod).toHaveBeenCalledWith(
        contractAddress,
        abi,
        'store',
        [storeValue]
      );
      expect(web3Service.disconnect).toHaveBeenCalled();
    });
  });
});
