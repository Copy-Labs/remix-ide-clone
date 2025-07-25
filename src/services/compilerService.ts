import { solidityCompiler, getCompilerVersions } from '@agnostico/browser-solidity-compiler';
import type { CompilationResult, CompilerError, CompilerWarning, CompiledContract } from '@/types';
import { debug } from '@/services/loggerService.ts';

/**
 * Service for Solidity compilation using @agnostico/browser-solidity-compiler
 * This service handles all compiler-related operations including:
 * - Loading compiler versions
 * - Compiling Solidity code
 * - Processing compilation results
 * - Validating Solidity source code
 * - Contract size validation
 */
export class CompilerService {
  private static instance: CompilerService;
  private currentVersion: string = '0.8.30';
  private currentVersionFull: string = '';
  private versionMap: Map<string, string> = new Map();
  private isCompilerLoaded: boolean = false;

  private constructor() {
    // Private constructor for singleton pattern
    // Note: We don't call initializeVersions here because it's async
    // It will be called from getInstance
  }

  /**
   * Initialize version map and full version string
   * This is called when the service is created and ensures that
   * the version map is populated and the full version string is set
   */
  public async initializeVersions(): Promise<void> {
    try {
      // Load available versions to populate the version map
      await this.getAvailableVersions();

      // Set the full version string for the current version
      const fullVersion = this.versionMap.get(this.currentVersion);
      if (fullVersion) {
        this.currentVersionFull = fullVersion;
        console.log(`Initialized full compiler version: ${fullVersion}`);
      } else {
        // If not found, use a fallback format
        this.currentVersionFull = `soljson-v${this.currentVersion}+commit.00000000.js`;
        console.warn(`Could not find full version for ${this.currentVersion}, using fallback: ${this.currentVersionFull}`);
      }
    } catch (error) {
      console.error('Failed to initialize versions:', error);
      // Use a fallback format if initialization fails
      this.currentVersionFull = `soljson-v${this.currentVersion}+commit.00000000.js`;
      console.warn(`Failed to initialize versions, using fallback: ${this.currentVersionFull}`);
    }
  }

  /**
   * Get the singleton instance of CompilerService
   */
  public static getInstance(): CompilerService {
    if (!CompilerService.instance) {
      CompilerService.instance = new CompilerService();
    }
    return CompilerService.instance;
  }

  /**
   * Initialize compiler and load specific version
   * This ensures the compiler is loaded before any compilation happens
   *
   * Note: The browser-solidity-compiler library doesn't have a separate loadVersion function.
   * The version is loaded when compiling, so we'll just mark it as loaded here.
   */
  private async ensureCompilerLoaded(): Promise<void> {
    if (!this.isCompilerLoaded) {
      try {
        // The library doesn't have a separate loadVersion function
        // It loads the version when compiling, so we'll just mark it as loaded
        this.isCompilerLoaded = true;
        console.log(`Compiler version ${this.currentVersion} will be used for compilation`);
      } catch (error) {
        console.error('Failed to initialize compiler:', error);
        throw new Error(`Failed to initialize compiler for version ${this.currentVersion}`);
      }
    }
  }

