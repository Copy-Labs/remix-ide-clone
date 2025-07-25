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
    'etherscan': 'https://api.etherscan.io/api',
    'goerli.etherscan': 'https://api-goerli.etherscan.io/api',
    'sepolia.etherscan': 'https://api.etherscan.io/api',
    'polygonscan': 'https://api.polygonscan.com/api',
    'mumbai.polygonscan': 'https://api-testnet.polygonscan.com/api',
    'bscscan': 'https://api.bscscan.com/api',
    'arbiscan': 'https://api.arbiscan.io/api',
    'optimistic.etherscan': 'https://api-optimistic.etherscan.io/api',
    'localhost': 'http://localhost:8545/api',
  };

  // Map chain IDs to explorer types
  private chainToExplorer: Record<number, string> = {
    1: 'etherscan',
    5: 'goerli.etherscan',
    11155111: 'sepolia.etherscan',
    137: 'polygonscan',
    80001: 'mumbai.polygonscan',
    56: 'bscscan',
    42161: 'arbiscan',
    10: 'optimistic.etherscan',
    1337: 'localhost',
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
    this.apiKeys.set(explorer, apiKey);
    this.saveApiKeys();
    debug('VerificationService', `Set API key for ${explorer}`);
  }

  /**
   * Get an API key for a specific block explorer
   * @param explorer The block explorer (e.g., 'etherscan', 'polygonscan')
   * @returns The API key or null if not found
   */
  public getApiKey(explorer: string): string | null {
    return this.apiKeys.get(explorer) || null;
  }

  /**
   * Get all API keys
   * @returns A map of explorer names to API keys
   */
  public getAllApiKeys(): Map<string, string> {
    return new Map(this.apiKeys);
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

    return this.apiKeys.has(explorerType);
  }

  /**
   * Verify a contract on a block explorer
   * @param contract The deployed contract
   * @param compiledContract The compiled contract
   * @returns A promise that resolves to a verification result
   */
  public async verifyContract(
    contract: DeployedContract,
    compiledContract: CompiledContract
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
      if (!explorerType || !this.apiKeys.has(explorerType)) {
        return { success: false, message: `API key not found for ${network.name}` };
      }

      // Get API key and endpoint
      const apiKey = this.apiKeys.get(explorerType)!;
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

          Object.keys(metadataObj.sources).forEach(sourceFile => {
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
                warn('VerificationService', `Could not find source content for ${sourceFile}, using empty string`);
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
              { content: value }
            ])
          ),
          settings: {
            optimizer: {
              enabled: this.extractOptimizationUsed(compiledContract.metadata),
              runs: this.extractOptimizationRuns(compiledContract.metadata)
            }
          }
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

      console.log('VerificationService::', verificationData);

      // Submit verification request
      const response = await this.submitVerification(endpoint, verificationData);
      console.log('VerificationService::Submit Verification Response', response);

      if (response.status === '1') {
        // Check verification status
        const guid = response.result;
        const verificationResult = await this.checkVerificationStatus(endpoint, guid, apiKey);

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
    data: Record<string, any>
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
    apiKey: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      console.log("Check Verify Status entered");
      // Wait a bit before checking status
      await new Promise(resolve => setTimeout(resolve, 5000));

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
      return 'v'+parsedMetadata.compiler.version || 'v0.8.0+commit.c7dfd78e';
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

      const constructorAbi = abi.find(item => item.type === 'constructor');
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
      let sourceFile = sourceFiles.find(file =>
        file.includes(`/${compiledContract.name}.sol`) ||
        file.endsWith(`${compiledContract.name}.sol`)
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
