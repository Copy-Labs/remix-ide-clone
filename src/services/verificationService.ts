import { debug, info, warn, error } from '@/services/loggerService';
import { web3Service } from '@/services/web3Service';
import type { Network, CompiledContract, DeployedContract } from '@/types';
import { useCompilerStore } from '@/stores/compilerStore';

/**
 * Service for contract verification on block explorers
 * This service handles verification of smart contracts on various block explorers:
 * - Etherscan (Ethereum networks)
 * - Polygonscan (Polygon networks)
 * - Arbiscan (Arbitrum networks)
 * - Optimistic Etherscan (Optimism networks)
 * - BSCScan (Binance Smart Chain)
 * - etc.
 */
export class VerificationService {
  private static instance: VerificationService;
  private apiKeys: Map<string, string> = new Map();

  // Block explorer API endpoints for verification
  private verificationEndpoints: Record<string, string> = {
    // Ethereum networks
    etherscan: 'https://api.etherscan.io/api',
    'sepolia.etherscan': 'https://api-sepolia.etherscan.io/api',
    'holesky.etherscan': 'https://api-holesky.etherscan.io/api',

    // Polygon networks
    polygonscan: 'https://api.polygonscan.com/api',
    'amoy.polygonscan': 'https://api-amoy.polygonscan.com/api',

    // Arbitrum networks
    arbiscan: 'https://api.arbiscan.io/api',
    'nova.arbiscan': 'https://api-nova.arbiscan.io/api',
    'sepolia.arbiscan': 'https://api-sepolia.arbiscan.io/api',

    // Optimism networks
    'optimistic.etherscan': 'https://api-optimistic.etherscan.io/api',
    'sepolia.optimistic.etherscan': 'https://api-sepolia-optimistic.etherscan.io/api',

    // Base networks
    basescan: 'https://api.basescan.org/api',
    'sepolia.basescan': 'https://api-sepolia.basescan.org/api',

    // BNB Smart Chain
    bscscan: 'https://api.bscscan.com/api',
    'testnet.bscscan': 'https://api-testnet.bscscan.com/api',

    // Avalanche
    snowtrace: 'https://api.snowtrace.io/api',
    'testnet.snowtrace': 'https://api-testnet.snowtrace.io/api',

    // Other major networks
    blastscan: 'https://api.blastscan.io/api',
    'sepolia.blastscan': 'https://api-sepolia.blastscan.io/api',
    lineascan: 'https://api.lineascan.build/api',
    'sepolia.lineascan': 'https://api-sepolia.lineascan.build/api',
    mantlescan: 'https://api.mantlescan.xyz/api',
    'sepolia.mantlescan': 'https://api-sepolia.mantlescan.xyz/api',
    scrollscan: 'https://api.scrollscan.com/api',
    'sepolia.scrollscan': 'https://api-sepolia.scrollscan.com/api',
    zksync: 'https://api-era.zksync.network/api',
    'sepolia.zksync': 'https://api-sepolia-era.zksync.network/api',
    gnosisscan: 'https://api.gnosisscan.io/api',
    celoscan: 'https://api.celoscan.io/api',
    'alfajores.celoscan': 'https://api-alfajores.celoscan.io/api',
    cronoscan: 'https://api.cronoscan.com/api',
    fraxscan: 'https://api.fraxscan.com/api',
    'testnet.fraxscan': 'https://api-holesky.fraxscan.com/api',
    moonbeamscan: 'https://api-moonbeam.moonscan.io/api',
    moonriverscan: 'https://api-moonriver.moonscan.io/api',
    'testnet.moonbeamscan': 'https://api-moonbase.moonscan.io/api',
    opbnbscan: 'https://api-opbnb.bscscan.com/api',
    'testnet.opbnbscan': 'https://api-opbnb-testnet.bscscan.com/api',

    // Development
    localhost: 'http://localhost:8545/api',
  };

