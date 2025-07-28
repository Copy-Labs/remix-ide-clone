import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Web3Service } from '../web3Service';

// Mock Web3 and related dependencies
const mockWeb3 = {
  eth: {
    getAccounts: vi.fn(),
    getBalance: vi.fn(),
    getGasPrice: vi.fn(),
    estimateGas: vi.fn(),
    Contract: vi.fn(),
    getChainId: vi.fn(),
  },
  utils: {
    fromWei: vi.fn(),
    toWei: vi.fn(),
  },
};

const mockContract = {
  deploy: vi.fn(),
  methods: {},
  options: { address: '0x1234567890123456789012345678901234567890' },
};

const mockEthereum = {
  request: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
  isMetaMask: true,
};

// Mock global objects
Object.defineProperty(global, 'window', {
  value: {
    ethereum: mockEthereum,
    Web3: vi.fn(() => mockWeb3),
  },
  writable: true,
});

vi.mock('web3', () => ({
  default: vi.fn(() => mockWeb3),
}));

describe('Web3Service', () => {
  let web3Service: Web3Service;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Reset Web3Service instance
    (Web3Service as any).instance = null;
    web3Service = Web3Service.getInstance();

    // Setup default mock implementations
    mockEthereum.request.mockImplementation((params: any) => {
      switch (params.method) {
        case 'eth_requestAccounts':
          return Promise.resolve(['0x1234567890123456789012345678901234567890']);
        case 'eth_chainId':
          return Promise.resolve('0x1');
        case 'wallet_switchEthereumChain':
          return Promise.resolve();
        case 'wallet_addEthereumChain':
          return Promise.resolve();
        default:
          return Promise.resolve();
      }
    });

    mockWeb3.eth.getAccounts.mockResolvedValue(['0x1234567890123456789012345678901234567890']);
    mockWeb3.eth.getBalance.mockResolvedValue('1500000000000000000');
    mockWeb3.eth.getGasPrice.mockResolvedValue('20000000000');
    mockWeb3.eth.estimateGas.mockResolvedValue(21000);
    mockWeb3.eth.getChainId.mockResolvedValue(1);
    mockWeb3.utils.fromWei.mockImplementation((value, unit) => {
      if (value === '1500000000000000000' && unit === 'ether') return '1.5';
      if (value === '20000000000' && unit === 'gwei') return '20';
      return value;
    });

    mockWeb3.eth.Contract.mockImplementation(() => mockContract);
    mockContract.deploy.mockReturnValue({
      send: vi.fn().mockResolvedValue(mockContract),
    });
  });

  afterEach(() => {
    web3Service.disconnect();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = Web3Service.getInstance();
      const instance2 = Web3Service.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Wallet Connection', () => {
    it('should connect to MetaMask successfully', async () => {
      const result = await web3Service.connect('metamask');

      expect(result).toBe(true);
      expect(mockEthereum.request).toHaveBeenCalledWith({
        method: 'eth_requestAccounts',
      });
      expect(web3Service.isWalletConnected()).toBe(true);
      expect(web3Service.getAccount()).toBe('0x1234567890123456789012345678901234567890');
    });

    it('should handle MetaMask connection failure', async () => {
      mockEthereum.request.mockRejectedValue(new Error('User rejected'));

      const result = await web3Service.connect('metamask');

      expect(result).toBe(false);
      expect(web3Service.isWalletConnected()).toBe(false);
    });

    it('should handle missing MetaMask', async () => {
      // Temporarily remove ethereum from window
      const originalEthereum = (global as any).window.ethereum;
      (global as any).window.ethereum = undefined;

      const result = await web3Service.connect('metamask');

      expect(result).toBe(false);
      expect(web3Service.isWalletConnected()).toBe(false);

      // Restore ethereum
      (global as any).window.ethereum = originalEthereum;
    });

    it('should disconnect wallet', () => {
      // First connect
      web3Service.connect('metamask');
      expect(web3Service.isWalletConnected()).toBe(true);

      // Then disconnect
      web3Service.disconnect();
      expect(web3Service.isWalletConnected()).toBe(false);
      expect(web3Service.getAccount()).toBeNull();
    });
  });

  describe('Network Management', () => {
    beforeEach(async () => {
      await web3Service.connect('metamask');
    });

    it('should switch network successfully', async () => {
      const result = await web3Service.switchNetwork(5);

      expect(result).toBe(true);
      expect(mockEthereum.request).toHaveBeenCalledWith({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x5' }],
      });
    });

    it('should handle network switch failure', async () => {
      mockEthereum.request.mockRejectedValue(new Error('Switch failed'));

      const result = await web3Service.switchNetwork(5);

      expect(result).toBe(false);
    });

    it('should add network successfully', async () => {
      const network = {
        id: 'polygon-mainnet',
        name: 'Polygon Mainnet',
        chainId: 137,
        rpcUrl: 'https://polygon-rpc.com',
        symbol: 'MATIC',
        isTestnet: false,
      };

      const result = await web3Service.addNetwork(network);

      expect(result).toBe(true);
      expect(mockEthereum.request).toHaveBeenCalledWith({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: '0x89',
            chainName: network.name,
            rpcUrls: [network.rpcUrl],
            nativeCurrency: {
              name: network.symbol,
              symbol: network.symbol,
              decimals: 18,
            },
          },
        ],
      });
    });

    it('should not switch network when not connected', async () => {
      web3Service.disconnect();

      const result = await web3Service.switchNetwork(5);

      expect(result).toBe(false);
      expect(mockEthereum.request).not.toHaveBeenCalledWith({
        method: 'wallet_switchEthereumChain',
        params: expect.any(Array),
      });
    });
  });

  describe('Account Information', () => {
    beforeEach(async () => {
      await web3Service.connect('metamask');
    });

    it('should get balance successfully', async () => {
      const balance = await web3Service.getBalance();

      expect(mockWeb3.eth.getBalance).toHaveBeenCalledWith(
        '0x1234567890123456789012345678901234567890',
      );
      expect(mockWeb3.utils.fromWei).toHaveBeenCalledWith('1500000000000000000', 'ether');
      expect(balance).toBe('1.5');
    });

    it('should handle balance fetch failure', async () => {
      mockWeb3.eth.getBalance.mockRejectedValue(new Error('Balance fetch failed'));

      const balance = await web3Service.getBalance();

      expect(balance).toBeNull();
    });

    it('should get gas price successfully', async () => {
      const gasPrice = await web3Service.getGasPrice();

      expect(mockWeb3.eth.getGasPrice).toHaveBeenCalled();
      expect(mockWeb3.utils.fromWei).toHaveBeenCalledWith('20000000000', 'gwei');
      expect(gasPrice).toBe('20');
    });

    it('should handle gas price fetch failure', async () => {
      mockWeb3.eth.getGasPrice.mockRejectedValue(new Error('Gas price fetch failed'));

      const gasPrice = await web3Service.getGasPrice();

      expect(gasPrice).toBeNull();
    });
  });

  describe('Gas Estimation', () => {
    beforeEach(async () => {
      await web3Service.connect('metamask');
    });

    it('should estimate gas successfully', async () => {
      const tx = {
        to: '0x1234567890123456789012345678901234567890',
        data: '0x',
      };

      const gasEstimate = await web3Service.estimateGas(tx);

      expect(mockWeb3.eth.estimateGas).toHaveBeenCalledWith({
        ...tx,
        from: '0x1234567890123456789012345678901234567890',
      });
      expect(gasEstimate).toBe(21000);
    });

    it('should handle gas estimation failure', async () => {
      mockWeb3.eth.estimateGas.mockRejectedValue(new Error('Estimation failed'));

      const tx = {
        to: '0x1234567890123456789012345678901234567890',
        data: '0x',
      };

      const gasEstimate = await web3Service.estimateGas(tx);

      expect(gasEstimate).toBeNull();
    });
  });

  describe('Contract Deployment', () => {
    const mockAbi = [
      {
        type: 'constructor',
        inputs: [{ name: 'initialValue', type: 'uint256' }],
      },
    ];
    const mockBytecode = '0x608060405234801561001057600080fd5b50...';

    beforeEach(async () => {
      await web3Service.connect('metamask');
    });

    it('should deploy contract successfully', async () => {
      const args = [100];
      const options = { gas: 3000000 };

      const result = await web3Service.deployContract(mockAbi, mockBytecode, args, options);

      expect(mockWeb3.eth.Contract).toHaveBeenCalledWith(mockAbi);
      expect(mockContract.deploy).toHaveBeenCalledWith({
        data: mockBytecode,
        arguments: args,
      });
      expect(result).toBe(mockContract);
    });

    it('should handle deployment failure', async () => {
      mockContract.deploy.mockReturnValue({
        send: vi.fn().mockRejectedValue(new Error('Deployment failed')),
      });

      const result = await web3Service.deployContract(mockAbi, mockBytecode, [], {});

      expect(result).toBeNull();
    });

    it('should not deploy when not connected', async () => {
      web3Service.disconnect();

      const result = await web3Service.deployContract(mockAbi, mockBytecode, [], {});

      expect(result).toBeNull();
      expect(mockWeb3.eth.Contract).not.toHaveBeenCalled();
    });
  });

  describe('Contract Interaction', () => {
    const mockAbi = [
      {
        type: 'function',
        name: 'getValue',
        inputs: [],
        outputs: [{ type: 'uint256' }],
        stateMutability: 'view',
      },
      {
        type: 'function',
        name: 'setValue',
        inputs: [{ name: 'newValue', type: 'uint256' }],
        outputs: [],
        stateMutability: 'nonpayable',
      },
    ];

    beforeEach(async () => {
      await web3Service.connect('metamask');
    });

    it('should call read method successfully', async () => {
      const mockMethod = {
        call: vi.fn().mockResolvedValue('42'),
      };
      mockContract.methods = {
        getValue: vi.fn().mockReturnValue(mockMethod),
      };

      const result = await web3Service.callContractMethod(
        '0x1234567890123456789012345678901234567890',
        mockAbi,
        'getValue',
        [],
        {},
      );

      expect(mockWeb3.eth.Contract).toHaveBeenCalledWith(
        mockAbi,
        '0x1234567890123456789012345678901234567890',
      );
      expect(mockContract.methods.getValue).toHaveBeenCalledWith();
      expect(mockMethod.call).toHaveBeenCalled();
      expect(result).toBe('42');
    });

    it('should call write method successfully', async () => {
      const mockMethod = {
        send: vi.fn().mockResolvedValue({ transactionHash: '0xabc123' }),
      };
      mockContract.methods = {
        setValue: vi.fn().mockReturnValue(mockMethod),
      };

      const result = await web3Service.callContractMethod(
        '0x1234567890123456789012345678901234567890',
        mockAbi,
        'setValue',
        [100],
        { gas: 100000 },
      );

      expect(mockContract.methods.setValue).toHaveBeenCalledWith(100);
      expect(mockMethod.send).toHaveBeenCalledWith({
        from: '0x1234567890123456789012345678901234567890',
        gas: 100000,
      });
      expect(result).toEqual({ transactionHash: '0xabc123' });
    });

    it('should handle method call failure', async () => {
      const mockMethod = {
        call: vi.fn().mockRejectedValue(new Error('Call failed')),
      };
      mockContract.methods = {
        getValue: vi.fn().mockReturnValue(mockMethod),
      };

      const result = await web3Service.callContractMethod(
        '0x1234567890123456789012345678901234567890',
        mockAbi,
        'getValue',
        [],
        {},
      );

      expect(result).toBeNull();
    });

    it('should handle non-existent method', async () => {
      mockContract.methods = {};

      const result = await web3Service.callContractMethod(
        '0x1234567890123456789012345678901234567890',
        mockAbi,
        'nonExistentMethod',
        [],
        {},
      );

      expect(result).toBeNull();
    });

    it('should not call method when not connected', async () => {
      web3Service.disconnect();

      const result = await web3Service.callContractMethod(
        '0x1234567890123456789012345678901234567890',
        mockAbi,
        'getValue',
        [],
        {},
      );

      expect(result).toBeNull();
      expect(mockWeb3.eth.Contract).not.toHaveBeenCalled();
    });
  });

  describe('Network Information', () => {
    it('should get available networks', () => {
      const networks = web3Service.getAvailableNetworks();

      expect(networks).toBeInstanceOf(Array);
      expect(networks.length).toBeGreaterThan(0);
      expect(networks[0]).toHaveProperty('id');
      expect(networks[0]).toHaveProperty('name');
      expect(networks[0]).toHaveProperty('chainId');
      expect(networks[0]).toHaveProperty('rpcUrl');
      expect(networks[0]).toHaveProperty('symbol');
      expect(networks[0]).toHaveProperty('isTestnet');
    });

    it('should get current network', async () => {
      await web3Service.connect('metamask');

      const network = web3Service.getNetwork();

      expect(network).toBeDefined();
      expect(network?.chainId).toBe(1);
      expect(network?.name).toBe('Ethereum Mainnet');
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      await web3Service.connect('metamask');
    });

    it('should handle account change events', () => {
      const callback = vi.fn();
      web3Service.on('accountChanged', callback);

      // Simulate account change
      const accountChangeHandler = mockEthereum.on.mock.calls.find(
        (call) => call[0] === 'accountsChanged',
      )?.[1];

      if (accountChangeHandler) {
        accountChangeHandler(['0x9999999999999999999999999999999999999999']);
      }

      expect(callback).toHaveBeenCalled();
    });

    it('should handle network change events', () => {
      const callback = vi.fn();
      web3Service.on('networkChanged', callback);

      // Simulate network change
      const networkChangeHandler = mockEthereum.on.mock.calls.find(
        (call) => call[0] === 'chainChanged',
      )?.[1];

      if (networkChangeHandler) {
        networkChangeHandler('0x5');
      }

      expect(callback).toHaveBeenCalled();
    });

    it('should remove event listeners', () => {
      const callback = vi.fn();
      web3Service.on('accountChanged', callback);
      web3Service.off('accountChanged', callback);

      expect(mockEthereum.removeListener).toHaveBeenCalled();
    });
  });
});