  /**
   * Compile Solidity source code
   * @param sources Record of file paths and their source code
   * @returns CompilationResult containing compilation output or errors
   */
  public async compile(sources: Record<string, string>, optimizerSettings?: { enabled: boolean, runs: number }): Promise<CompilationResult> {
    try {
      // Validate input sources
      if (!sources || typeof sources !== 'object') {
        return {
          success: false,
          errors: [{
            severity: 'error',
            message: 'Invalid input source specified. Sources must be a valid object.',
            sourceLocation: {
              file: '',
              start: 0,
              end: 0
            },
            type: 'CompilerError',
            component: 'general',
            errorCode: '0001'
          }],
          warnings: [],
          contracts: {},
          sources: {}
        };
      }

      // Check if sources is empty
      const sourceKeys = Object.keys(sources);
      if (sourceKeys.length === 0) {
        return {
          success: false,
          errors: [{
            severity: 'error',
            message: 'No source files provided for compilation.',
            sourceLocation: {
              file: '',
              start: 0,
              end: 0
            },
            type: 'CompilerError',
            component: 'general',
            errorCode: '0002'
          }],
          warnings: [],
          contracts: {},
          sources: {}
        };
      }

      // Ensure compiler is loaded
      await this.ensureCompilerLoaded();

      // The solidityCompiler function only accepts a single contract body
      // We need to combine all sources into a single file for compilation
      // This is a limitation of the current library version

      // Get the first source file for compilation
      // In a real-world scenario, you might want to handle multiple files differently
      const firstSourcePath = sourceKeys[0];
      const contractBody = sources[firstSourcePath];

      // Validate contract body - allow empty strings but reject null/undefined
      if (contractBody == null || typeof contractBody !== 'string') {
        return {
          success: false,
          errors: [{
            severity: 'error',
            message: `Invalid contract content for file: ${firstSourcePath}`,
            sourceLocation: {
              file: firstSourcePath,
              start: 0,
              end: 0
            },
            type: 'CompilerError',
            component: 'general',
            errorCode: '0003'
          }],
          warnings: [],
          contracts: {},
          sources: {}
        };
      }

      // Prepare version URL as required by the library
      let versionUrl;
      if (this.currentVersionFull) {
        // Use the full version string if available
        versionUrl = `https://binaries.soliditylang.org/bin/${this.currentVersionFull}`;
      } else {
        // Fallback to the old format if full version is not available
        versionUrl = `https://binaries.soliditylang.org/bin/soljson-v${this.currentVersion}.js`;
        console.warn("Using fallback version URL format. This may cause compilation errors.");
      }

      console.log("COMPILE SERVICE::COMPILE::VERSION", versionUrl);

      // Prepare optimizer options
      const options: any = {};

      // Use provided optimizer settings or defaults
      if (optimizerSettings?.enabled) {
        options.optimizer = {
          enabled: optimizerSettings.enabled,
          runs: optimizerSettings.runs
        };
      }

      console.log("COMPILE SERVICE::COMPILE::OPTIONS", options);

      try {
        // Compile using the library's solidityCompiler function
        const output = await solidityCompiler({
          version: versionUrl,
          contractBody,
          options
        });

        console.log("COMPILE SERVICE::COMPILE::OUTPUT", output);
        // Process compilation result
        return this.processCompilationOutput(output, sources);
      } catch (e) {
        console.error("COMPILE SERVICE::COMPILE::ERROR", e);
        // Return proper error result when solidityCompiler fails
        return {
          success: false,
          errors: [{
            severity: 'error',
            message: e instanceof Error ? e.message : 'Solidity compiler error',
            sourceLocation: {
              file: firstSourcePath,
              start: 0,
              end: 0
            },
            type: 'CompilerError',
            component: 'solidity-compiler',
            errorCode: '0004'
          }],
          warnings: [],
          contracts: {},
          sources: {}
        };
      }
    } catch (error) {
      console.error('Compilation error:', error);
      return {
        success: false,
        errors: [{
          severity: 'error',
          message: error instanceof Error ? error.message : 'Unknown compilation error',
          sourceLocation: {
            file: '',
            start: 0,
            end: 0
          },
          type: 'CompilerError',
          component: 'general',
          errorCode: '0000'
        }],
        warnings: [],
        contracts: {},
        sources: {}
      };
    }
  }

  /**
   * Prepare sources for compilation
   * @param sources Raw source code files
   * @returns Formatted sources for the solc compiler
   */
  private prepareSources(sources: Record<string, string>): Record<string, { content: string }> {
    const prepared: Record<string, { content: string }> = {};

    for (const [path, content] of Object.entries(sources)) {
      // Remove leading slash if present
      const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
      prepared[normalizedPath] = { content };
    }

    return prepared;
  }

  /**
   * Process compilation output from compiler
   * @param output Raw compiler output
   * @param originalSources Original source files
   * @returns Processed CompilationResult
   */
  private processCompilationOutput(output: any, originalSources: Record<string, string>): CompilationResult {
    const errors: CompilerError[] = [];
    const warnings: CompilerWarning[] = [];
    const contracts: Record<string, CompiledContract> = {};

    // Process errors and warnings
    if (output.errors) {
      for (const error of output.errors) {
        if (error.severity === 'error') {
          errors.push(this.parseError(error));
        } else if (error.severity === 'warning') {
          warnings.push(this.parseWarning(error));
        }
      }
    }

    // Process contracts - handle the specific output format from solidityCompiler
    // debug('Compiler Service', 'output.contracts', output.contracts);
    if (output.contracts && output.contracts.Compiled_Contracts) {
      for (const [contractName, contractData] of Object.entries(output.contracts.Compiled_Contracts)) {
        contracts[contractName] = this.parseContract(contractName, contractData as any, 'Compiled_Contracts');
      }
    } else if (output.contracts) {
      // Fallback to the original processing logic
      for (const [fileName, fileContracts] of Object.entries(output.contracts)) {
        for (const [contractName, contractData] of Object.entries(fileContracts as Record<string, any>)) {
          contracts[contractName] = this.parseContract(contractName, contractData, fileName);
        }
      }
    }

    return {
      success: errors.length === 0,
      errors,
      warnings,
      contracts,
      sources: originalSources
    };
  }

