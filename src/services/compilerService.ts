import * as browserSolc from '@agnostico/browser-solidity-compiler';
import type { CompilationResult, CompilerError, CompilerWarning, CompiledContract } from '@/types';

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
  private isCompilerLoaded: boolean = false;

  private constructor() {
    // Private constructor for singleton pattern
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
   */
  private async ensureCompilerLoaded(): Promise<void> {
    if (!this.isCompilerLoaded) {
      try {
        // Load the compiler version directly using the library
        await browserSolc.loadVersion(this.currentVersion);
        this.isCompilerLoaded = true;

        console.log(`Compiler version ${this.currentVersion} loaded successfully`);
      } catch (error) {
        console.error('Failed to load compiler version:', error);
        throw new Error(`Failed to load compiler version ${this.currentVersion}`);
      }
    }
  }

  /**
   * Compile Solidity source code
   * @param sources Record of file paths and their source code
   * @returns CompilationResult containing compilation output or errors
   */
  public async compile(sources: Record<string, string>): Promise<CompilationResult> {
    try {
      // Ensure compiler is loaded
      await this.ensureCompilerLoaded();

      // Prepare sources for the compiler
      const preparedSources = this.prepareSources(sources);

      // Prepare input for the compiler
      const input = {
        language: 'Solidity',
        sources: preparedSources,
        settings: {
          outputSelection: {
            '*': {
              '*': ['*']
            }
          },
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      };

      // Compile directly using the library
      const output = await browserSolc.compile(input);

      // Process compilation result
      return this.processCompilationOutput(output, sources);
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

    // Process contracts
    if (output.contracts) {
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
      const versions = await browserSolc.getVersions();

      // Sort versions in descending order
      return versions.sort((a, b) => {
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
      return [
        '0.8.30', '0.8.29', '0.8.28', '0.8.27', '0.8.26',
        '0.8.25', '0.8.24', '0.8.23', '0.8.22', '0.8.21', '0.8.20'
      ];
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