  // Map chain IDs to explorer types
  private chainToExplorer: Record<number, string> = {
    // Ethereum networks
    1: 'etherscan',                    // Ethereum Mainnet
    11155111: 'sepolia.etherscan',     // Sepolia Testnet
    17000: 'holesky.etherscan',        // Holesky Testnet
    560048: 'etherscan',               // Hoodi Testnet (use etherscan API)

    // Abstract networks
    2741: 'etherscan',                 // Abstract Mainnet (use etherscan API)
    11124: 'etherscan',                // Abstract Sepolia Testnet (use etherscan API)

    // ApeChain networks
    33111: 'etherscan',                // ApeChain Curtis Testnet (use etherscan API)
    33139: 'etherscan',                // ApeChain Mainnet (use etherscan API)

    // Arbitrum networks
    42170: 'nova.arbiscan',            // Arbitrum Nova Mainnet
    42161: 'arbiscan',                 // Arbitrum One Mainnet
    421614: 'sepolia.arbiscan',        // Arbitrum Sepolia Testnet

    // Avalanche networks
    43114: 'snowtrace',                // Avalanche C-Chain
    43113: 'testnet.snowtrace',        // Avalanche Fuji Testnet

    // Base networks
    8453: 'basescan',                  // Base Mainnet
    84532: 'sepolia.basescan',         // Base Sepolia Testnet

    // Berachain networks
    80094: 'etherscan',                // Berachain Mainnet (use etherscan API)
    80069: 'etherscan',                // Berachain Bepolia Testnet (use etherscan API)

    // BitTorrent Chain networks
    199: 'etherscan',                  // BitTorrent Chain Mainnet (use etherscan API)
    1028: 'etherscan',                 // BitTorrent Chain Testnet (use etherscan API)

    // Blast networks
    81457: 'blastscan',                // Blast Mainnet
    168587773: 'sepolia.blastscan',    // Blast Sepolia Testnet

    // BNB Smart Chain networks
    56: 'bscscan',                     // BNB Smart Chain Mainnet
    97: 'testnet.bscscan',             // BNB Smart Chain Testnet

    // Celo networks
    44787: 'alfajores.celoscan',       // Celo Alfajores Testnet
    42220: 'celoscan',                 // Celo Mainnet

    // Cronos networks
    25: 'cronoscan',                   // Cronos Mainnet

    // Fraxtal networks
    252: 'fraxscan',                   // Fraxtal Mainnet
    2522: 'testnet.fraxscan',          // Fraxtal Testnet

    // Gnosis networks
    100: 'gnosisscan',                 // Gnosis

    // HyperEVM networks
    999: 'etherscan',                  // HyperEVM (use etherscan API)

    // Linea networks
    59144: 'lineascan',                // Linea Mainnet
    59141: 'sepolia.lineascan',        // Linea Sepolia Testnet

    // Mantle networks
    5000: 'mantlescan',                // Mantle Mainnet
    5003: 'sepolia.mantlescan',        // Mantle Sepolia Testnet

    // Memecore networks
    4352: 'etherscan',                 // Memecore Mainnet (use etherscan API)
    43521: 'etherscan',                // Memecore Testnet (use etherscan API)

    // Moonbeam networks
    1287: 'testnet.moonbeamscan',      // Moonbase Alpha Testnet
    10143: 'etherscan',                // Monad Testnet (use etherscan API)
    1284: 'moonbeamscan',              // Moonbeam Mainnet
    1285: 'moonriverscan',             // Moonriver Mainnet

    // Optimism networks
    10: 'optimistic.etherscan',        // OP Mainnet
    11155420: 'sepolia.optimistic.etherscan', // OP Sepolia Testnet

    // Polygon networks
    80002: 'amoy.polygonscan',         // Polygon Amoy Testnet
    137: 'polygonscan',                // Polygon Mainnet
    747474: 'etherscan',               // Katana Mainnet (use etherscan API)

    // Sei networks
    1329: 'etherscan',                 // Sei Mainnet (use etherscan API)
    1328: 'etherscan',                 // Sei Testnet (use etherscan API)

    // Scroll networks
    534352: 'scrollscan',              // Scroll Mainnet
    534351: 'sepolia.scrollscan',      // Scroll Sepolia Testnet

    // Sonic networks
    57054: 'etherscan',                // Sonic Blaze Testnet (use etherscan API)
    146: 'etherscan',                  // Sonic Mainnet (use etherscan API)

    // Sophon networks
    50104: 'etherscan',                // Sophon Mainnet (use etherscan API)
    531050104: 'etherscan',            // Sophon Sepolia Testnet (use etherscan API)

    // Swellchain networks
    1923: 'etherscan',                 // Swellchain Mainnet (use etherscan API)
    1924: 'etherscan',                 // Swellchain Testnet (use etherscan API)

    // Taiko networks
    167009: 'etherscan',               // Taiko Hekla L2 Testnet (use etherscan API)
    167000: 'etherscan',               // Taiko Mainnet (use etherscan API)

    // Unichain networks
    130: 'etherscan',                  // Unichain Mainnet (use etherscan API)
    1301: 'etherscan',                 // Unichain Sepolia Testnet (use etherscan API)

    // World networks
    480: 'etherscan',                  // World Mainnet (use etherscan API)
    4801: 'etherscan',                 // World Sepolia Testnet (use etherscan API)

    // Xai networks
    660279: 'etherscan',               // Xai Mainnet (use etherscan API)
    37714555429: 'etherscan',          // Xai Sepolia Testnet (use etherscan API)

    // XDC networks
    51: 'etherscan',                   // XDC Apothem Testnet (use etherscan API)
    50: 'etherscan',                   // XDC Mainnet (use etherscan API)

    // zkSync networks
    324: 'zksync',                     // zkSync Mainnet
    300: 'sepolia.zksync',             // zkSync Sepolia Testnet

    // opBNB networks
    204: 'opbnbscan',                  // opBNB Mainnet
    5611: 'testnet.opbnbscan',         // opBNB Testnet

    // Development
    1337: 'localhost',                 // Localhost
  };

