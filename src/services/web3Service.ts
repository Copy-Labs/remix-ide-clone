import Web3 from 'web3';
import type { Network } from '@/types';
import { debug, info, warn, error } from '@/services/loggerService';

/**
 * Service for Web3 integration and wallet connections
 * This service handles all Web3-related operations including:
 * - Connecting to wallets (MetaMask, WalletConnect)
 * - Managing network connections
 * - Handling account changes
 * - Providing Web3 instances for transactions
 */
export class Web3Service {
  private static instance: Web3Service;
  private web3: Web3 | null = null;
  private provider: any = null;
  private account: string | null = null;
  private network: Network | null = null;
  private chainId: number | null = null;
  private isConnected: boolean = false;
  private isConnecting: boolean = false;
  private listeners: Map<string, Function[]> = new Map();

  // Predefined networks for easy access
  private networks: Network[] = [
    {
      id: 'ethereum',
      name: 'Ethereum Mainnet',
      rpcUrl: 'https://mainnet.infura.io/v3/your-infura-key',
      chainId: 1,
      symbol: 'ETH',
      blockExplorer: 'https://etherscan.io',
      isTestnet: false,
    },
    {
      id: 'goerli',
      name: 'Goerli Testnet',
      rpcUrl: 'https://goerli.infura.io/v3/your-infura-key',
      chainId: 5,
      symbol: 'ETH',
      blockExplorer: 'https://goerli.etherscan.io',
      isTestnet: true,
    },
    {
      id: 'sepolia',
      name: 'Sepolia Testnet',
      rpcUrl: 'https://sepolia.infura.io/v3/your-infura-key',
      chainId: 11155111,
      symbol: 'ETH',
      blockExplorer: 'https://sepolia.etherscan.io',
      isTestnet: true,
    },
    {
      id: 'polygon',
      name: 'Polygon Mainnet',
      rpcUrl: 'https://polygon-rpc.com',
      chainId: 137,
      symbol: 'MATIC',
      blockExplorer: 'https://polygonscan.com',
      isTestnet: false,
    },
    {
      id: 'mumbai',
      name: 'Mumbai Testnet',
      rpcUrl: 'https://rpc-mumbai.maticvigil.com',
      chainId: 80001,
      symbol: 'MATIC',
      blockExplorer: 'https://mumbai.polygonscan.com',
      isTestnet: true,
    },
    {
      id: 'localhost',
      name: 'Localhost',
      rpcUrl: 'http://localhost:8545',
      chainId: 1337,
      symbol: 'ETH',
      blockExplorer: 'http://localhost:8545',
      isTestnet: true,
    },
  ];

  private constructor() {
    // Private constructor for singleton pattern
    debug('Web3Service', 'Initializing Web3Service');
    this.setupEventListeners();
  }

  /**
   * Get the singleton instance of Web3Service
   */
  public static getInstance(): Web3Service {
    if (!Web3Service.instance) {
      Web3Service.instance = new Web3Service();
    }
    return Web3Service.instance;
  }

  /**
   * Connect to a wallet provider
   * @param providerType The type of provider to connect to ('metamask' or 'walletconnect')
   * @returns Whether the connection was successful
   */
  public async connect(providerType: 'metamask' | 'walletconnect' = 'metamask'): Promise<boolean> {
    try {
      this.isConnecting = true;
      this.emit('connecting');

      if (providerType === 'metamask') {
        return await this.connectToMetaMask();
      } else if (providerType === 'walletconnect') {
        return await this.connectToWalletConnect();
      }

      return false;
    } catch (err) {
      error('Web3Service', 'Failed to connect to wallet', err);
      this.isConnecting = false;
      this.emit('error', err);
      return false;
    }
  }

  /**
   * Connect to MetaMask wallet
   * @returns Whether the connection was successful
   */
  private async connectToMetaMask(): Promise<boolean> {
    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        warn('Web3Service', 'MetaMask is not installed');
        this.emit('error', new Error('MetaMask is not installed'));
        this.isConnecting = false;
        return false;
      }

      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

      if (accounts && accounts.length > 0) {
        this.provider = window.ethereum;
        this.web3 = new Web3(this.provider);
        this.account = accounts[0];

        // Get network information
        await this.updateNetworkInfo();

        this.isConnected = true;
        this.isConnecting = false;

        info('Web3Service', `Connected to MetaMask with account: ${this.account}`);
        this.emit('connected', { account: this.account, network: this.network });

        return true;
      }

