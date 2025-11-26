import Web3 from 'web3';
import type { Network, VMMode } from '@/types';
import { debug, info, warn, error } from '@/services/loggerService';
import { localVMService } from '@/services/localVMService';
import { walletConnectService } from '@/services/walletConnectService';
import { javascriptVMService } from '@/services/javascriptVMService';

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

  // Wallet provider management
  private walletProvider: 'metamask' | 'walletconnect' | 'javascriptvm' | null = null;

  // Predefined networks for easy access - aligned with verification service support
  private networks: Network[] = [
    // Ethereum networks
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
      id: 'sepolia',
      name: 'Sepolia Testnet',
      rpcUrl: 'https://sepolia.infura.io/v3/your-infura-key',
      chainId: 11155111,
      symbol: 'ETH',
      blockExplorer: 'https://sepolia.etherscan.io',
      isTestnet: true,
    },
    {
      id: 'holesky',
      name: 'Holesky Testnet',
      rpcUrl: 'https://holesky.infura.io/v3/your-infura-key',
      chainId: 17000,
      symbol: 'ETH',
      blockExplorer: 'https://holesky.etherscan.io',
      isTestnet: true,
    },

    // Arbitrum networks
    {
      id: 'arbitrum',
      name: 'Arbitrum One',
      rpcUrl: 'https://arb1.arbitrum.io/rpc',
      chainId: 42161,
      symbol: 'ETH',
      blockExplorer: 'https://arbiscan.io',
      isTestnet: false,
    },
    {
      id: 'arbitrum-nova',
      name: 'Arbitrum Nova',
      rpcUrl: 'https://nova.arbitrum.io/rpc',
      chainId: 42170,
      symbol: 'ETH',
      blockExplorer: 'https://nova.arbiscan.io',
      isTestnet: false,
    },
    {
      id: 'arbitrum-sepolia',
      name: 'Arbitrum Sepolia',
      rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
      chainId: 421614,
      symbol: 'ETH',
      blockExplorer: 'https://sepolia.arbiscan.io',
      isTestnet: true,
    },

    // Optimism networks
    {
      id: 'optimism',
      name: 'OP Mainnet',
      rpcUrl: 'https://mainnet.optimism.io',
      chainId: 10,
      symbol: 'ETH',
      blockExplorer: 'https://optimistic.etherscan.io',
      isTestnet: false,
    },
    {
      id: 'optimism-sepolia',
      name: 'OP Sepolia',
      rpcUrl: 'https://sepolia.optimism.io',
      chainId: 11155420,
      symbol: 'ETH',
      blockExplorer: 'https://sepolia-optimistic.etherscan.io',
      isTestnet: true,
    },

    // Base networks
    {
      id: 'base',
      name: 'Base Mainnet',
      rpcUrl: 'https://mainnet.base.org',
      chainId: 8453,
      symbol: 'ETH',
      blockExplorer: 'https://basescan.org',
      isTestnet: false,
    },
    {
      id: 'base-sepolia',
      name: 'Base Sepolia',
      rpcUrl: 'https://sepolia.base.org',
      chainId: 84532,
      symbol: 'ETH',
      blockExplorer: 'https://sepolia.basescan.org',
      isTestnet: true,
    },

    // Polygon networks
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
      id: 'polygon-amoy',
      name: 'Polygon Amoy',
      rpcUrl: 'https://rpc-amoy.polygon.technology',
      chainId: 80002,
      symbol: 'MATIC',
      blockExplorer: 'https://amoy.polygonscan.com',
      isTestnet: true,
    },

    // Blast networks
    {
      id: 'blast',
      name: 'Blast Mainnet',
      rpcUrl: 'https://rpc.blast.io',
      chainId: 81457,
      symbol: 'ETH',
      blockExplorer: 'https://blastscan.io',
      isTestnet: false,
    },
    {
      id: 'blast-sepolia',
      name: 'Blast Sepolia',
      rpcUrl: 'https://sepolia.blast.io',
      chainId: 168587773,
      symbol: 'ETH',
      blockExplorer: 'https://sepolia.blastscan.io',
      isTestnet: true,
    },

    // Linea networks
    {
      id: 'linea',
      name: 'Linea Mainnet',
      rpcUrl: 'https://rpc.linea.build',
      chainId: 59144,
      symbol: 'ETH',
      blockExplorer: 'https://lineascan.build',
      isTestnet: false,
    },
    {
      id: 'linea-sepolia',
      name: 'Linea Sepolia',
      rpcUrl: 'https://rpc.sepolia.linea.build',
      chainId: 59141,
      symbol: 'ETH',
      blockExplorer: 'https://sepolia.lineascan.build',
      isTestnet: true,
    },

    // Mantle networks
    {
      id: 'mantle',
      name: 'Mantle Mainnet',
      rpcUrl: 'https://rpc.mantle.xyz',
      chainId: 5000,
      symbol: 'MNT',
      blockExplorer: 'https://mantlescan.xyz',
      isTestnet: false,
    },
    {
      id: 'mantle-sepolia',
      name: 'Mantle Sepolia',
      rpcUrl: 'https://rpc.sepolia.mantle.xyz',
      chainId: 5003,
      symbol: 'MNT',
      blockExplorer: 'https://sepolia.mantlescan.xyz',
      isTestnet: true,
    },

    // Scroll networks
    {
      id: 'scroll',
      name: 'Scroll Mainnet',
      rpcUrl: 'https://rpc.scroll.io',
      chainId: 534352,
      symbol: 'ETH',
      blockExplorer: 'https://scrollscan.com',
      isTestnet: false,
    },
    {
      id: 'scroll-sepolia',
      name: 'Scroll Sepolia',
      rpcUrl: 'https://sepolia-rpc.scroll.io',
      chainId: 534351,
      symbol: 'ETH',
      blockExplorer: 'https://sepolia.scrollscan.com',
      isTestnet: true,
    },

    // zkSync networks
    {
      id: 'zksync',
      name: 'zkSync Era Mainnet',
      rpcUrl: 'https://mainnet.era.zksync.io',
      chainId: 324,
      symbol: 'ETH',
      blockExplorer: 'https://explorer.zksync.io',
      isTestnet: false,
    },
    {
      id: 'zksync-sepolia',
      name: 'zkSync Era Sepolia',
      rpcUrl: 'https://sepolia.era.zksync.dev',
      chainId: 300,
      symbol: 'ETH',
      blockExplorer: 'https://sepolia.explorer.zksync.io',
      isTestnet: true,
    },

    // BNB Smart Chain networks
    {
      id: 'bsc',
      name: 'BNB Smart Chain',
      rpcUrl: 'https://bsc-dataseed1.binance.org',
      chainId: 56,
      symbol: 'BNB',
      blockExplorer: 'https://bscscan.com',
      isTestnet: false,
    },
    {
      id: 'bsc-testnet',
      name: 'BNB Smart Chain Testnet',
      rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
      chainId: 97,
      symbol: 'BNB',
      blockExplorer: 'https://testnet.bscscan.com',
      isTestnet: true,
    },

    // Avalanche networks
    {
      id: 'avalanche',
      name: 'Avalanche C-Chain',
      rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
      chainId: 43114,
      symbol: 'AVAX',
      blockExplorer: 'https://snowtrace.io',
      isTestnet: false,
    },
    {
      id: 'avalanche-fuji',
      name: 'Avalanche Fuji',
      rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
      chainId: 43113,
      symbol: 'AVAX',
      blockExplorer: 'https://testnet.snowtrace.io',
      isTestnet: true,
    },

    // Celo networks
    {
      id: 'celo',
      name: 'Celo Mainnet',
      rpcUrl: 'https://forno.celo.org',
      chainId: 42220,
      symbol: 'CELO',
      blockExplorer: 'https://celoscan.io',
      isTestnet: false,
    },
    {
      id: 'celo-alfajores',
      name: 'Celo Alfajores',
      rpcUrl: 'https://alfajores-forno.celo-testnet.org',
      chainId: 44787,
      symbol: 'CELO',
      blockExplorer: 'https://alfajores.celoscan.io',
      isTestnet: true,
    },

    // Gnosis networks
    {
      id: 'gnosis',
      name: 'Gnosis Chain',
      rpcUrl: 'https://rpc.gnosischain.com',
      chainId: 100,
      symbol: 'xDAI',
      blockExplorer: 'https://gnosisscan.io',
      isTestnet: false,
    },

    // Hoodi Testnet
    {
      id: 'hoodi-testnet',
      name: 'Hoodi Testnet',
      rpcUrl: 'https://rpc-testnet.hoodi.io',
      chainId: 560048,
      symbol: 'ETH',
      blockExplorer: 'https://testnet.hoodiscan.com',
      isTestnet: true,
    },

    // Abstract networks
    {
      id: 'abstract',
      name: 'Abstract Mainnet',
      rpcUrl: 'https://api.mainnet.abstract.xyz',
      chainId: 2741,
      symbol: 'ETH',
      blockExplorer: 'https://explorer.abstract.xyz',
      isTestnet: false,
    },
    {
      id: 'abstract-sepolia',
      name: 'Abstract Sepolia Testnet',
      rpcUrl: 'https://api.sepolia.abstract.xyz',
      chainId: 11124,
      symbol: 'ETH',
      blockExplorer: 'https://sepolia.explorer.abstract.xyz',
      isTestnet: true,
    },

    // ApeChain networks
    {
      id: 'apechain-curtis',
      name: 'ApeChain Curtis Testnet',
      rpcUrl: 'https://curtis.rpc.caldera.xyz/http',
      chainId: 33111,
      symbol: 'APE',
      blockExplorer: 'https://curtis.explorer.caldera.xyz',
      isTestnet: true,
    },
    {
      id: 'apechain',
      name: 'ApeChain Mainnet',
      rpcUrl: 'https://apechain.caldera.xyz/http',
      chainId: 33139,
      symbol: 'APE',
      blockExplorer: 'https://apechain.caldera.xyz',
      isTestnet: false,
    },

    // Berachain networks
    {
      id: 'berachain',
      name: 'Berachain Mainnet',
      rpcUrl: 'https://rpc.berachain.com',
      chainId: 80094,
      symbol: 'BERA',
      blockExplorer: 'https://beratrail.io',
      isTestnet: false,
    },
    {
      id: 'berachain-bepolia',
      name: 'Berachain Bepolia Testnet',
      rpcUrl: 'https://rpc.bepolia.berachain.com',
      chainId: 80069,
      symbol: 'BERA',
      blockExplorer: 'https://bepolia.beratrail.io',
      isTestnet: true,
    },

    // BitTorrent Chain networks
    {
      id: 'bittorrent',
      name: 'BitTorrent Chain Mainnet',
      rpcUrl: 'https://rpc.bittorrentchain.io',
      chainId: 199,
      symbol: 'BTT',
      blockExplorer: 'https://bttcscan.com',
      isTestnet: false,
    },
    {
      id: 'bittorrent-testnet',
      name: 'BitTorrent Chain Testnet',
      rpcUrl: 'https://testrpc.bittorrentchain.io',
      chainId: 1028,
      symbol: 'BTT',
      blockExplorer: 'https://testnet.bttcscan.com',
      isTestnet: true,
    },

    // Cronos networks
    {
      id: 'cronos',
      name: 'Cronos Mainnet',
      rpcUrl: 'https://evm.cronos.org',
      chainId: 25,
      symbol: 'CRO',
      blockExplorer: 'https://cronoscan.com',
      isTestnet: false,
    },

    // Fraxtal networks
    {
      id: 'fraxtal',
      name: 'Fraxtal Mainnet',
      rpcUrl: 'https://rpc.frax.com',
      chainId: 252,
      symbol: 'frxETH',
      blockExplorer: 'https://fraxscan.com',
      isTestnet: false,
    },
    {
      id: 'fraxtal-testnet',
      name: 'Fraxtal Testnet',
      rpcUrl: 'https://rpc.testnet.frax.com',
      chainId: 2522,
      symbol: 'frxETH',
      blockExplorer: 'https://testnet.fraxscan.com',
      isTestnet: true,
    },

    // HyperEVM
    {
      id: 'hyperevm',
      name: 'HyperEVM',
      rpcUrl: 'https://rpc.hyperevm.com',
      chainId: 999,
      symbol: 'ETH',
      blockExplorer: 'https://explorer.hyperevm.com',
      isTestnet: false,
    },

    // Memecore networks
    {
      id: 'memecore',
      name: 'Memecore Mainnet',
      rpcUrl: 'https://rpc.memecore.com',
      chainId: 4352,
      symbol: 'MEME',
      blockExplorer: 'https://scan.memecore.com',
      isTestnet: false,
    },
    {
      id: 'memecore-testnet',
      name: 'Memecore Testnet',
      rpcUrl: 'https://rpc-testnet.memecore.com',
      chainId: 43521,
      symbol: 'MEME',
      blockExplorer: 'https://testnet.scan.memecore.com',
      isTestnet: true,
    },

    // Moonbeam networks
    {
      id: 'moonbase-alpha',
      name: 'Moonbase Alpha Testnet',
      rpcUrl: 'https://rpc.api.moonbase.moonbeam.network',
      chainId: 1287,
      symbol: 'DEV',
      blockExplorer: 'https://moonbase.moonscan.io',
      isTestnet: true,
    },
    {
      id: 'monad-testnet',
      name: 'Monad Testnet',
      rpcUrl: 'https://rpc.monad.xyz',
      chainId: 10143,
      symbol: 'MON',
      blockExplorer: 'https://explorer.monad.xyz',
      isTestnet: true,
    },
    {
      id: 'moonbeam',
      name: 'Moonbeam Mainnet',
      rpcUrl: 'https://rpc.api.moonbeam.network',
      chainId: 1284,
      symbol: 'GLMR',
      blockExplorer: 'https://moonbeam.moonscan.io',
      isTestnet: false,
    },
    {
      id: 'moonriver',
      name: 'Moonriver Mainnet',
      rpcUrl: 'https://rpc.api.moonriver.moonbeam.network',
      chainId: 1285,
      symbol: 'MOVR',
      blockExplorer: 'https://moonriver.moonscan.io',
      isTestnet: false,
    },

    // Katana (replacing Polygon zkEVM)
    {
      id: 'katana',
      name: 'Katana Mainnet',
      rpcUrl: 'https://rpc.katana.so',
      chainId: 747474,
      symbol: 'ETH',
      blockExplorer: 'https://explorer.katana.so',
      isTestnet: false,
    },

    // Sei networks
    {
      id: 'sei',
      name: 'Sei Mainnet',
      rpcUrl: 'https://evm-rpc.sei-apis.com',
      chainId: 1329,
      symbol: 'SEI',
      blockExplorer: 'https://seitrace.com',
      isTestnet: false,
    },
    {
      id: 'sei-testnet',
      name: 'Sei Testnet',
      rpcUrl: 'https://evm-rpc-testnet.sei-apis.com',
      chainId: 1328,
      symbol: 'SEI',
      blockExplorer: 'https://testnet.seitrace.com',
      isTestnet: true,
    },

    // Sonic networks
    {
      id: 'sonic-blaze',
      name: 'Sonic Blaze Testnet',
      rpcUrl: 'https://rpc.blaze.soniclabs.com',
      chainId: 57054,
      symbol: 'S',
      blockExplorer: 'https://blaze.soniclabs.com',
      isTestnet: true,
    },
    {
      id: 'sonic',
      name: 'Sonic Mainnet',
      rpcUrl: 'https://rpc.soniclabs.com',
      chainId: 146,
      symbol: 'S',
      blockExplorer: 'https://explorer.soniclabs.com',
      isTestnet: false,
    },

    // Sophon networks
    {
      id: 'sophon',
      name: 'Sophon Mainnet',
      rpcUrl: 'https://rpc.sophon.xyz',
      chainId: 50104,
      symbol: 'SOPH',
      blockExplorer: 'https://explorer.sophon.xyz',
      isTestnet: false,
    },
    {
      id: 'sophon-sepolia',
      name: 'Sophon Sepolia Testnet',
      rpcUrl: 'https://rpc.sepolia.sophon.xyz',
      chainId: 531050104,
      symbol: 'SOPH',
      blockExplorer: 'https://sepolia.explorer.sophon.xyz',
      isTestnet: true,
    },

    // Swellchain networks
    {
      id: 'swellchain',
      name: 'Swellchain Mainnet',
      rpcUrl: 'https://rpc.swellnetwork.io',
      chainId: 1923,
      symbol: 'ETH',
      blockExplorer: 'https://explorer.swellnetwork.io',
      isTestnet: false,
    },
    {
      id: 'swellchain-testnet',
      name: 'Swellchain Testnet',
      rpcUrl: 'https://rpc-testnet.swellnetwork.io',
      chainId: 1924,
      symbol: 'ETH',
      blockExplorer: 'https://testnet.explorer.swellnetwork.io',
      isTestnet: true,
    },

    // Taiko networks
    {
      id: 'taiko-hekla',
      name: 'Taiko Hekla L2 Testnet',
      rpcUrl: 'https://rpc.hekla.taiko.xyz',
      chainId: 167009,
      symbol: 'ETH',
      blockExplorer: 'https://hekla.taikoscan.network',
      isTestnet: true,
    },
    {
      id: 'taiko',
      name: 'Taiko Mainnet',
      rpcUrl: 'https://rpc.taiko.xyz',
      chainId: 167000,
      symbol: 'ETH',
      blockExplorer: 'https://taikoscan.network',
      isTestnet: false,
    },

    // Unichain networks
    {
      id: 'unichain',
      name: 'Unichain Mainnet',
      rpcUrl: 'https://rpc.unichain.org',
      chainId: 130,
      symbol: 'ETH',
      blockExplorer: 'https://uniscan.xyz',
      isTestnet: false,
    },
    {
      id: 'unichain-sepolia',
      name: 'Unichain Sepolia Testnet',
      rpcUrl: 'https://rpc.sepolia.unichain.org',
      chainId: 1301,
      symbol: 'ETH',
      blockExplorer: 'https://sepolia.uniscan.xyz',
      isTestnet: true,
    },

    // World networks
    {
      id: 'world',
      name: 'World Mainnet',
      rpcUrl: 'https://rpc.worldchain.org',
      chainId: 480,
      symbol: 'ETH',
      blockExplorer: 'https://worldscan.org',
      isTestnet: false,
    },
    {
      id: 'world-sepolia',
      name: 'World Sepolia Testnet',
      rpcUrl: 'https://rpc.sepolia.worldchain.org',
      chainId: 4801,
      symbol: 'ETH',
      blockExplorer: 'https://sepolia.worldscan.org',
      isTestnet: true,
    },

    // Xai networks
    {
      id: 'xai',
      name: 'Xai Mainnet',
      rpcUrl: 'https://xai-chain.net/rpc',
      chainId: 660279,
      symbol: 'XAI',
      blockExplorer: 'https://explorer.xai-chain.net',
      isTestnet: false,
    },
    {
      id: 'xai-sepolia',
      name: 'Xai Sepolia Testnet',
      rpcUrl: 'https://testnet-v2.xai-chain.net/rpc',
      chainId: 37714555429,
      symbol: 'XAI',
      blockExplorer: 'https://testnet-explorer-v2.xai-chain.net',
      isTestnet: true,
    },

    // XDC networks
    {
      id: 'xdc-apothem',
      name: 'XDC Apothem Testnet',
      rpcUrl: 'https://rpc.apothem.network',
      chainId: 51,
      symbol: 'TXDC',
      blockExplorer: 'https://explorer.apothem.network',
      isTestnet: true,
    },
    {
      id: 'xdc',
      name: 'XDC Mainnet',
      rpcUrl: 'https://rpc.xinfin.network',
      chainId: 50,
      symbol: 'XDC',
      blockExplorer: 'https://explorer.xinfin.network',
      isTestnet: false,
    },

    // opBNB networks
    {
      id: 'opbnb',
      name: 'opBNB Mainnet',
      rpcUrl: 'https://opbnb-mainnet-rpc.bnbchain.org',
      chainId: 204,
      symbol: 'BNB',
      blockExplorer: 'https://opbnbscan.com',
      isTestnet: false,
    },
    {
      id: 'opbnb-testnet',
      name: 'opBNB Testnet',
      rpcUrl: 'https://opbnb-testnet-rpc.bnbchain.org',
      chainId: 5611,
      symbol: 'BNB',
      blockExplorer: 'https://testnet.opbnbscan.com',
      isTestnet: true,
    },

    // Development
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
   * @param providerType The type of provider to connect to ('metamask', 'walletconnect', or 'javascriptvm')
   * @returns Whether the connection was successful
   */
  public async connect(providerType: 'metamask' | 'walletconnect' | 'javascriptvm' = 'metamask'): Promise<boolean> {
    try {
      this.isConnecting = true;
      this.emit('connecting');

      let success = false;

      if (providerType === 'metamask') {
        success = await this.connectToMetaMask();
        if (success) {
          this.walletProvider = 'metamask';
        }
      } else if (providerType === 'walletconnect') {
        success = await this.connectToWalletConnect();
        if (success) {
          this.walletProvider = 'walletconnect';
        }
      } else if (providerType === 'javascriptvm') {
        success = await this.connectToJavaScriptVM();
        if (success) {
          this.walletProvider = 'javascriptvm';
        }
      }

      if (!success) {
        this.isConnecting = false;
        this.emit('error', new Error(`Failed to connect using ${providerType}`));
        return false;
      }

      this.isConnecting = false;
      this.emit('providerConnected', providerType);
      return true;
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
      // Connect using the WalletConnect service
      const connected = await walletConnectService.connect();

      if (connected) {
        // Get provider and accounts from WalletConnect
        const wcProvider = walletConnectService.getProvider();
        const wcAccounts = walletConnectService.getAccounts();
        const wcChainId = walletConnectService.getChainId();

        if (wcProvider && wcAccounts.length > 0) {
          this.provider = wcProvider;
          this.web3 = new Web3(this.provider);
          this.account = wcAccounts[0];

          // Update network info
          if (wcChainId) {
            const network = this.getNetworkByChainId(wcChainId);
            if (network) {
              this.network = network;
            } else {
              // Create custom network if not found
              this.network = {
                id: `walletconnect-${wcChainId}`,
                name: `WalletConnect Chain ${wcChainId}`,
                rpcUrl: '',
                chainId: wcChainId,
                symbol: 'ETH',
                blockExplorer: '',
                isTestnet: wcChainId !== 1,
              };
            }
          }

          this.isConnected = true;
          this.isConnecting = false;

          info('Web3Service', `Connected to WalletConnect with account: ${this.account}`);
          this.emit('connected', { account: this.account, network: this.network, provider: 'WalletConnect' });

          return true;
        }
      }

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
   * Connect to JavaScript VM
   * @returns Whether the connection was successful
   */
  private async connectToJavaScriptVM(): Promise<boolean> {
    try {
      // Connect using the JavaScript VM service
      const connected = await javascriptVMService.connect();

      if (connected) {
        // Get provider and accounts from JavaScript VM
        const vmProvider = javascriptVMService.getWeb3();
        const vmAccounts = javascriptVMService.getAccounts();
        const vmNetwork = javascriptVMService.getVMNetwork();

        if (vmProvider && vmAccounts.length > 0) {
          this.provider = javascriptVMService.getWeb3();
          this.web3 = javascriptVMService.getWeb3();
          this.account = vmAccounts[0].address;
          this.network = vmNetwork;
          this.chainId = vmNetwork.chainId;

          this.isConnected = true;
          this.isConnecting = false;

          info('Web3Service', `Connected to JavaScript VM with account: ${this.account}`);
          this.emit('connected', { account: this.account, network: this.network, provider: 'JavaScript VM' });

          return true;
        }
      }

      this.isConnecting = false;
      return false;
    } catch (err) {
      error('Web3Service', 'Failed to connect to JavaScript VM', err);
      this.isConnecting = false;
      this.emit('error', err);
      return false;
    }
  }

  /**
   * Disconnect from the current wallet
   */
  public async disconnect(): Promise<void> {
    // Disconnect from WalletConnect if connected
    if (this.walletProvider === 'walletconnect' && walletConnectService.isConnected()) {
      await walletConnectService.disconnect();
    }

    // Disconnect from JavaScript VM if connected
    if (this.walletProvider === 'javascriptvm' && javascriptVMService.isVMConnected()) {
      javascriptVMService.disconnect();
    }

    this.web3 = null;
    this.provider = null;
    this.account = null;
    this.network = null;
    this.chainId = null;
    this.walletProvider = null;
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
   * Get the current wallet provider type
   * @returns The wallet provider type or null if not connected
   */
  public getWalletProvider(): 'metamask' | 'walletconnect' | 'javascriptvm' | null {
    return this.walletProvider;
  }

  /**
   * Check if MetaMask is available
   * @returns Whether MetaMask is available
   */
  public isMetaMaskAvailable(): boolean {
    return typeof window !== 'undefined' && !!window.ethereum;
  }

  /**
   * Check if WalletConnect is available
   * @returns Whether WalletConnect is available
   */
  public isWalletConnectAvailable(): boolean {
    return true; // WalletConnect is always available after initialization
  }

  /**
   * Get available wallet providers
   * @returns Array of available wallet providers
   */
  public getAvailableWalletProviders(): Array<{ id: 'metamask' | 'walletconnect' | 'javascriptvm'; name: string; icon: string }> {
    const providers = [];

    if (this.isMetaMaskAvailable()) {
      providers.push({
        id: 'metamask' as const,
        name: 'MetaMask',
        icon: '🦊'
      });
    }

    providers.push({
      id: 'walletconnect' as const,
      name: 'WalletConnect',
      icon: '🔗'
    });

    // JavaScript VM is always available
    providers.push({
      id: 'javascriptvm' as const,
      name: 'JavaScript VM',
      icon: '⚡'
    });

    return providers;
  }

  /**
   * Check if JavaScript VM is available
   * @returns Whether JavaScript VM is available
   */
  public isJavaScriptVMAvailable(): boolean {
    return true; // JavaScript VM is always available
  }

  /**
   * Check if network is supported by the current provider
   * @param chainId The chain ID to check
   * @returns Whether the network is supported
   */
  public isNetworkSupported(chainId: number): boolean {
    if (this.walletProvider === 'walletconnect') {
      return walletConnectService.isNetworkSupported(chainId);
    }
    // MetaMask supports all EVM networks
    return true;
  }

  /**
   * Get the recommended wallet provider based on device and user agent
   * @returns The recommended wallet provider
   */
  public getRecommendedProvider(): 'metamask' | 'walletconnect' {
    // Check if MetaMask is available
    if (this.isMetaMaskAvailable()) {
      return 'metamask';
    }

    // Check if mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      return 'walletconnect'; // Better for mobile wallets
    }

    return 'walletconnect';
  }

  /**
   * Get wallet connection status information
   * @returns Detailed connection status
   */
  public getConnectionStatus(): {
    connected: boolean;
    provider: string;
    account: string | null;
    network: Network | null;
    chainId: number | null;
    isConnecting: boolean;
    error: string | null;
  } {
    return {
      connected: this.isConnected,
      provider: this.walletProvider || 'none',
      account: this.account,
      network: this.network,
      chainId: this.chainId,
      isConnecting: this.isConnecting,
      error: this.listeners.has('error') ? null : null,
    };
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
