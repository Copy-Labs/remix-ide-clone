import Web3 from 'web3';
import type { Network, LocalVMAccount } from '@/types';
import { debug, info, warn, error } from '@/services/loggerService';

/**
 * JavaScript VM Service - Mimics Remix IDE's built-in VM
 * This service provides contract deployment and interaction without external wallet connection
 * Uses pre-funded accounts that exist in the browser memory
 */
export class JavaScriptVMService {
  private static instance: JavaScriptVMService;
  private web3: Web3 | null = null;
  private provider: any = null;
  private accounts: LocalVMAccount[] = [];
  private vmNetwork: Network = {
    id: 'javascriptvm',
    name: 'JavaScript VM',
    rpcUrl: 'javascript-vm://',
    chainId: 1337,
    symbol: 'ETH',
    blockExplorer: '',
    isTestnet: true,
  };
  private isConnected: boolean = false;
  private isConnecting: boolean = false;
  private selectedAccountIndex: number = 0;
  private listeners: Map<string, Function[]> = new Map();

  // Storage key for persisting VM accounts
  private readonly STORAGE_KEY = 'javascript-vm-accounts';

  private constructor() {
    debug('JavaScriptVMService', 'Initializing JavaScriptVMService');
    this.initializeWeb3();
    this.loadAccounts();
  }

  /**
   * Get the singleton instance of JavaScriptVMService
   */
  public static getInstance(): JavaScriptVMService {
    if (!JavaScriptVMService.instance) {
      JavaScriptVMService.instance = new JavaScriptVMService();
    }
    return JavaScriptVMService.instance;
  }

  /**
   * Initialize the Web3 instance with VM provider
   */
  private initializeWeb3(): void {
    try {
      // Create a mock provider that mimics browser wallet behavior
      this.provider = this.createMockProvider();
      this.web3 = new Web3(this.provider);

      debug('JavaScriptVMService', 'Web3 initialized with mock provider');
    } catch (err) {
      error('JavaScriptVMService', 'Failed to initialize Web3', err);
    }
  }

  /**
   * Create a mock provider that mimics Web3 provider behavior
   */
  private createMockProvider(): any {
    const self = this;

    return {
      isConnected: () => true,
      selectedAddress: () => self.getSelectedAccount()?.address || null,
      networkVersion: self.vmNetwork.chainId.toString(),

      // Handle account requests
      request: async (args: { method: string; params?: any[] }) => {
        debug('JavaScriptVMService', 'Mock provider request', args);

        switch (args.method) {
          case 'eth_requestAccounts':
            return [self.getSelectedAccount()?.address];

          case 'eth_accounts':
            return [self.getSelectedAccount()?.address];

          case 'eth_chainId':
            return `0x${self.vmNetwork.chainId.toString(16)}`;

          case 'net_version':
            return self.vmNetwork.chainId.toString();

          case 'personal_sign':
            // Mock personal sign - return mock signature
            return '0x' + 'a'.repeat(130);

          case 'eth_signTransaction':
            // Mock transaction signing - return mock signature and hash
            const txHash = '0x' + 'b'.repeat(64);
            return {
              rawTransaction: '0x' + 'c'.repeat(200),
              transactionHash: txHash
            };

          case 'eth_sendTransaction':
            // Mock transaction sending - return mock transaction hash
            return '0x' + 'd'.repeat(64);

          case 'wallet_switchEthereumChain':
            // VM always stays on the same network
            return null;

          default:
            debug('JavaScriptVMService', `Unhandled method: ${args.method}`);
            return null;
        }
      },

      // Event listeners (simplified)
      on: (event: string, callback: Function) => {
        // VM doesn't emit events like real wallets
        debug('JavaScriptVMService', `Event listener registered for ${event}`);
      },

      removeListener: (event: string, callback: Function) => {
        debug('JavaScriptVMService', `Event listener removed for ${event}`);
      }
    };
  }