      this.isConnecting = false;
      return false;
    } catch (err) {
      error('Web3Service', 'Failed to connect to MetaMask', err);
      this.isConnecting = false;
      this.emit('error', err);
      return false;
    }
  }

  /**
   * Connect to WalletConnect
   * @returns Whether the connection was successful
   */
  private async connectToWalletConnect(): Promise<boolean> {
    try {
      // WalletConnect v2 implementation would go here
      // For now, we'll just show a warning that it's not implemented
      warn('Web3Service', 'WalletConnect integration is not yet implemented');
      this.emit('error', new Error('WalletConnect integration is not yet implemented'));
      this.isConnecting = false;
      return false;
    } catch (err) {
      error('Web3Service', 'Failed to connect to WalletConnect', err);
      this.isConnecting = false;
      this.emit('error', err);
      return false;
    }
  }

  /**
   * Disconnect from the current wallet
   */
  public disconnect(): void {
    this.web3 = null;
    this.provider = null;
    this.account = null;
    this.network = null;
    this.chainId = null;
    this.isConnected = false;

    info('Web3Service', 'Disconnected from wallet');
    this.emit('disconnected');
  }

  /**
   * Get the current Web3 instance
   * @returns The Web3 instance or null if not connected
   */
  public getWeb3(): Web3 | null {
    return this.web3;
  }

  /**
   * Get the current provider
   * @returns The provider or null if not connected
   */
  public getProvider(): any {
    return this.provider;
  }

  /**
   * Get the current account
   * @returns The account address or null if not connected
   */
  public getAccount(): string | null {
    return this.account;
  }

  /**
   * Get the current network
   * @returns The network information or null if not connected
   */
  public getNetwork(): Network | null {
    return this.network;
  }

  /**
   * Get the current chain ID
   * @returns The chain ID or null if not connected
   */
  public getChainId(): number | null {
    return this.chainId;
  }

  /**
   * Check if connected to a wallet
   * @returns Whether connected to a wallet
   */
  public isWalletConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Check if currently connecting to a wallet
   * @returns Whether currently connecting to a wallet
   */
  public isWalletConnecting(): boolean {
    return this.isConnecting;
  }

  /**
   * Get all available networks
   * @returns Array of available networks
   */
  public getAvailableNetworks(): Network[] {
    return [...this.networks];
  }

  /**
   * Get a network by chain ID
   * @param chainId The chain ID to look for
   * @returns The network or null if not found
   */
  public getNetworkByChainId(chainId: number): Network | null {
    return this.networks.find((network) => network.chainId === chainId) || null;
  }

  /**
   * Switch to a different network
   * @param chainId The chain ID to switch to
   * @returns Whether the switch was successful
   */
  public async switchNetwork(chainId: number): Promise<boolean> {
    try {
      if (!this.provider || !this.isConnected) {
        warn('Web3Service', 'Cannot switch network: not connected to a wallet');
        return false;
      }

      const network = this.getNetworkByChainId(chainId);
      if (!network) {
        warn('Web3Service', `Network with chain ID ${chainId} not found`);
        return false;
      }

      // Try to switch to the network
      try {
        await this.provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${chainId.toString(16)}` }],
        });

        // Update network info after switching
        await this.updateNetworkInfo();

        info('Web3Service', `Switched to network: ${this.network?.name}`);
        this.emit('networkChanged', this.network);

        return true;
      } catch (switchError: any) {
        // This error code indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902) {
          try {
            await this.addNetwork(network);
            return true;
          } catch (addError) {
            error('Web3Service', 'Failed to add network', addError);
            this.emit('error', addError);
            return false;
          }
        }
        throw switchError;
      }
    } catch (err) {
      error('Web3Service', 'Failed to switch network', err);
      this.emit('error', err);
      return false;
    }
  }

  /**
   * Add a new network to the wallet
   * @param network The network to add
   * @returns Whether the network was added successfully
   */
  public async addNetwork(network: Network): Promise<boolean> {
    try {
      if (!this.provider || !this.isConnected) {
        warn('Web3Service', 'Cannot add network: not connected to a wallet');
        return false;
      }

      await this.provider.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: `0x${network.chainId.toString(16)}`,
            chainName: network.name,
            nativeCurrency: {
              name: network.symbol,
              symbol: network.symbol,
              decimals: 18,
            },
            rpcUrls: [network.rpcUrl],
            blockExplorerUrls: network.blockExplorer ? [network.blockExplorer] : undefined,
          },
        ],
      });

      // Update network info after adding
      await this.updateNetworkInfo();

      info('Web3Service', `Added and switched to network: ${this.network?.name}`);
      this.emit('networkChanged', this.network);

      return true;
    } catch (err) {
      error('Web3Service', 'Failed to add network', err);
      this.emit('error', err);
      return false;
    }
  }

  /**
   * Get the balance of the current account
   * @returns The balance in ETH/native token as a string
   */
  public async getBalance(): Promise<string> {
    try {
      if (!this.web3 || !this.account) {
        return '0';
      }

      const balanceWei = await this.web3.eth.getBalance(this.account);
      const balanceEth = this.web3.utils.fromWei(balanceWei, 'ether');

      return balanceEth;
    } catch (err) {
      error('Web3Service', 'Failed to get balance', err);
      return '0';
    }
  }

  /**
   * Get the gas price
   * @returns The gas price in Gwei
   */
  public async getGasPrice(): Promise<string> {
    try {
      if (!this.web3) {
        return '0';
      }

      const gasPriceWei = await this.web3.eth.getGasPrice();
      const gasPriceGwei = this.web3.utils.fromWei(gasPriceWei, 'gwei');

      return gasPriceGwei;
    } catch (err) {
      error('Web3Service', 'Failed to get gas price', err);
      return '0';
    }
  }

  /**
   * Estimate gas for a transaction
   * @param tx The transaction to estimate gas for
   * @returns The estimated gas as a number
   */
  public async estimateGas(tx: any): Promise<number> {
    try {
      if (!this.web3) {
        return 0;
      }

      const gas = await this.web3.eth.estimateGas(tx);
      return gas;
    } catch (err) {
      error('Web3Service', 'Failed to estimate gas', err);
      return 0;
    }
  }

  /**
   * Check if a contract exists at a given address
   * @param address The address to check
   * @returns Whether a contract exists at the address
   */
  public async contractExists(address: string): Promise<boolean> {
    try {
      if (!this.web3 || !address) {
        return false;
      }

      // Get the code at the address
      const code = await this.web3.eth.getCode(address);

      // If there's code at the address (not "0x" or "0x0"), a contract exists there
      return code !== '0x' && code !== '0x0';
    } catch (err) {
      error('Web3Service', `Failed to check if contract exists at ${address}`, err);
      return false;
    }
  }

  /**
   * Wait for a contract to be deployed at a given address
   * @param address The contract address
   * @param maxAttempts Maximum number of attempts to check
   * @param interval Interval between attempts in milliseconds
   * @returns Whether the contract was deployed successfully
   */
  public async waitForContract(
    address: string,
    maxAttempts: number = 10,
    interval: number = 2000,
  ): Promise<boolean> {
    try {
      if (!this.web3 || !address) {
        return false;
      }

      let attempts = 0;
      while (attempts < maxAttempts) {
        const exists = await this.contractExists(address);
        if (exists) {
          info('Web3Service', `Contract confirmed at ${address} after ${attempts + 1} attempts`);
          return true;
        }

        // Wait before next attempt
        await new Promise((resolve) => setTimeout(resolve, interval));
        attempts++;
      }

      warn('Web3Service', `Contract not found at ${address} after ${maxAttempts} attempts`);
      return false;
    } catch (err) {
      error('Web3Service', `Failed to wait for contract at ${address}`, err);
      return false;
    }
  }

  /**
   * Deploy a contract
   * @param abi The contract ABI
   * @param bytecode The contract bytecode
   * @param args The constructor arguments
   * @param options Transaction options
   * @returns The deployed contract address and transaction hash
   */
  public async deployContract(
    abi: any[],
    bytecode: string,
    args: any[] = [],
    options: any = {},
  ): Promise<{ address: string; transactionHash: string } | null> {
    try {
      if (!this.web3 || !this.account) {
        warn('Web3Service', 'Cannot deploy contract: not connected to a wallet');
        return null;
      }

      // Create contract instance
      const contract = new this.web3.eth.Contract(abi);

      // Estimate gas if not provided
      if (!options.gas) {
        const deployTx = contract.deploy({
          data: bytecode,
          arguments: args,
        });

        const estimatedGas = await this.estimateGas({
          from: this.account,
          data: deployTx.encodeABI(),
        });

        options.gas = Math.floor(estimatedGas * 1.2); // Add 20% buffer
      }

      // Deploy the contract
      const deployOptions = {
        from: this.account,
        ...options,
      };

      info('Web3Service', 'Deploying contract...', { args, options: deployOptions });

      const deployed = await contract
        .deploy({
          data: bytecode,
          arguments: args,
        })
        .send(deployOptions);

      info('Web3Service', `Contract deployed at ${deployed.options.address}`);

      return {
        address: deployed.options.address,
        transactionHash: deployed._transactionHash,
      };
    } catch (err) {
      error('Web3Service', 'Failed to deploy contract', err);
      this.emit('error', err);
      return null;
    }
  }

  /**
   * Interact with a contract
   * @param address The contract address
   * @param abi The contract ABI
   * @param method The method to call
   * @param args The method arguments
   * @param options Transaction options
   * @returns The transaction result
   */
  public async callContractMethod(
    address: string,
    abi: any[],
    method: string,
    args: any[] = [],
    options: any = {},
  ): Promise<any> {
    try {
      if (!this.web3 || !this.account) {
        warn('Web3Service', 'Cannot call contract method: not connected to a wallet');
        return null;
      }

      // Create contract instance
      const contract = new this.web3.eth.Contract(abi, address);

      // Check if method exists
      if (!contract.methods[method]) {
        warn('Web3Service', `Method ${method} not found in contract`);
        return null;
      }

      // Determine if this is a read or write operation
      const methodAbi = abi.find((item) => item.name === method);
      const isReadOperation =
        methodAbi?.stateMutability === 'view' || methodAbi?.stateMutability === 'pure';

      if (isReadOperation) {
        // Call (read operation)
        info('Web3Service', `Calling read method ${method}...`, { args });
        return await contract.methods[method](...args).call(options);
      } else {
        // Send (write operation)
        const txOptions = {
          from: this.account,
          ...options,
        };

        // Estimate gas if not provided
        if (!txOptions.gas) {
          const estimatedGas = await contract.methods[method](...args).estimateGas({
            from: this.account,
          });
          txOptions.gas = Math.floor(estimatedGas * 1.2); // Add 20% buffer
        }

        info('Web3Service', `Calling write method ${method}...`, { args, options: txOptions });
        return await contract.methods[method](...args).send(txOptions);
      }
    } catch (err) {
      error('Web3Service', `Failed to call contract method ${method}`, err);
      this.emit('error', err);
      return null;
    }
  }

  /**
   * Update network information based on the current provider
   */
  private async updateNetworkInfo(): Promise<void> {
    try {
      if (!this.web3 || !this.provider) {
        return;
      }

      // Get chain ID
      const _chainId = await this.web3.eth.getChainId();
      const chainId = Number(_chainId);
      this.chainId = chainId;

      // Find network by chain ID
      const network = this.getNetworkByChainId(chainId);

      if (network) {
        this.network = network;
      } else {
        // If network not found in predefined list, create a custom one
        this.network = {
          id: `chain-${chainId}`,
          name: `Chain ${chainId}`,
          rpcUrl: '',
          chainId: chainId,
          symbol: 'ETH', // Default symbol
          blockExplorer: '', // Empty string as default
          isTestnet: chainId !== 1, // Assume testnet if not mainnet
        };
      }

      debug('Web3Service', `Network updated: ${this.network.name} (${this.network.chainId})`);
    } catch (err) {
      error('Web3Service', 'Failed to update network information', err);
    }
  }

  /**
   * Set up event listeners for wallet events
   */
  private setupEventListeners(): void {
    if (typeof window !== 'undefined' && window.ethereum) {
      // Account changed
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected their wallet
          this.disconnect();
        } else {
          this.account = accounts[0];
          info('Web3Service', `Account changed to ${this.account}`);
          this.emit('accountChanged', this.account);
        }
      });

      // Chain changed
      window.ethereum.on('chainChanged', async (chainIdHex: string) => {
        const chainId = parseInt(chainIdHex, 16);
        this.chainId = chainId;

        await this.updateNetworkInfo();

        info('Web3Service', `Chain changed to ${this.network?.name} (${this.chainId})`);
        this.emit('networkChanged', this.network);
      });

      // Disconnect
      window.ethereum.on('disconnect', () => {
        this.disconnect();
      });
    }
  }

  /**
   * Add an event listener
   * @param event The event to listen for
   * @param callback The callback function
   */
  public on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    this.listeners.get(event)?.push(callback);
  }

  /**
   * Remove an event listener
   * @param event The event to remove the listener from
   * @param callback The callback function to remove
   */
  public off(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      return;
    }

    const callbacks = this.listeners.get(event) || [];
    const index = callbacks.indexOf(callback);

    if (index !== -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * Emit an event
   * @param event The event to emit
   * @param data The data to pass to the listeners
   */
  private emit(event: string, data?: any): void {
    if (!this.listeners.has(event)) {
      return;
    }

    const callbacks = this.listeners.get(event) || [];

    for (const callback of callbacks) {
      try {
        callback(data);
      } catch (err) {
        error('Web3Service', `Error in event listener for ${event}`, err);
      }
    }
  }
}

// Export singleton instance
export const web3Service = Web3Service.getInstance();

// Add global type for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}