  /**
   * Parse compiler error
   * @param error Raw error from compiler
   * @returns Formatted CompilerError
   */
  private parseError(error: any): CompilerError {
    return {
      severity: 'error',
      message: error.message || 'Unknown error',
      sourceLocation: this.parseSourceLocation(error.sourceLocation),
      type: error.type || 'CompilerError',
      component: error.component || 'general',
      errorCode: error.errorCode || '0000'
    };
  }

  /**
   * Parse compiler warning
   * @param warning Raw warning from compiler
   * @returns Formatted CompilerWarning
   */
  private parseWarning(warning: any): CompilerWarning {
    return {
      severity: 'warning',
      message: warning.message || 'Unknown warning',
      sourceLocation: this.parseSourceLocation(warning.sourceLocation),
      type: warning.type || 'CompilerWarning',
      component: warning.component || 'general'
    };
  }

  /**
   * Parse source location
   * @param sourceLocation Raw source location data
   * @returns Formatted source location
   */
  private parseSourceLocation(sourceLocation: any) {
    if (!sourceLocation) {
      return {
        file: '',
        start: 0,
        end: 0
      };
    }

    return {
      file: sourceLocation.file || '',
      start: sourceLocation.start || 0,
      end: sourceLocation.end || 0
    };
  }

  /**
   * Parse compiled contract
   * @param name Contract name
   * @param contractData Raw contract data from compiler
   * @param fileName Source file name
   * @returns Formatted CompiledContract
   */
  private parseContract(name: string, contractData: any, fileName: string): CompiledContract {
    const bytecode = contractData.evm?.bytecode?.object || '';
    const abi = contractData.abi || [];

    return {
      name,
      fileName,
      abi,
      bytecode,
      deployedBytecode: contractData.evm?.deployedBytecode?.object || '',
      sourceMap: contractData.evm?.bytecode?.sourceMap || '',
      deployedSourceMap: contractData.evm?.deployedBytecode?.sourceMap || '',
      gasEstimates: contractData.evm?.gasEstimates || {},
      metadata: contractData.metadata || '',
      devdoc: contractData.devdoc || {},
      userdoc: contractData.userdoc || {}
    };
  }

  /**
   * Get available compiler versions
   * @returns Array of available compiler versions
   */
  public async getAvailableVersions(): Promise<string[]> {
    try {
      // Get versions directly from the library
      const versionsData = await getCompilerVersions();

      // According to the library documentation, getCompilerVersions returns an object with:
      // 1. releases - object mapping version numbers to full version strings with commit hashes
      // 2. latestRelease - latest release version
      // 3. builds - all builds including nightly versions

      // Clear the version map
      this.versionMap.clear();

      // Extract release versions and populate the version map
      const releases = versionsData.releases || {};
      const versionNumbers = Object.keys(releases);

      // Store the mapping between version numbers and full version strings
      versionNumbers.forEach(version => {
        this.versionMap.set(version, releases[version]);
      });

      // Sort versions in descending order
      return versionNumbers.sort((a, b) => {
        const aParts = a.split('.').map(Number);
        const bParts = b.split('.').map(Number);

        for (let i = 0; i < 3; i++) {
          if (aParts[i] !== bParts[i]) {
            return bParts[i] - aParts[i]; // Descending order
          }
        }

        return 0;
      });
    } catch (error) {
      console.error('Failed to get compiler versions:', error);
      // Fallback to hardcoded versions if API fails
      const fallbackVersions = [
        '0.8.30', '0.8.29', '0.8.28', '0.8.27', '0.8.26',
        '0.8.25', '0.8.24', '0.8.23', '0.8.22', '0.8.21', '0.8.20'
      ];

      // Clear the version map and add fallback mappings
      this.versionMap.clear();
      fallbackVersions.forEach(version => {
        // Use a placeholder full version string for fallbacks
        this.versionMap.set(version, `soljson-v${version}+commit.00000000.js`);
      });

      return fallbackVersions;
    }
  }