  /**
   * Connect to the JavaScript VM
   * @returns Whether the connection was successful
   */
  public async connect(): Promise<boolean> {
    try {
      this.isConnecting = true;
      this.emit('connecting');

      // Ensure we have at least one account
      if (this.accounts.length === 0) {
        this.createDefaultAccounts();
      }

      this.isConnected = true;
      this.isConnecting = false;

      info('JavaScriptVMService', 'Connected to JavaScript VM');
      this.emit('connected', { network: this.vmNetwork, accounts: this.accounts });

      return true;
    } catch (err) {
      error('JavaScriptVMService', 'Failed to connect to JavaScript VM', err);
      this.isConnected = false;
      this.isConnecting = false;
      this.emit('error', err);
      return false;
    }
  }

  /**
   * Disconnect from the JavaScript VM
   */
  public disconnect(): void {
    this.isConnected = false;
    this.web3 = null;
    this.provider = null;

    info('JavaScriptVMService', 'Disconnected from JavaScript VM');
    this.emit('disconnected');
  }

  /**
   * Get the Web3 instance for VM operations
   * @returns The Web3 instance or null if not connected
   */
  public getWeb3(): Web3 | null {
    return this.web3;
  }

  /**
   * Get the VM network
   * @returns The VM network configuration
   */
  public getVMNetwork(): Network {
    return this.vmNetwork;
  }

  /**
   * Check if connected to the VM
   * @returns Whether connected to the VM
   */
  public isVMConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Check if currently connecting to the VM
   * @returns Whether currently connecting
   */
  public isVMConnecting(): boolean {
    return this.isConnecting;
  }

  /**
   * Create default pre-funded accounts
   */
  private createDefaultAccounts(): void {
    const defaultAccounts = [
      {
        address: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
        privateKey: '0x' + 'a'.repeat(64),
        name: 'Account 0',
        balance: '1000' // 1000 ETH
      },
      {
        address: '0xf17f52151EbEF6C7334FAD080c5704D77216b732',
        privateKey: '0x' + 'b'.repeat(64),
        name: 'Account 1',
        balance: '1000' // 1000 ETH
      },
      {
        address: '0xC5fdf4076b8F3A5357c5E395ab970B5B54098Fef',
        privateKey: '0x' + 'c'.repeat(64),
        name: 'Account 2',
        balance: '1000' // 1000 ETH
      }
    ];

    this.accounts = defaultAccounts.map((acc, index) => ({
      id: acc.address.toLowerCase(),
      address: acc.address,
      privateKey: acc.privateKey,
      name: acc.name,
      balance: acc.balance,
      createdAt: Date.now(),
      isFunded: true,
    }));

    this.saveAccounts();
    debug('JavaScriptVMService', 'Created default accounts', this.accounts);
  }

  /**
   * Create a new local account for testing
   * @param name Optional name for the account
   * @returns The created account
   */
  public createAccount(name?: string): LocalVMAccount {
    const accountNumber = this.accounts.length;
    const privateKey = '0x' + Math.random().toString(16).substr(2, 64).padStart(64, '0');
    const address = '0x' + Math.random().toString(16).substr(2, 40).padStart(40, '0');

    const newAccount: LocalVMAccount = {
      id: address.toLowerCase(),
      address,
      privateKey,
      name: name || `Account ${accountNumber}`,
      balance: '1000', // Default 1000 ETH
      createdAt: Date.now(),
      isFunded: true,
    };

    this.accounts.push(newAccount);
    this.saveAccounts();

    info('JavaScriptVMService', `Created new VM account: ${address}`);
    this.emit('accountCreated', newAccount);

    return newAccount;
  }

  /**
   * Get all VM accounts
   * @returns Array of all accounts
   */
  public getAccounts(): LocalVMAccount[] {
    return [...this.accounts];
  }

  /**
   * Get the currently selected account
   * @returns The selected account or null
   */
  public getSelectedAccount(): LocalVMAccount | null {
    return this.accounts[this.selectedAccountIndex] || null;
  }

  /**
   * Select an account by index
   * @param index The account index to select
   * @returns Whether the selection was successful
   */
  public selectAccount(index: number): boolean {
    if (index >= 0 && index < this.accounts.length) {
      this.selectedAccountIndex = index;
      this.emit('accountChanged', this.accounts[index]);
      return true;
    }
    return false;
  }

  /**
   * Get a specific account by ID
   * @param accountId The account ID (address in lowercase)
   * @returns The account or null if not found
   */
  public getAccount(accountId: string): LocalVMAccount | null {
    return this.accounts.find(acc => acc.id === accountId.toLowerCase()) || null;
  }

