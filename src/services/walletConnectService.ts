import { EthereumProvider } from '@walletconnect/ethereum-provider';
import { SignClient } from '@walletconnect/sign-client';
import type { PairingTypes, SessionTypes } from '@walletconnect/types';
import { debug, info, warn, error } from '@/services/loggerService';
import type { Network } from '@/types';

interface WalletConnectConfig {
  projectId: string;
  metadata: {
    description: string;
    url: string;
    icons: string[];
    name: string;
  };
  networks: number[];
}

interface WalletConnectConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  provider: EthereumProvider | null;
  session: SessionTypes.Session | null;
  accounts: string[];
  chainId: number | null;
  error: string | null;
}

/**
 * Service for managing WalletConnect v2 integration
 * This service handles:
 * - WalletConnect v2 provider initialization and configuration
 * - Connection lifecycle management
 * - Session handling and persistence
 * - Multi-wallet support
 * - Event handling for wallet interactions
 */
export class WalletConnectService {
  private static instance: WalletConnectService;
  private signClient: SignClient | null = null;
  private provider: EthereumProvider | null = null;
  private connectionState: WalletConnectConnectionState = {
    isConnected: false,
    isConnecting: false,
    provider: null,
    session: null,
    accounts: [],
    chainId: null,
    error: null,
  };
  private listeners: Map<string, Function[]> = new Map();

  // WalletConnect v2 configuration
  private readonly config: WalletConnectConfig = {
    projectId: 'remix-ide-walletconnect', // Should be replaced with actual project ID
    metadata: {
      description: 'Remix IDE Clone - Web3 development environment',
      url: 'http://localhost:5173',
      icons: ['https://remix.ethereum.org/assets/icon-192.png'],
      name: 'Remix IDE Clone',
    },
    // Key networks for development
    networks: [
      1,     // Ethereum Mainnet
      11155111, // Sepolia
      42161, // Arbitrum
      137,   // Polygon
      43114, // Avalanche
      56,    // BNB Chain
    ],
  };

  private constructor() {
    debug('WalletConnectService', 'Initializing WalletConnectService');
    this.initializeSignClient();
  }

  /**
   * Get the singleton instance of WalletConnectService
   */
  public static getInstance(): WalletConnectService {
    if (!WalletConnectService.instance) {
      WalletConnectService.instance = new WalletConnectService();
    }
    return WalletConnectService.instance;
  }

  /**
   * Initialize the SignClient
   */
  private async initializeSignClient(): Promise<void> {
    try {
      this.signClient = await SignClient.init({
        projectId: this.config.projectId,
        metadata: this.config.metadata,
      });

      // Restore existing session
      const sessions = this.signClient.getActiveSessions();
      if (Object.keys(sessions).length > 0) {
        const session = Object.values(sessions)[0];
        await this.restoreSession(session);
      }

      // Set up event listeners
      this.setupEventListeners();

      debug('WalletConnectService', 'SignClient initialized successfully');
    } catch (err) {
      error('WalletConnectService', 'Failed to initialize SignClient', err);
    }
  }

  /**
   * Initialize WalletConnect provider
   */
  public async initializeProvider(): Promise<boolean> {
    try {
      if (!this.signClient) {
        await this.initializeSignClient();
      }

      this.provider = await EthereumProvider.init({
        projectId: this.config.projectId,
        chains: this.config.networks,
        methods: [
          'eth_sendTransaction',
          'eth_signTransaction',
          'eth_sign',
          'personal_sign',
          'eth_signTypedData',
          'eth_signTypedData_v4',
          'wallet_addEthereumChain',
          'wallet_switchEthereumChain',
        ],
        events: ['chainChanged', 'accountsChanged', 'disconnect'],
        // Show QR code modal for mobile wallets
        showQrModal: true,
        // Enable mobile wallet detection
        mobile: {
          native: 'Universal URL',
          universal: 'https://unstoppabledomains.com',
        },
        // Enable wallet selection
        enableWalletConnect: true,
      });

      this.connectionState.provider = this.provider;
      this.setupProviderEventListeners();

      debug('WalletConnectService', 'WalletConnect provider initialized');
      return true;
    } catch (err) {
      error('WalletConnectService', 'Failed to initialize WalletConnect provider', err);
      return false;
    }
  }