  private constructor() {
    debug('VerificationService', 'Initializing VerificationService');
    this.loadApiKeys();
  }

  /**
   * Get the singleton instance of VerificationService
   */
  public static getInstance(): VerificationService {
    if (!VerificationService.instance) {
      VerificationService.instance = new VerificationService();
    }
    return VerificationService.instance;
  }

  /**
   * Load API keys from localStorage
   */
  private loadApiKeys(): void {
    try {
      const storedKeys = localStorage.getItem('verification-api-keys');
      if (storedKeys) {
        const keys = JSON.parse(storedKeys);
        Object.entries(keys).forEach(([explorer, key]) => {
          this.apiKeys.set(explorer, key as string);
        });
        debug('VerificationService', 'Loaded API keys from localStorage');
      }
    } catch (err) {
      error('VerificationService', 'Failed to load API keys from localStorage', err);
    }
  }

  /**
   * Save API keys to localStorage
   */
  private saveApiKeys(): void {
    try {
      const keys: Record<string, string> = {};
      this.apiKeys.forEach((value, key) => {
        keys[key] = value;
      });
      localStorage.setItem('verification-api-keys', JSON.stringify(keys));
      debug('VerificationService', 'Saved API keys to localStorage');
    } catch (err) {
      error('VerificationService', 'Failed to save API keys to localStorage', err);
    }
  }

  /**
   * Set an API key for a specific block explorer
   * @param explorer The block explorer (e.g., 'etherscan', 'polygonscan')
   * @param apiKey The API key
   */
  public setApiKey(explorer: string, apiKey: string): void {
    if (apiKey && apiKey.trim() !== '') {
      this.apiKeys.set(explorer, apiKey);
      debug('VerificationService', `Set API key for ${explorer}`);
    } else {
      this.apiKeys.delete(explorer);
      debug('VerificationService', `Removed API key for ${explorer}`);
    }
    this.saveApiKeys();
  }

