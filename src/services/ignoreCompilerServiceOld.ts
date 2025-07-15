import solc from 'solc';
import type {CompilationResult, CompilerError, CompilerWarning, CompiledContract} from '@/types';


/*
* DO NOT USE THIS CODE
* */
export class IgnoreCompilerServiceOld {
  private static instance: CompilerService;
  private currentVersion: string = '0.8.30';

  private constructor() {}

  public static getInstance(): CompilerService {
    if (!CompilerService.instance) {
      CompilerService.instance = new CompilerService();
    }
    return CompilerService.instance;
  }

  /**
   * Compile Solidity source code
   */
  public async compile(sources: Record<string, string>): Promise<CompilationResult> {
    try {
      // Prepare input for solc
      const input = {
        language: 'Solidity',
        sources: this.prepareSources(sources),
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

      // Compile using solc
      const output = JSON.parse(solc.compile(JSON.stringify(input)));

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
   * Process compilation output from solc
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
   */
  public getAvailableVersions(): string[] {
    // In a real implementation, you might fetch this from solc-bin
    return [
      '0.8.30',
      '0.8.29',
      '0.8.28',
      '0.8.27',
      '0.8.26',
      '0.8.25',
      '0.8.24',
      '0.8.23',
      '0.8.22',
      '0.8.21',
      '0.8.20'
    ];
  }

  /**
   * Set compiler version
   */
  public setVersion(version: string): void {
    this.currentVersion = version;
    // In a real implementation, you would load the specific version
    console.log(`Compiler version set to: ${version}`);
  }

  /**
   * Get current compiler version
   */
  public getCurrentVersion(): string {
    return this.currentVersion;
  }

  /**
   * Validate Solidity source code
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
   */
  public getContractSize(bytecode: string): number {
    // Remove 0x prefix if present
    const cleanBytecode = bytecode.startsWith('0x') ? bytecode.slice(2) : bytecode;
    return cleanBytecode.length / 2; // Each byte is represented by 2 hex characters
  }

  /**
   * Check if contract size exceeds Ethereum limits
   */
  public isContractSizeValid(bytecode: string): boolean {
    const size = this.getContractSize(bytecode);
    const maxSize = 24576; // 24KB limit for Ethereum mainnet
    return size <= maxSize;
  }
}

export const compilerService = CompilerService.getInstance();