  /**
   * Connect to a wallet via WalletConnect
   */
  public async connect(): Promise<boolean> {
    try {
      if (!this.provider) {
        const initialized = await this.initializeProvider();
        if (!initialized) {
          throw new Error('Failed to initialize WalletConnect provider');
        }
      }

      this.setConnecting(true);
      this.setError(null);

      // Connect using the provider
      await this.provider.connect();

      // Wait for connection to be established
      await this.waitForConnection();

      this.setConnected(true);
      this.setConnecting(false);

      info('WalletConnectService', 'Connected successfully via WalletConnect');
      this.emit('connected', this.getConnectionInfo());

      return true;
    } catch (err) {
      error('WalletConnectService', 'Failed to connect via WalletConnect', err);
      this.setConnecting(false);
      this.setConnected(false);
      this.setError(err instanceof Error ? err.message : 'Connection failed');

      this.emit('error', err);
      return false;
    }
  }

  /**
   * Disconnect from the current wallet
   */
  public async disconnect(): Promise<boolean> {
    try {
      if (this.provider && this.connectionState.isConnected) {
        await this.provider.disconnect();
      }

      if (this.signClient && this.connectionState.session) {
        await this.signClient.disconnect({
          topic: this.connectionState.session.topic,
          reason: 'User disconnected',
        });
      }

      // Reset state
      this.connectionState = {
        isConnected: false,
        isConnecting: false,
        provider: null,
        session: null,
        accounts: [],
        chainId: null,
        error: null,
      };

      info('WalletConnectService', 'Disconnected from WalletConnect');
      this.emit('disconnected');

      return true;
    } catch (err) {
      error('WalletConnectService', 'Failed to disconnect', err);
      return false;
    }
  }

  /**
   * Get the provider instance
   */
  public getProvider(): EthereumProvider | null {
    return this.provider;
  }

  /**
   * Get the current session
   */
  public getSession(): SessionTypes.Session | null {
    return this.connectionState.session;
  }

  /**
   * Get current connection state
   */
  public getConnectionState(): WalletConnectConnectionState {
    return { ...this.connectionState };
  }

  /**
   * Get connected accounts
   */
  public getAccounts(): string[] {
    return this.connectionState.accounts;
  }

  /**
   * Get current chain ID
   */
  public getChainId(): number | null {
    return this.connectionState.chainId;
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.connectionState.isConnected;
  }

  /**
   * Check if connecting
   */
  public isConnecting(): boolean {
    return this.connectionState.isConnecting;
  }

  /**
   * Check if the current network is supported
   */
  public isNetworkSupported(chainId: number): boolean {
    return this.config.networks.includes(chainId);
  }

  /**
   * Switch to a different network
   */
  public async switchNetwork(chainId: number): Promise<boolean> {
    try {
      if (!this.provider) {
        throw new Error('Provider not initialized');
      }

      if (!this.isNetworkSupported(chainId)) {
        throw new Error(`Network ${chainId} is not supported`);
      }

      await this.provider.switchChain(chainId);
      this.connectionState.chainId = chainId;

      info('WalletConnectService', `Switched to chain ${chainId}`);
      this.emit('chainChanged', chainId);

      return true;
    } catch (err) {
      error('WalletConnectService', 'Failed to switch network', err);
      this.emit('error', err);
      return false;
    }
  }

  /**
   * Add a new network to the wallet
   */
  public async addNetwork(network: Network): Promise<boolean> {
    try {
      if (!this.provider) {
        throw new Error('Provider not initialized');
      }

      // This would typically involve calling wallet_addEthereumChain
      // Implementation depends on provider capabilities
      debug('WalletConnectService', `Adding network ${network.name}`);

      return true;
    } catch (err) {
      error('WalletConnectService', 'Failed to add network', err);
      return false;
    }
  }

  /**
   * Get supported networks
   */
  public getSupportedNetworks(): number[] {
    return [...this.config.networks];
  }

  /**
   * Get connection information
   */
  public getConnectionInfo() {
    return {
      provider: 'WalletConnect',
      connected: this.connectionState.isConnected,
      accounts: this.connectionState.accounts,
      chainId: this.connectionState.chainId,
      session: this.connectionState.session,
    };
  }