  /**
   * Set compiler version
   * @param version Version string (e.g., "0.8.30")
   */
  public async setVersion(version: string): Promise<void> {
    if (this.currentVersion === version && this.isCompilerLoaded) {
      return; // Already using this version
    }

    try {
      this.isCompilerLoaded = false;
      this.currentVersion = version;

      // Get the full version string from the version map
      const fullVersion = this.versionMap.get(version);
      if (fullVersion) {
        this.currentVersionFull = fullVersion;
        console.log(`Full compiler version set to: ${fullVersion}`);
      } else {
        // If the version is not in the map, try to load available versions first
        if (this.versionMap.size === 0) {
          await this.getAvailableVersions();
          // Try again after loading versions
          const fullVersionRetry = this.versionMap.get(version);
          if (fullVersionRetry) {
            this.currentVersionFull = fullVersionRetry;
            console.log(`Full compiler version set to: ${fullVersionRetry}`);
          } else {
            // If still not found, use a fallback format
            this.currentVersionFull = `soljson-v${version}+commit.00000000.js`;
            console.warn(`Could not find full version for ${version}, using fallback: ${this.currentVersionFull}`);
          }
        } else {
          // If versions are loaded but this one is not found, use a fallback format
          this.currentVersionFull = `soljson-v${version}+commit.00000000.js`;
          console.warn(`Could not find full version for ${version}, using fallback: ${this.currentVersionFull}`);
        }
      }

      await this.ensureCompilerLoaded();
      console.log(`Compiler version set to: ${version}`);
    } catch (error) {
      console.error(`Failed to load compiler version ${version}:`, error);
      throw new Error(`Failed to load compiler version ${version}`);
    }
  }

  /**
   * Get current compiler version
   * @returns Current version string
   */
  public getCurrentVersion(): string {
    return this.currentVersion;
  }

  /**
   * Validate Solidity source code with basic checks
   * @param source Source code to validate
   * @returns Validation result with errors if any
   */
  public validateSource(source: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic validation
    if (!source.trim()) {
      errors.push('Source code is empty');
      return { isValid: false, errors };
    }

    // Check for pragma directive
    if (!source.includes('pragma solidity')) {
      errors.push('Missing pragma directive');
    }

    // Check for basic syntax
    const contractMatch = source.match(/contract\s+\w+/);
    const libraryMatch = source.match(/library\s+\w+/);
    const interfaceMatch = source.match(/interface\s+\w+/);

    if (!contractMatch && !libraryMatch && !interfaceMatch) {
      errors.push('No contract, library, or interface found');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get contract size in bytes
   * @param bytecode Contract bytecode
   * @returns Size in bytes
   */
  public getContractSize(bytecode: string): number {
    // Remove 0x prefix if present
    const cleanBytecode = bytecode.startsWith('0x') ? bytecode.slice(2) : bytecode;
    return cleanBytecode.length / 2; // Each byte is represented by 2 hex characters
  }

  /**
   * Check if contract size exceeds Ethereum limits
   * @param bytecode Contract bytecode
   * @returns Whether the contract is within size limits
   */
  public isContractSizeValid(bytecode: string): boolean {
    const size = this.getContractSize(bytecode);
    const maxSize = 24576; // 24KB limit for Ethereum mainnet
    return size <= maxSize;
  }

  /**
   * Compile a single file and return only the contract data
   * Useful for quick compilation of a single contract
   * @param source Source code
   * @param fileName Optional file name
   * @returns Compiled contract or null if compilation failed
   */
  public async compileContract(source: string, fileName: string = 'Contract.sol'): Promise<CompiledContract | null> {
    const sources = { [fileName]: source };
    const result = await this.compile(sources);

    if (!result.success || Object.keys(result.contracts).length === 0) {
      return null;
    }

    // Return the first contract
    return result.contracts[Object.keys(result.contracts)[0]];
  }

  /**
   * Check if a compiler version is valid and available
   * @param version Version to check
   * @returns Whether the version is valid
   */
  public async isVersionValid(version: string): Promise<boolean> {
    const versions = await this.getAvailableVersions();
    return versions.includes(version);
  }

  /**
   * Get compiler error details in a human-readable format
   * @param error Compiler error
   * @returns Formatted error message
   */
  public formatErrorMessage(error: CompilerError): string {
    let message = `Error: ${error.message}`;

    if (error.sourceLocation && error.sourceLocation.file) {
      message += `\nFile: ${error.sourceLocation.file}`;

      if (error.sourceLocation.start && error.sourceLocation.end) {
        message += ` (${error.sourceLocation.start}-${error.sourceLocation.end})`;
      }
    }

    if (error.errorCode) {
      message += `\nCode: ${error.errorCode}`;
    }

    return message;
  }

  /**
   * Clean up resources when the service is no longer needed
   * Important to call this when the application is unmounted
   */
  public dispose(): void {
    // Reset compiler loaded state
    this.isCompilerLoaded = false;
    // No need to terminate workers as we're using the library directly
    // The library handles its own cleanup
  }
}

// Export singleton instance
export const compilerService = CompilerService.getInstance();

// Initialize the compiler service
(async () => {
  try {
    // Initialize versions to ensure the version map is populated
    await compilerService.initializeVersions();
  } catch (error) {
    console.error('Failed to initialize compiler service:', error);
  }
})();