  /**
   * Get an API key for a specific block explorer
   * @param explorer The block explorer (e.g., 'etherscan', 'polygonscan')
   * @returns The API key or null if not found
   */
  public getApiKey(explorer: string): string | null {
    // First check if user has provided their own API key
    const userApiKey = this.apiKeys.get(explorer);
    if (userApiKey) {
      return userApiKey;
    }

    // Use the default Etherscan API key as fallback for compatible explorers
    if (this.isEtherscanCompatibleExplorer(explorer)) {
      const defaultEtherscanKey = import.meta.env.VITE_PUBLIC_ETHERSCAN_API_KEY;
      if (defaultEtherscanKey) {
        return defaultEtherscanKey;
      }
    }

    return null;
  }

  /**
   * Get all API keys
   * @returns A map of explorer names to API keys (only non-empty custom keys)
   */
  public getAllApiKeys(): Map<string, string> {
    const filteredKeys = new Map<string, string>();
    for (const [explorer, key] of this.apiKeys.entries()) {
      if (key && key.trim() !== '') {
        filteredKeys.set(explorer, key);
      }
    }
    return filteredKeys;
  }

  /**
   * Check if the explorer is an Etherscan-related explorer
   * @param explorer The block explorer type
   * @returns Whether the explorer is Etherscan-related
   */
  private isEtherscanExplorer(explorer: string): boolean {
    return explorer === 'etherscan' || explorer.endsWith('.etherscan');
  }

  /**
   * Check if the explorer is compatible with Etherscan API keys
   * @param explorer The block explorer type
   * @returns Whether the explorer can use Etherscan API keys as fallback
   */
  private isEtherscanCompatibleExplorer(explorer: string): boolean {
    // Etherscan-related explorers
    if (this.isEtherscanExplorer(explorer)) {
      return true;
    }

    // Other explorers that can use Etherscan API keys as fallback
    const compatibleExplorers = [
      'scrollscan',
      'sepolia.scrollscan',
      'arbiscan',
      'nova.arbiscan',
      'sepolia.arbiscan',
      'optimistic.etherscan',
      'sepolia.optimistic.etherscan',
      'basescan',
      'sepolia.basescan',
      'blastscan',
      'sepolia.blastscan',
      'lineascan',
      'sepolia.lineascan',
      'mantlescan',
      'sepolia.mantlescan'
    ];

    return compatibleExplorers.includes(explorer);
  }

  /**
   * Get the block explorer type for a network
   * @param network The network
   * @returns The block explorer type or null if not supported
   */
  private getExplorerType(network: Network): string | null {
    // First try to get the explorer type from the chainToExplorer mapping
    const explorerType = this.chainToExplorer[network.chainId];
    if (explorerType) {
      return explorerType;
    }

    // If not found in the mapping but blockExplorer is defined, use a custom type
    if (network.blockExplorer) {
      // Create a custom explorer type based on the network ID
      return `custom-${network.id}`;
    }

    return null;
  }

  /**
   * Get the verification endpoint for a network
   * @param network The network
   * @returns The verification endpoint or null if not supported
   */
  private getVerificationEndpoint(network: Network): string | null {
    const explorerType = this.getExplorerType(network);
    if (!explorerType) return null;

    // If it's a custom explorer type, use the blockExplorer property
    if (explorerType.startsWith('custom-') && network.blockExplorer) {
      // Construct an API endpoint from the blockExplorer URL
      return `${network.blockExplorer}/api`;
    }

    return this.verificationEndpoints[explorerType] || null;
  }

  /**
   * Check if a network is supported for verification
   * @param network The network
   * @returns Whether the network is supported
   */
  public isNetworkSupported(network: Network): boolean {
    return this.getExplorerType(network) !== null;
  }

