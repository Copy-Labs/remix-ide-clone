import Web3 from 'web3';
import type { Network } from '@/types';
import { debug, error, info, warn } from '@/services/loggerService';
import { vmProviderService } from '@/services/vmProviderService';

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

  // Test accounts functionality - Using Remix-IDE style test accounts
  // These are the same accounts that Remix-IDE provides by default
  private testAccounts: Array<{ address: string; privateKey: string; balance: string }> = [
    {
      address: '0x5B38Da6a701c568545dCfcB03FcB875f56beddC4',
      privateKey: '0x503f38a9c967ed597e47fe25643985f032b072db8075426a92110f82df48dfcb',
      balance: '100',
    },
    {
      address: '0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2',
      privateKey: '0x7e5bfb82febc4c2c8529167104271ceec190eafdca277314912eaabdb67c6e5f',
      balance: '100',
    },
    {
      address: '0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db',
      privateKey: '0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c5cf5520e4e6fc7dda',
      balance: '100',
    },
    {
      address: '0x78731D3Ca6b7E34aC0F824c42a7cC18A495cabaB',
      privateKey: '0x6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1',
      balance: '100',
    },
    {
      address: '0x617F2E2fD72FD9D5503197092aC168c91465E7f2',
      privateKey: '0x6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c',
      balance: '100',
    },
    {
      address: '0x17F6AD8Ef982297579C203069C1DbfFE4348c372',
      privateKey: '0x646f1ce2fdad0e6deeeb5c7e8e5543bdde65e86029e2fd9fc169899c440a7913',
      balance: '100',
    },
    {
      address: '0x5c6B0f7Bf3E7ce046039Bd8FABdfD3f9F5021678',
      privateKey: '0xadd53f9a7e588d003326d1cbf9e4a43c061aadd9bc938c843a79e7b4fd2ad743',
      balance: '100',
    },
    {
      address: '0x03C6FcED478cBbC9a4FAB34eF9f40767739D1Ff7',
      privateKey: '0x395df67f0c2d2d9fe1ad08d1bc8b6627011959b79c53d7dd6a3536a33ab8a4fd',
      balance: '100',
    },
    {
      address: '0x1aE0EA34a72D944a8C7603FfB3eC30a6669E454C',
      privateKey: '0xe485d098507f54e7733a205420dfddbe58db035fa577fc294ebd14db90767a52',
      balance: '100',
    },
    {
      address: '0x0A098Eda01Ce92ff4A4CCb7A4fFFb5A43EBC70DC',
      privateKey: '0xa453611d9419d0e56f499079478fd72c37b251a94bfde4d19872c44cf65386e3',
      balance: '100',
    },
  ];
  private isUsingTestAccount: boolean = false;
  private isUsingVM: boolean = false;
  private selectedTestAccount: number = -1;

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
   * @param providerType The type of provider to connect to ('metamask', 'walletconnect', 'test', or 'vm')
   * @param testAccountIndex Optional index of test account to use (only for 'test' provider)
   * @returns Whether the connection was successful
   */
  public async connect(
    providerType: 'metamask' | 'walletconnect' | 'test' | 'vm' = 'metamask',
    testAccountIndex?: number,
  ): Promise<boolean> {
    try {
      this.isConnecting = true;
      this.emit('connecting');

      if (providerType === 'metamask') {
        // Disconnect from test account if previously connected
        if (this.isUsingTestAccount) {
          this.disconnectTestAccount();
        }
        return await this.connectToMetaMask();
      } else if (providerType === 'walletconnect') {
        // Disconnect from test account if previously connected
        if (this.isUsingTestAccount) {
          this.disconnectTestAccount();
        }
        return await this.connectToWalletConnect();
      } else if (providerType === 'test') {
        return await this.connectToTestAccount(testAccountIndex);
      } else if (providerType === 'vm') {
        return await this.connectToVM();
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
   * Switch to a different VM account (only works when connected to VM)
   * @param accountIndex Index of the VM account to switch to
   * @returns Whether the switch was successful
   */
  public async switchVMAccount(accountIndex: number): Promise<boolean> {
    try {
      if (!this.isUsingVM) {
        error('Web3Service', 'Cannot switch VM account: not connected to VM');
        return false;
      }

      // Check if the account index is valid
      if (accountIndex < 0 || accountIndex >= this.testAccounts.length) {
        error('Web3Service', `Invalid VM account index: ${accountIndex}`);
        return false;
      }

      // Switch to the selected account
      this.account = this.testAccounts[accountIndex].address;
      this.selectedTestAccount = accountIndex;

      info('Web3Service', `Switched to VM account: ${this.account} (index: ${accountIndex})`);
      this.emit('connected', { account: this.account, network: this.network });

      return true;
    } catch (err) {
      error('Web3Service', 'Failed to switch VM account', err);
      return false;
    }
  }

  /**
   * Disconnect from the current wallet
   */
  public async disconnect(): Promise<void> {
    // If using JavaScript VM, stop it
    if (this.isUsingVM) {
      info('Web3Service', 'Stopping JavaScript VM...');
      await vmProviderService.stop();
    }

    this.web3 = null;
    this.provider = null;
    this.account = null;
    this.network = null;
    this.chainId = null;
    this.isConnected = false;
    this.isUsingTestAccount = false;
    this.isUsingVM = false;
    this.selectedTestAccount = -1;

    info('Web3Service', 'Disconnected from wallet');
    this.emit('disconnected');
  }

  /**
   * Get all available test accounts
   * @returns Array of test accounts
   */
  public getTestAccounts(): Array<{ address: string; balance: string }> {
    // Return a copy of the test accounts without the private keys for security
    return this.testAccounts.map((account) => ({
      address: account.address,
      balance: account.balance,
    }));
  }

  /**
   * Check if currently using a test account
   * @returns Whether using a test account
   */
  public isUsingTestWallet(): boolean {
    return this.isUsingTestAccount;
  }

  /**
   * Get the index of the selected test account
   * @returns The index of the selected test account or -1 if not using a test account
   */
  public getSelectedTestAccountIndex(): number {
    return this.selectedTestAccount;
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

      // If using a test account, return the balance from the test account
      if (this.isUsingTestAccount && this.selectedTestAccount >= 0) {
        return this.testAccounts[this.selectedTestAccount].balance;
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

      // For JavaScript VM, gas price is always 0
      if (this.isUsingTestAccount && this.network?.id === 'javascriptvm') {
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

      // For JavaScript VM, return a high default value
      if (this.isUsingTestAccount && this.network?.id === 'javascriptvm') {
        // In JavaScript VM, gas estimation is not critical as gas is free
        // Return a high default value to ensure transactions succeed
        return 6000000;
      }

      const gas = await this.web3.eth.estimateGas(tx);
      return gas;
    } catch (err) {
      error('Web3Service', 'Failed to estimate gas', err);

      // For JavaScript VM, return a high default value even on error
      if (this.isUsingTestAccount && this.network?.id === 'javascriptvm') {
        return 6000000;
      }

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

      // For JavaScript VM, use shorter interval and fewer attempts
      if (this.isUsingTestAccount && this.network?.id === 'javascriptvm') {
        maxAttempts = 3;
        interval = 500;

        // In JavaScript VM, contracts are deployed immediately
        // We can return true immediately for most cases, but we'll still check to be safe
        const exists = await this.contractExists(address);
        if (exists) {
          info('Web3Service', `Contract confirmed at ${address} in JavaScript VM`);
          return true;
        }
      }

      let attempts = 0;
      while (attempts < maxAttempts) {
        const exists = await this.contractExists(address);
        if (exists) {
          if (this.isUsingTestAccount && this.network?.id === 'javascriptvm') {
            info(
              'Web3Service',
              `Contract confirmed at ${address} in JavaScript VM after ${attempts + 1} attempts`,
            );
          } else {
            info('Web3Service', `Contract confirmed at ${address} after ${attempts + 1} attempts`);
          }
          return true;
        }

        // Wait before next attempt
        await new Promise((resolve) => setTimeout(resolve, interval));
        attempts++;
      }

      if (this.isUsingTestAccount && this.network?.id === 'javascriptvm') {
        warn(
          'Web3Service',
          `Contract not found at ${address} in JavaScript VM after ${maxAttempts} attempts`,
        );
      } else {
        warn('Web3Service', `Contract not found at ${address} after ${maxAttempts} attempts`);
      }
      return false;
    } catch (err) {
      if (this.isUsingTestAccount && this.network?.id === 'javascriptvm') {
        error('Web3Service', `Failed to wait for contract at ${address} in JavaScript VM`, err);
      } else {
        error('Web3Service', `Failed to wait for contract at ${address}`, err);
      }
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

      // If using a test account, handle deployment differently
      if (this.isUsingTestAccount) {
        return this.deployContractWithTestAccount(abi, bytecode, args, options);
      }

      // Create contract instance
      const contract = new this.web3.eth.Contract(abi);

      // Ensure bytecode has 0x prefix
      const formattedBytecode = bytecode.startsWith('0x') ? bytecode : `0x${bytecode}`;

      // Estimate gas if not provided
      if (!options.gas) {
        const deployTx = contract.deploy({
          data: formattedBytecode,
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
          data: formattedBytecode,
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

        // If using a test account, handle read operation differently
        if (this.isUsingTestAccount) {
          return this.callContractReadMethodWithTestAccount(address, abi, method, args, options);
        }

        return await contract.methods[method](...args).call(options);
      } else {
        // If using a test account, handle write operation differently
        if (this.isUsingTestAccount) {
          return this.callContractMethodWithTestAccount(address, abi, method, args, options);
        }

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
   * Get current gas pricing information
   * @returns Gas pricing information including base fee and priority fee
   */
  public async getGasPricing(): Promise<{
    baseFeePerGas: string;
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
    gasPrice: string;
  } | null> {
    try {
      if (!this.web3) {
        return null;
      }

      // Get the latest block to get base fee information
      const latestBlock = await this.web3.eth.getBlock('latest');
      const gasPrice = await this.web3.eth.getGasPrice();

      // For EIP-1559 networks, calculate recommended fees
      let baseFeePerGas = '0';
      let maxFeePerGas = gasPrice;
      let maxPriorityFeePerGas = '1000000000'; // 1 Gwei default

      if (latestBlock.baseFeePerGas) {
        baseFeePerGas = latestBlock.baseFeePerGas.toString();
        // Recommended max fee = (base fee * 2) + priority fee
        const baseFee = BigInt(baseFeePerGas);
        const priorityFee = BigInt(maxPriorityFeePerGas);
        maxFeePerGas = (baseFee * 2n + priorityFee).toString();
      }

      info('Web3Service', 'Current gas pricing', {
        baseFeePerGas,
        maxFeePerGas,
        maxPriorityFeePerGas,
        gasPrice: gasPrice.toString(),
      });

      return {
        baseFeePerGas,
        maxFeePerGas,
        maxPriorityFeePerGas,
        gasPrice: gasPrice.toString(),
      };
    } catch (err) {
      error('Web3Service', 'Failed to get gas pricing', err);
      return null;
    }
  }

  /**
   * Estimate gas cost for a contract deployment
   * @param bytecode Contract bytecode
   * @param abi Contract ABI
   * @param args Constructor arguments
   * @returns Gas estimation details
   */
  public async estimateDeploymentGas(
    bytecode: string,
    abi: any[],
    args: any[] = [],
  ): Promise<{
    gasLimit: string;
    estimatedCost: string;
    gasPricing: any;
  } | null> {
    try {
      if (!this.web3 || !this.account) {
        return null;
      }

      // Create contract instance for estimation
      const contract = new this.web3.eth.Contract(abi);

      // Ensure bytecode has 0x prefix
      const formattedBytecode = bytecode.startsWith('0x') ? bytecode : `0x${bytecode}`;

      const deployTx = contract.deploy({
        data: formattedBytecode,
        arguments: args,
      });

      // Estimate gas
      const gasLimit = await deployTx.estimateGas({
        from: this.account,
      });

      // Get current gas pricing
      const gasPricing = await this.getGasPricing();
      if (!gasPricing) {
        return null;
      }

      // Calculate estimated cost in wei
      const gasLimitBN = BigInt(gasLimit.toString());
      const maxFeePerGasBN = BigInt(gasPricing.maxFeePerGas);
      const estimatedCostWei = gasLimitBN * maxFeePerGasBN;
      const estimatedCostEth = this.web3.utils.fromWei(estimatedCostWei.toString(), 'ether');

      info('Web3Service', 'Gas estimation for deployment', {
        gasLimit: gasLimit.toString(),
        estimatedCostEth,
        gasPricing,
      });

      return {
        gasLimit: gasLimit.toString(),
        estimatedCost: estimatedCostEth,
        gasPricing,
      };
    } catch (err) {
      error('Web3Service', 'Failed to estimate deployment gas', err);
      return null;
    }
  }

  /**
   * Estimate gas cost for a contract method call
   * @param address Contract address
   * @param abi Contract ABI
   * @param method Method name
   * @param args Method arguments
   * @returns Gas estimation details
   */
  public async estimateMethodGas(
    address: string,
    abi: any[],
    method: string,
    args: any[] = [],
  ): Promise<{
    gasLimit: string;
    estimatedCost: string;
    gasPricing: any;
  } | null> {
    try {
      if (!this.web3 || !this.account) {
        return null;
      }

      // Create contract instance
      const contract = new this.web3.eth.Contract(abi, address);

      // Check if method exists
      if (!contract.methods[method]) {
        return null;
      }

      // Estimate gas
      const gasLimit = await contract.methods[method](...args).estimateGas({
        from: this.account,
      });

      // Get current gas pricing
      const gasPricing = await this.getGasPricing();
      if (!gasPricing) {
        return null;
      }

      // Calculate estimated cost in wei
      const gasLimitBN = BigInt(gasLimit.toString());
      const maxFeePerGasBN = BigInt(gasPricing.maxFeePerGas);
      const estimatedCostWei = gasLimitBN * maxFeePerGasBN;
      const estimatedCostEth = this.web3.utils.fromWei(estimatedCostWei.toString(), 'ether');

      info('Web3Service', `Gas estimation for method ${method}`, {
        gasLimit: gasLimit.toString(),
        estimatedCostEth,
        gasPricing,
      });

      return {
        gasLimit: gasLimit.toString(),
        estimatedCost: estimatedCostEth,
        gasPricing,
      };
    } catch (err) {
      error('Web3Service', `Failed to estimate gas for method ${method}`, err);
      return null;
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
   * Connect to JavaScript VM (ethereumjs-vm)
   * @returns Whether the connection was successful
   */
  private async connectToVM(): Promise<boolean> {
    try {
      info('Web3Service', 'Connecting to JavaScript VM...');

      // Start the VM if it's not already running
      const vmStarted = await vmProviderService.start();
      if (!vmStarted) {
        throw new Error('Failed to start JavaScript VM');
      }

      // Get the VM provider
      const vmProvider = vmProviderService.getProvider();
      if (!vmProvider) {
        throw new Error('JavaScript VM provider is not available');
      }

      // Create a Web3 instance with the VM provider
      this.provider = vmProvider;
      this.web3 = new Web3(this.provider);
      // this.web3 = new Web3('http://localhost:7545'); // Use the VM's HTTP endpoint
      // this.web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:7545'))
      info('Web3Service', 'JavaScript VM provider created', { provider: this.provider });

      // Get the accounts from the VM
      const vmAccounts = vmProviderService.getAccounts();
      if (vmAccounts.length === 0) {
        throw new Error('No accounts available in JavaScript VM');
      }

      // Use the first account by default
      this.account = vmAccounts[0].address;

      // Set network information for the VM
      this.network = {
        name: 'JavaScript VM',
        chainId: 1337,
        networkId: 1337,
        rpcUrl: 'http://localhost:8545',
        symbol: 'ETH',
        explorer: '',
        enabled: true,
      };

      // Store VM accounts as test accounts for easy access
      this.testAccounts = vmAccounts.map((account) => ({
        address: account.address,
        privateKey: account.privateKey,
        balance: account.balance,
      }));

      this.selectedTestAccount = 0;
      this.isUsingTestAccount = true;
      this.isUsingVM = true;

      this.isConnected = true;
      this.isConnecting = false;

      info('Web3Service', `Connected to JavaScript VM with account: ${this.account}`);
      this.emit('connected', { account: this.account, network: this.network });

      return true;
    } catch (err) {
      error('Web3Service', 'Failed to connect to JavaScript VM', err);
      this.isConnecting = false;
      this.emit('error', err);
      return false;
    }
  }

  /**
   * Connect to a test account using a JavaScript VM Environment
   * @param accountIndex Index of the test account to use (optional)
   * @returns Whether the connection was successful
   */
  private async connectToTestAccount(accountIndex?: number): Promise<boolean> {
    try {
      // If no account index is provided, use the first account
      const index = accountIndex !== undefined ? accountIndex : 0;

      // Check if the account index is valid
      if (index < 0 || index >= this.testAccounts.length) {
        error('Web3Service', `Invalid test account index: ${index}`);
        this.isConnecting = false;
        this.emit('error', new Error(`Invalid test account index: ${index}`));
        return false;
      }

      // Create a JavaScript VM Environment provider
      // This uses Web3's built-in memory provider which simulates a blockchain in memory
      const vmProvider = new Web3.providers.WebsocketProvider('ws://localhost:8545');

      // Override the send method to handle our test accounts
      const originalSend = vmProvider.send.bind(vmProvider);
      vmProvider.send = (payload: any, callback: any) => {
        // Handle specific JSON-RPC methods for our test accounts
        if (payload.method === 'eth_accounts' || payload.method === 'eth_requestAccounts') {
          // Return all test account addresses
          const accounts = this.testAccounts.map((account) => account.address);
          callback(null, { id: payload.id, jsonrpc: '2.0', result: accounts });
          return;
        }

        if (payload.method === 'eth_getBalance') {
          // Find the account and return its balance
          const address = payload.params[0];
          const account = this.testAccounts.find(
            (acc) => acc.address.toLowerCase() === address.toLowerCase(),
          );
          if (account) {
            const balanceWei = this.web3?.utils.toWei(account.balance, 'ether') || '0';
            callback(null, {
              id: payload.id,
              jsonrpc: '2.0',
              result: this.web3?.utils.toHex(balanceWei) || '0x0',
            });
            return;
          }
        }

        // For other methods, use the original implementation
        originalSend(payload, callback);
      };

      this.web3 = new Web3(vmProvider);
      this.provider = vmProvider;

      // Set the account from the test accounts
      this.account = this.testAccounts[index].address;
      this.selectedTestAccount = index;
      this.isUsingTestAccount = true;

      // Set network to JavaScript VM
      this.network = {
        id: 'javascriptvm',
        name: 'JavaScript VM',
        rpcUrl: 'ws://localhost:8545', // This is just a placeholder
        chainId: 1337,
        symbol: 'ETH',
        blockExplorer: '',
        isTestnet: true,
      };

      this.chainId = this.network.chainId;
      this.isConnected = true;
      this.isConnecting = false;

      info('Web3Service', `Connected to JavaScript VM with test account: ${this.account}`);
      this.emit('connected', { account: this.account, network: this.network });

      return true;
    } catch (err) {
      error('Web3Service', 'Failed to connect to JavaScript VM', err);
      this.isConnecting = false;
      this.emit('error', err);
      return false;
    }
  }

  /**
   * Disconnect from the current test account
   */
  private disconnectTestAccount(): void {
    if (this.isUsingTestAccount) {
      this.isUsingTestAccount = false;
      this.selectedTestAccount = -1;
      info('Web3Service', 'Disconnected from test account');
    }
  }

  /**
   * Deploy a contract using a test account in the JavaScript VM Environment
   * @param abi The contract ABI
   * @param bytecode The contract bytecode
   * @param args The constructor arguments
   * @param options Transaction options
   * @returns The deployed contract address and transaction hash
   */
  private async deployContractWithTestAccount(
    abi: any[],
    bytecode: string,
    args: any[] = [],
    options: any = {},
  ): Promise<{ address: string; transactionHash: string } | null> {
    try {
      if (this.selectedTestAccount < 0 || !this.web3) {
        warn('Web3Service', 'Cannot deploy contract: no test account selected');
        return null;
      }

      // Get the test account
      const testAccount = this.testAccounts[this.selectedTestAccount];

      info('Web3Service', 'Deploying contract with JavaScript VM...', {
        account: testAccount.address,
        args,
        options,
      });

      // Add the account to web3 using the private key
      const account = this.web3.eth.accounts.privateKeyToAccount(testAccount.privateKey);
      this.web3.eth.accounts.wallet.add(account);

      // Create contract instance
      const contract = new this.web3.eth.Contract(abi);

      // Prepare deployment transaction
      // Ensure bytecode has 0x prefix
      const formattedBytecode = bytecode.startsWith('0x') ? bytecode : `0x0${bytecode}`;

      const deployTx = contract.deploy({
        data: formattedBytecode,
        arguments: args,
      });

      // Prepare transaction options for JavaScript VM
      // Use appropriate gas pricing based on the provided options
      const txOptions = {
        from: testAccount.address,
        gas: options.gas || 30000000, // Much higher default gas limit for JavaScript VM to prevent "Out of Gas" errors
        // Use EIP-1559 gas pricing if maxFeePerGas is provided, otherwise use legacy
        ...(options.maxFeePerGas
          ? {
              maxFeePerGas: options.maxFeePerGas || '2000000000', // 2 Gwei max fee per gas
              maxPriorityFeePerGas: options.maxPriorityFeePerGas || '1000000000', // 1 Gwei priority fee
              gasPrice: undefined,
            }
          : {
              gasPrice: options.gasPrice || '20000000000', // 20 Gwei for legacy pricing
              maxFeePerGas: undefined,
              maxPriorityFeePerGas: undefined,
            }),
        ...options,
      };

      // For JavaScript VM, we need to ensure a very high gas limit
      // The JavaScript VM still enforces gas limits

      info(
        'Web3Service',
        `Executing contract deployment in JavaScript VM with account ${testAccount.address}`,
        {
          formattedBytecode,
          txOptions,
        },
      );

      // Deploy the contract
      const deployed = await deployTx.send(txOptions);
      info('Web3Service', 'Contract deployed in JavaScript VM', { deployed });

      const address = deployed.options.address;
      // Generate a fake transaction hash if none is provided
      const transactionHash =
        deployed.transactionHash || `0x${Math.random().toString(16).substring(2)}`;

      // Log the deployment
      info(
        'Web3Service',
        `Contract deployed at ${address} in JavaScript VM, tx: ${transactionHash}`,
      );

      // In a JavaScript VM, we might want to simulate some blockchain confirmations
      // This is handled automatically by the VM provider we created

      return {
        address,
        transactionHash,
      };
    } catch (err) {
      error('Web3Service', 'Failed to deploy contract in JavaScript VM', err);
      // Provide more detailed error information to help with debugging
      console.error('Contract deployment details:', {
        bytecode: bytecode.substring(0, 50) + '...', // Show beginning of bytecode
        args,
        options, // Use the original options instead of txOptions
        constructorAbi: abi.find(item => item.type === 'constructor'),
      });
      this.emit('error', err);
      return null;
    }
  }

  /**
   * Call a contract read method (view/pure) using a test account in the JavaScript VM Environment
   * @param address The contract address
   * @param abi The contract ABI
   * @param method The method to call
   * @param args The method arguments
   * @param options Call options
   * @returns The actual result from the contract
   */
  private async callContractReadMethodWithTestAccount(
    address: string,
    abi: any[],
    method: string,
    args: any[] = [],
    options: any = {},
  ): Promise<any> {
    try {
      if (this.selectedTestAccount < 0 || !this.web3) {
        warn('Web3Service', 'Cannot call contract read method: no test account selected');
        return null;
      }

      // Get the test account
      const testAccount = this.testAccounts[this.selectedTestAccount];

      info('Web3Service', `Calling read method ${method} with JavaScript VM...`, {
        account: testAccount.address,
        address,
        method,
        args,
        options,
      });

      // Find the method in the ABI to determine if it's a read method
      const methodAbi = abi.find(
        (item) =>
          item.name === method &&
          (item.stateMutability === 'view' || item.stateMutability === 'pure'),
      );

      if (!methodAbi) {
        warn('Web3Service', `Method ${method} not found in ABI or is not a read method`);
        return null;
      }

      // Create a contract instance
      const contract = new this.web3.eth.Contract(abi, address);

      // Add the account to web3 using the private key
      const account = this.web3.eth.accounts.privateKeyToAccount(testAccount.privateKey);
      this.web3.eth.accounts.wallet.add(account);

      // For read methods (view/pure), we only need the from address
      // Gas parameters are not needed and can cause issues with ABI decoding
      const callOptions = {
        from: testAccount.address,
        // Don't include gas parameters for read methods as they don't consume gas
        ...options,
      };

      // Call the contract method with the JavaScript VM
      info(
        'Web3Service',
        `Executing contract call to ${method} in JavaScript VM with account ${testAccount.address}`,
      );
      const _result = contract.methods[method](...args);
      console.info('Web3Service', `Contract method call from ${method}`, {
        _result,
        callOptions,
        methodAbi,
      });
      const result = await _result.call(callOptions);

      info(
        'Web3Service',
        `Contract method ${method} call successful in JavaScript VM, result:`,
        result,
      );

      return result;
    } catch (err) {
      error('Web3Service', `Failed to call contract read method ${method} in JavaScript VM`, err);
      // Provide more detailed error information to help with debugging
      console.error('Contract call details:', {
        address,
        method,
        args,
        options,
        methodAbi: abi.find(item => item.name === method),
      });
      this.emit('error', err);
      return null;
    }
  }

  /**
   * Call a contract method using a test account in the JavaScript VM Environment
   * @param address The contract address
   * @param abi The contract ABI
   * @param method The method to call
   * @param args The method arguments
   * @param options Transaction options
   * @returns The transaction result
   */
  private async callContractMethodWithTestAccount(
    address: string,
    abi: any[],
    method: string,
    args: any[] = [],
    options: any = {},
  ): Promise<any> {
    try {
      if (this.selectedTestAccount < 0 || !this.web3) {
        warn('Web3Service', 'Cannot call contract method: no test account selected');
        return null;
      }

      // Get the test account
      const testAccount = this.testAccounts[this.selectedTestAccount];

      info('Web3Service', `Calling contract method ${method} with JavaScript VM...`, {
        account: testAccount.address,
        address,
        method,
        args,
        options,
      });

      // Create a contract instance
      const contract = new this.web3.eth.Contract(abi, address);

      // Add the account to web3 using the private key
      const account = this.web3.eth.accounts.privateKeyToAccount(testAccount.privateKey);
      this.web3.eth.accounts.wallet.add(account);

      // Prepare transaction options for JavaScript VM with EIP-1559 gas pricing
      const txOptions = {
        from: testAccount.address,
        gas: options.gas || 30000000, // Much higher default gas limit for JavaScript VM to prevent "Out of Gas" errors
        // Use EIP-1559 gas pricing for Shanghai hard fork
        maxFeePerGas: options.maxFeePerGas || '2000000000', // 2 Gwei max fee per gas
        maxPriorityFeePerGas: options.maxPriorityFeePerGas || '1000000000', // 1 Gwei priority fee
        // Remove legacy gasPrice when using EIP-1559
        gasPrice: undefined,
        ...options,
      };

      // For JavaScript VM, we need to ensure a very high gas limit
      // The JavaScript VM still enforces gas limits

      info(
        'Web3Service',
        `Executing contract transaction to ${method} in JavaScript VM with account ${testAccount.address}`,
      );

      // Send the transaction
      const receipt = await contract.methods[method](...args).send(txOptions);

      // Generate a fake transaction hash if none is provided
      if (!receipt.transactionHash) {
        receipt.transactionHash = `0x${Math.random().toString(16).substring(2)}`;
      }

      info(
        'Web3Service',
        `Contract method ${method} transaction successful in JavaScript VM, tx: ${receipt.transactionHash}`,
      );

      return receipt;
    } catch (err) {
      error('Web3Service', `Failed to call contract method ${method} in JavaScript VM`, err);
      // Provide more detailed error information to help with debugging
      console.error('Contract transaction details:', {
        address,
        method,
        args,
        txOptions,
        methodAbi: abi.find(item => item.name === method),
      });
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