  /**
   * Wait for connection to be established
   */
  private async waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 30000); // 30 second timeout

      const checkConnection = () => {
        if (this.connectionState.isConnected) {
          clearTimeout(timeout);
          resolve();
        } else if (this.connectionState.error) {
          clearTimeout(timeout);
          reject(new Error(this.connectionState.error));
        } else {
          setTimeout(checkConnection, 100);
        }
      };

      checkConnection();
    });
  }

  /**
   * Restore existing session
   */
  private async restoreSession(session: SessionTypes.Session): Promise<void> {
    try {
      this.connectionState.session = session;
      this.connectionState.accounts = session.namespaces.eip155.accounts.map(account =>
        account.split('@eip155:')[1] || account
      );
      this.connectionState.chainId = session.namespaces.eip155.chains[0]
        ? parseInt(session.namespaces.eip155.chains[0].split(':')[1])
        : null;

      this.setConnected(true);
      info('WalletConnectService', 'Session restored');
    } catch (err) {
      error('WalletConnectService', 'Failed to restore session', err);
    }
  }

  /**
   * Set up SignClient event listeners
   */
  private setupEventListeners(): void {
    if (!this.signClient) return;

    this.signClient.on('session_connect', (event: PairingTypes.Struct) => {
      info('WalletConnectService', 'Session connected', event);
      this.emit('sessionConnected', event);
    });

    this.signClient.on('session_update', (event: PairingTypes.Struct) => {
      info('WalletConnectService', 'Session updated', event);
      this.emit('sessionUpdated', event);
    });

    this.signClient.on('session_delete', (event: { topic: string }) => {
      info('WalletConnectService', 'Session deleted', event);
      this.setConnected(false);
      this.emit('sessionDeleted', event);
    });

    this.signClient.on('pairing_delete', (event: { topic: string }) => {
      info('WalletConnectService', 'Pairing deleted', event);
    });
  }

  /**
   * Set up provider event listeners
   */
  private setupProviderEventListeners(): void {
    if (!this.provider) return;

    this.provider.on('accountsChanged', (accounts: string[]) => {
      info('WalletConnectService', 'Accounts changed', accounts);
      this.connectionState.accounts = accounts;
      this.emit('accountsChanged', accounts);
    });

    this.provider.on('chainChanged', (chainId: string) => {
      info('WalletConnectService', 'Chain changed', chainId);
      this.connectionState.chainId = parseInt(chainId);
      this.emit('chainChanged', this.connectionState.chainId);
    });

    this.provider.on('disconnect', (error?: Error) => {
      info('WalletConnectService', 'Provider disconnected', error);
      this.setConnected(false);
      this.emit('disconnect', error);
    });

    this.provider.on('connect', (info: { chainId: string }) => {
      info('WalletConnectService', 'Provider connected', info);
      this.setConnected(true);
      this.connectionState.chainId = parseInt(info.chainId);
      this.emit('connect', info);
    });
  }

  /**
   * Set connection state
   */
  private setConnected(connected: boolean): void {
    this.connectionState.isConnected = connected;
  }

  private setConnecting(connecting: boolean): void {
    this.connectionState.isConnecting = connecting;
  }

  private setError(error: string | null): void {
    this.connectionState.error = error;
  }

  /**
   * Add event listener
   */
  public on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  /**
   * Remove event listener
   */
  public off(event: string, callback: Function): void {
    if (!this.listeners.has(event)) return;

    const callbacks = this.listeners.get(event) || [];
    const index = callbacks.indexOf(callback);
    if (index !== -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * Emit event
   */
  private emit(event: string, data?: any): void {
    if (!this.listeners.has(event)) return;

    const callbacks = this.listeners.get(event) || [];
    for (const callback of callbacks) {
      try {
        callback(data);
      } catch (err) {
        error('WalletConnectService', `Error in event listener for ${event}`, err);
      }
    }
  }
}

// Export singleton instance
export const walletConnectService = WalletConnectService.getInstance();

// Add global types for WalletConnect
declare global {
  interface Window {
    ethereum?: any;
  }
}