  /**
   * Check if we have an API key for a network
   * @param network The network
   * @returns Whether we have an API key for the network
   */
  public hasApiKey(network: Network): boolean {
    const explorerType = this.getExplorerType(network);
    if (!explorerType) return false;

    // Use the getApiKey method which includes fallback logic for default keys
    return this.getApiKey(explorerType) !== null;
  }

  /**
   * Verify a contract on a block explorer
   * @param contract The deployed contract
   * @param compiledContract The compiled contract
   * @returns A promise that resolves to a verification result
   */
  public async verifyContract(
    contract: DeployedContract,
    compiledContract: CompiledContract,
  ): Promise<{ success: boolean; message: string; url?: string }> {
    try {
      // Get current network
      const network = web3Service.getNetwork();
      if (!network) {
        return { success: false, message: 'Network information not available' };
      }

      // Check if network is supported
      if (!this.isNetworkSupported(network)) {
        return { success: false, message: `Verification not supported for ${network.name}` };
      }

      // Check if we have an API key
      const explorerType = this.getExplorerType(network);
      if (!explorerType) {
        return { success: false, message: `Explorer type not found for ${network.name}` };
      }

      // Get API key and endpoint
      const apiKey = this.getApiKey(explorerType);
      if (!apiKey) {
        return { success: false, message: `API key not found for ${network.name}` };
      }
      const endpoint = this.getVerificationEndpoint(network);
      if (!endpoint) {
        return { success: false, message: `Verification endpoint not found for ${network.name}` };
      }

      info('VerificationService', `Verifying contract ${contract.name} on ${network.name}...`);

      // Parse metadata to add content to sources
      let metadataObj;
      try {
        metadataObj = JSON.parse(compiledContract.metadata);

        // Add content to each source in the sources object
        if (metadataObj.sources) {
          // Get the source code from the compilation result
          const compilationResult = useCompilerStore.getState().compilationResult;
          console.log('Verification Service::Compilation Result', compilationResult);

          Object.keys(metadataObj.sources).forEach((sourceFile) => {
            if (!metadataObj.sources[sourceFile].content) {
              // Try to get the content from the compilation result
              if (compilationResult && compilationResult.sources) {
                // Extract the filename from the path
                const fileName = sourceFile.split('/').pop() || sourceFile;

                // Look for the file in the compilation sources
                for (const [path, content] of Object.entries(compilationResult.sources)) {
                  if (path.endsWith(fileName)) {
                    metadataObj.sources[sourceFile].content = content;
                    break;
                  }
                }
              }

              // If we still don't have content, use a placeholder
              if (!metadataObj.sources[sourceFile].content) {
                metadataObj.sources[sourceFile].content = '';
                warn(
                  'VerificationService',
                  `Could not find source content for ${sourceFile}, using empty string`,
                );
              }
            }
          });
        }
      } catch (err) {
        error('VerificationService', 'Failed to parse or modify metadata', err);
        metadataObj = null;
      }

      const compilationResult = useCompilerStore.getState().compilationResult;

      // Prepare verification data
      const verificationData = {
        apikey: apiKey,
        module: 'contract',
        action: 'verifysourcecode',
        chainId: network.chainId,
        contractaddress: contract.address,
        // sourceCode: metadataObj ? JSON.stringify(metadataObj) : compiledContract.metadata, // Use modified metadata if available
        // sourceCode: JSON.stringify(
        //   Object.fromEntries(
        //     Object.entries(compilationResult?.sources || {}).map(([key, value]) => [
        //       key.replace(/^\/*/, ''),
        //       value,
        //     ]),
        //   ),
        // ),
        sourceCode: JSON.stringify({
          language: 'Solidity',
          sources: Object.fromEntries(
            Object.entries(compilationResult?.sources || {}).map(([key, value]) => [
              key.replace(/^\/*/, ''),
              { content: value },
            ]),
          ),
          settings: {
            optimizer: {
              enabled: this.extractOptimizationUsed(compiledContract.metadata),
              runs: this.extractOptimizationRuns(compiledContract.metadata),
            },
          },
        }),
        codeformat: 'solidity-standard-json-input',
        // contractname: this.formatContractName(compiledContract),
        contractname: `${Object.keys(compilationResult?.sources)[0].replace('/', '')}:${compiledContract.name}`,
        compilerversion: this.extractCompilerVersion(compiledContract.metadata),
        optimizationUsed: this.extractOptimizationUsed(compiledContract.metadata) ? 1 : 0,
        runs: this.extractOptimizationRuns(compiledContract.metadata),
        constructorArguements: this.encodeConstructorArgs(
          contract.constructorArgs,
          compiledContract.abi,
        ),
      };

      console.log('VerificationService::', verificationData, endpoint, network.chainId);

      // Submit verification request
      // const response = await this.submitVerification(endpoint, verificationData);
      // Don't use the endpoint directly, use this api URL for the multichain etherscan verification
      const multichainEndpoint = 'https://api.etherscan.io/api';
      const response = await this.submitVerification(multichainEndpoint, verificationData);
      console.log('VerificationService::Submit Verification Response', response);

      if (response.status === '1') {
        // Check verification status
        const guid = response.result;
        // const verificationResult = await this.checkVerificationStatus(endpoint, guid, apiKey);
        const verificationResult = await this.checkVerificationStatus(multichainEndpoint, guid, apiKey);

        info('Verification Service', '::network::', network);
        if (verificationResult.success) {
          const verificationUrl = `${network.blockExplorer}/address/${contract.address}#code`;
          return {
            success: true,
            message: 'Contract verified successfully',
            url: verificationUrl,
          };
        } else {
          return {
            success: false,
            message: verificationResult.message || 'Verification failed',
          };
        }
      } else {
        // Check if the response indicates the contract is already verified
        const responseMessage = response.result || '';
        if (responseMessage.toLowerCase().includes('already verified')) {
          info('VerificationService', 'Contract is already verified in submission response, treating as success');
          const verificationUrl = `${network.blockExplorer}/address/${contract.address}#code`;
          return {
            success: true,
            message: 'Contract is already verified',
            url: verificationUrl,
          };
        }
        return {
          success: false,
          message: response.result || 'Failed to submit verification request',
        };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      error('VerificationService', 'Failed to verify contract', err);
      return { success: false, message: `Verification failed: ${errorMessage}` };
    }
  }

  /**
   * Submit a verification request to a block explorer
   * @param endpoint The API endpoint
   * @param data The verification data
   * @returns The response from the API
   */
  private async submitVerification(
    endpoint: string,
    data: Record<string, any>,
  ): Promise<{ status: string; result: string }> {
    try {
      // Convert data to FormData
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, value);
      });

      // Submit request
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (err) {
      error('VerificationService', 'Failed to submit verification request', err);
      throw err;
    }
  }

  /**
   * Check the status of a verification request
   * @param endpoint The API endpoint
   * @param guid The GUID returned by the verification request
   * @param apiKey The API key
   * @returns The verification status
   */
  private async checkVerificationStatus(
    endpoint: string,
    guid: string,
    apiKey: string,
  ): Promise<{ success: boolean; message?: string }> {
    try {
      console.log('Check Verify Status entered');
      // Wait a bit before checking status
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Check status
      const url = `${endpoint}?apikey=${apiKey}&module=contract&action=checkverifystatus&guid=${guid}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      info('VerificationService', 'CheckVerification Response::', response);

      const result = await response.json();
      info('VerificationService', 'CheckVerification Result::', result);

      if (result.status === '1') {
        return { success: true };
      } else {
        // Check if the result indicates the contract is already verified
        const resultMessage = result.result || '';
        if (resultMessage.toLowerCase().includes('already verified')) {
          info('VerificationService', 'Contract is already verified, treating as success');
          return { success: true, message: 'Contract is already verified' };
        }
        return { success: false, message: result.result };
      }
    } catch (err) {
      error('VerificationService', 'Failed to check verification status', err);
      throw err;
    }
  }

  /**
   * Extract compiler version from contract metadata
   * @param metadata The contract metadata
   * @returns The compiler version
   */
  private extractCompilerVersion(metadata: string): string {
    try {
      const parsedMetadata = JSON.parse(metadata);
      // Prefix the version with a 'v', else verification will fail
      return 'v' + parsedMetadata.compiler.version || 'v0.8.0+commit.c7dfd78e';
    } catch (err) {
      error('VerificationService', 'Failed to extract compiler version from metadata', err);
      return 'v0.8.0+commit.c7dfd78e'; // Default to a common version
    }
  }

  /**
   * Extract optimization used from contract metadata
   * @param metadata The contract metadata
   * @returns Whether optimization was used
   */
  private extractOptimizationUsed(metadata: string): boolean {
    try {
      const parsedMetadata = JSON.parse(metadata);
      return parsedMetadata.settings?.optimizer?.enabled || false;
    } catch (err) {
      error('VerificationService', 'Failed to extract optimization used from metadata', err);
      return false;
    }
  }

  /**
   * Extract optimization runs from contract metadata
   * @param metadata The contract metadata
   * @returns The number of optimization runs
   */
  private extractOptimizationRuns(metadata: string): number {
    try {
      const parsedMetadata = JSON.parse(metadata);
      return parsedMetadata.settings?.optimizer?.runs || 200;
    } catch (err) {
      error('VerificationService', 'Failed to extract optimization runs from metadata', err);
      return 200;
    }
  }

  /**
   * Encode constructor arguments for verification
   * @param args The constructor arguments
   * @param abi The contract ABI
   * @returns The encoded constructor arguments
   */
  private encodeConstructorArgs(args: any[], abi: any[]): string {
    try {
      if (!args || args.length === 0) return '';

      const web3 = web3Service.getWeb3();
      if (!web3) return '';

      const constructorAbi = abi.find((item) => item.type === 'constructor');
      if (!constructorAbi) return '';

      // Encode constructor arguments
      const types = constructorAbi.inputs.map((input: any) => input.type);
      return web3.eth.abi.encodeParameters(types, args).slice(2); // Remove '0x' prefix
    } catch (err) {
      error('VerificationService', 'Failed to encode constructor arguments', err);
      return '';
    }
  }

  /**
   * Format contract name for verification
   * For solidity-standard-json-input, the contract name should be in the format "sourcefile.sol:contractname"
   * @param compiledContract The compiled contract
   * @returns The formatted contract name
   */
  private formatContractName(compiledContract: CompiledContract): string {
    try {
      // Parse metadata to extract source file information
      const metadata = JSON.parse(compiledContract.metadata);

      // Get the source files from metadata
      const sources = metadata.sources;
      if (!sources) {
        warn('VerificationService', 'No sources found in metadata, using contract name only');
        return compiledContract.name;
      }

      // Find the source file that contains this contract
      // Usually the contract is in a file with a similar name
      const sourceFiles = Object.keys(sources);

      // Try to find a source file that matches the contract name
      let sourceFile = sourceFiles.find(
        (file) =>
          file.includes(`/${compiledContract.name}.sol`) ||
          file.endsWith(`${compiledContract.name}.sol`),
      );

      // If no matching file is found, use the first source file
      if (!sourceFile && sourceFiles.length > 0) {
        sourceFile = sourceFiles[0];
      }

      // If we found a source file, format as "sourcefile.sol:contractname"
      if (sourceFile) {
        // Extract just the filename from the path
        const fileName = sourceFile.split('/').pop() || sourceFile;
        return `${fileName}:${compiledContract.name}`;
      }

      // Fallback to just the contract name if we couldn't determine the source file
      warn('VerificationService', 'Could not determine source file, using contract name only');
      return compiledContract.name;
    } catch (err) {
      error('VerificationService', 'Failed to format contract name', err);
      // Fallback to just the contract name
      return compiledContract.name;
    }
  }
}

// Export singleton instance
export const verificationService = VerificationService.getInstance();