  /**
   * Remove an account
   * @param accountId The account ID to remove
   * @returns Whether the account was removed
   */
  public removeAccount(accountId: string): boolean {
    const normalizedId = accountId.toLowerCase();
    const accountIndex = this.accounts.findIndex(acc => acc.id === normalizedId);

    if (accountIndex !== -1) {
      const account = this.accounts[accountIndex];
      this.accounts.splice(accountIndex, 1);

      // Adjust selected account if necessary
      if (this.selectedAccountIndex >= this.accounts.length) {
        this.selectedAccountIndex = Math.max(0, this.accounts.length - 1);
      }

      this.saveAccounts();
      info('JavaScriptVMService', `Removed account: ${account.address}`);
      this.emit('accountRemoved', account);
      return true;
    }
    return false;
  }

  /**
   * Deploy a contract to the VM
   * @param abi The contract ABI
   * @param bytecode The contract bytecode
   * @param args The constructor arguments
   * @param options Transaction options
   * @returns Mock deployment result
   */
  public async deployContract(
    abi: any[],
    bytecode: string,
    args: any[] = [],
    options: any = {}
  ): Promise<{ address: string; transactionHash: string }> {
    try {
      // Generate mock contract address
      const contractAddress = '0x' + Math.random().toString(16).substr(2, 40).padStart(40, '0');
      const txHash = '0x' + Math.random().toString(16).substr(2, 64).padStart(64, '0');

      // Simulate deployment delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      info('JavaScriptVMService', `Mock deployed contract at ${contractAddress}`);
      this.emit('contractDeployed', { address: contractAddress, txHash, abi, bytecode, args });

      return {
        address: contractAddress,
        transactionHash: txHash
      };
    } catch (err) {
      error('JavaScriptVMService', 'Failed to deploy contract', err);
      throw err;
    }
  }

  /**
   * Call a contract method in the VM
   * @param address The contract address
   * @param abi The contract ABI
   * @param method The method to call
   * @param args The method arguments
   * @param options Transaction options
   * @returns Mock result based on method type
   */
  public async callContractMethod(
    address: string,
    abi: any[],
    method: string,
    args: any[] = [],
    options: any = {}
  ): Promise<any> {
    try {
      const methodAbi = abi.find((item: any) => item.name === method);
      const isReadOperation = methodAbi?.stateMutability === 'view' || methodAbi?.stateMutability === 'pure';

      // Simulate method call delay
      await new Promise(resolve => setTimeout(resolve, 500));

      if (isReadOperation) {
        // Return mock data based on common return types
        if (methodAbi?.outputs) {
          const output = methodAbi.outputs[0];
          if (output.type === 'string') return 'Hello from VM!';
          if (output.type === 'uint256') return '42';
          if (output.type === 'bool') return true;
          if (output.type === 'address') return this.getSelectedAccount()?.address;
          return 'mock-result';
        }
        return null;
      } else {
        // For write operations, return mock transaction receipt
        return {
          transactionHash: '0x' + Math.random().toString(16).substr(2, 64).padStart(64, '0'),
          blockNumber: Math.floor(Math.random() * 1000000),
          gasUsed: 21000,
          status: true
        };
      }
    } catch (err) {
      error('JavaScriptVMService', `Failed to call method ${method}`, err);
      throw err;
    }
  }

  /**
   * Load accounts from persistent storage
   */
  private loadAccounts(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const accountData = JSON.parse(stored);
        this.accounts = accountData;
        debug('JavaScriptVMService', `Loaded ${this.accounts.length} accounts from storage`);
      } else {
        this.createDefaultAccounts();
      }
    } catch (err) {
      error('JavaScriptVMService', 'Failed to load accounts from storage', err);
      this.createDefaultAccounts();
    }
  }

  /**
   * Save accounts to persistent storage
   */
  private saveAccounts(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.accounts));
      debug('JavaScriptVMService', `Saved ${this.accounts.length} accounts to storage`);
    } catch (err) {
      error('JavaScriptVMService', 'Failed to save accounts to storage', err);
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
        error('JavaScriptVMService', `Error in event listener for ${event}`, err);
      }
    }
  }
}

// Export singleton instance
export const javascriptVMService = JavaScriptVMService.getInstance();
