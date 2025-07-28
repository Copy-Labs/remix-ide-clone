import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CompilerState, CompilationResult, CompiledContract } from '@/types';
import { compilerService } from '@/services/compilerService';
import toast from 'react-hot-toast';

interface CompilerStoreActions {
  // Compilation actions
  compile: (sources: Record<string, string>) => Promise<void>;
  compileActiveFile: () => Promise<void>;
  clearCompilationResults: () => void;

  // Version management
  setCompilerVersion: (version: string) => Promise<void>;
  loadAvailableVersions: () => Promise<void>;

  // Settings
  setOptimizationEnabled: (enabled: boolean) => void;
  setOptimizationRuns: (runs: number) => void;
  setAutoCompile: (enabled: boolean) => void;

  // Contract management
  selectContract: (contractName: string) => void;
  getSelectedContract: () => CompiledContract | null;
  getContractByName: (name: string) => CompiledContract | null;

  // Utilities
  validateSource: (source: string) => { isValid: boolean; errors: string[] };
  getCompilationSummary: () => {
    totalContracts: number;
    successfulContracts: number;
    totalErrors: number;
    totalWarnings: number;
  };
  isContractSizeValid: (bytecode: string) => boolean;
  getContractSize: (bytecode: string) => number;
}

type CompilerStore = CompilerState & CompilerStoreActions;

const initialState: CompilerState = {
  isCompiling: false,
  compilationResult: null,
  selectedContract: null,
  compilerVersion: '0.8.30',
  availableVersions: [], // Now an array that will be populated asynchronously
  optimizationEnabled: true,
  optimizationRuns: 200,
  autoCompile: false,
  lastCompilationTime: null,
};

export const useCompilerStore = create<CompilerStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        compile: async (sources: Record<string, string>) => {
          set((state) => {
            state.isCompiling = true;
            state.compilationResult = null;
          });

          try {
            // Pass optimizer settings from the store to the service
            const { optimizationEnabled, optimizationRuns } = get();

            // Pass optimizer settings to the compiler service
            const result = await compilerService.compile(sources, {
              enabled: optimizationEnabled,
              runs: optimizationRuns,
            });

            set((state) => {
              state.isCompiling = false;
              state.compilationResult = result;
              state.lastCompilationTime = new Date();

              // Auto-select first contract if compilation successful
              if (result.success && Object.keys(result.contracts).length > 0) {
                const firstContract = Object.keys(result.contracts)[0];
                state.selectedContract = firstContract;
              }
            });

            // Show compilation results
            if (result.success) {
              const contractCount = Object.keys(result.contracts).length;
              toast.success(`Compilation successful! ${contractCount} contract(s) compiled.`);
            } else {
              const errorCount = result.errors.length;
              toast.error(`Compilation failed with ${errorCount} error(s).`);
              console.log('COMPILER STORE::COMPILE ERROR', result.errors);
            }

            // Show warnings if any
            if (result.warnings.length > 0) {
              toast(`${result.warnings.length} warning(s) found.`, {
                icon: '⚠️',
                duration: 3000,
              });
            }
          } catch (error) {
            set((state) => {
              state.isCompiling = false;
              state.compilationResult = {
                success: false,
                errors: [
                  {
                    severity: 'error',
                    message: error instanceof Error ? error.message : 'Unknown compilation error',
                    sourceLocation: { file: '', start: 0, end: 0 },
                    type: 'CompilerError',
                    component: 'general',
                    errorCode: '0000',
                  },
                ],
                warnings: [],
                contracts: {},
                sources: {},
              };
            });

            toast.error('Compilation failed due to an unexpected error.');
            console.error('Compilation error:', error);
          }
        },

        compileActiveFile: async () => {
          // This would need to be integrated with the file store
          // For now, we'll implement a basic version
          const { compile } = get();

          // Get active file from file store (would need to import useFileStore)
          // For now, we'll use a placeholder
          const sources = {
            'contract.sol': '// Placeholder - would get from active file',
          };

          await compile(sources);
        },

        clearCompilationResults: () => {
          set((state) => {
            state.compilationResult = null;
            state.selectedContract = null;
          });
        },

        setCompilerVersion: async (version: string) => {
          try {
            await compilerService.setVersion(version);

            set((state) => {
              state.compilerVersion = version;
            });

            toast.success(`Compiler version set to ${version}`);
          } catch (error) {
            toast.error(
              `Failed to set compiler version: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
            console.error('Failed to set compiler version:', error);
          }
        },

        loadAvailableVersions: async () => {
          try {
            const versions = await compilerService.getAvailableVersions();

            set((state) => {
              state.availableVersions = versions;
            });
          } catch (error) {
            console.error('Failed to load compiler versions:', error);
            // Use fallback versions
            set((state) => {
              state.availableVersions = [
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
                '0.8.20',
              ];
            });
          }
        },

        setOptimizationEnabled: (enabled: boolean) => {
          set((state) => {
            state.optimizationEnabled = enabled;
          });
        },

        setOptimizationRuns: (runs: number) => {
          set((state) => {
            state.optimizationRuns = runs;
          });
        },

        setAutoCompile: (enabled: boolean) => {
          set((state) => {
            state.autoCompile = enabled;
          });

          if (enabled) {
            toast.success('Auto-compile enabled');
          } else {
            toast('Auto-compile disabled');
          }
        },

        selectContract: (contractName: string) => {
          const { compilationResult } = get();

          if (compilationResult && compilationResult.contracts[contractName]) {
            set((state) => {
              state.selectedContract = contractName;
            });
          }
        },

        getSelectedContract: () => {
          const { compilationResult, selectedContract } = get();

          if (!compilationResult || !selectedContract) {
            return null;
          }

          return compilationResult.contracts[selectedContract] || null;
        },

        getContractByName: (name: string) => {
          const { compilationResult } = get();

          if (!compilationResult) {
            return null;
          }

          return compilationResult.contracts[name] || null;
        },

        validateSource: (source: string) => {
          return compilerService.validateSource(source);
        },

        getCompilationSummary: () => {
          const { compilationResult } = get();

          if (!compilationResult) {
            return {
              totalContracts: 0,
              successfulContracts: 0,
              totalErrors: 0,
              totalWarnings: 0,
            };
          }

          const totalContracts = Object.keys(compilationResult.contracts).length;
          const successfulContracts = compilationResult.success ? totalContracts : 0;
          const totalErrors = compilationResult.errors.length;
          const totalWarnings = compilationResult.warnings.length;

          return {
            totalContracts,
            successfulContracts,
            totalErrors,
            totalWarnings,
          };
        },

        isContractSizeValid: (bytecode: string) => {
          return compilerService.isContractSizeValid(bytecode);
        },

        getContractSize: (bytecode: string) => {
          return compilerService.getContractSize(bytecode);
        },
      })),
      {
        name: 'compiler-storage',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          // Only persist these fields
          compilerVersion: state.compilerVersion,
          optimizationEnabled: state.optimizationEnabled,
          optimizationRuns: state.optimizationRuns,
          autoCompile: state.autoCompile,
          // Don't persist compilation results or selected contract
        }),
        version: 1, // Add version for future migrations
        onRehydrateStorage: () => (state) => {
          // Log when state is rehydrated from storage
          console.log('Compiler store state rehydrated from localStorage');
        },
      },
    ),
    {
      name: 'compiler-store',
    },
  ),
);

// Initialize versions and load the default compiler when the store is created
// This ensures we load the available versions and the compiler is ready for use
(async () => {
  const store = useCompilerStore.getState();
  await store.loadAvailableVersions();
  // Load the default compiler version to ensure it's ready for use
  await store.setCompilerVersion(store.compilerVersion);
})();

// Helper function to integrate with file store
export const compileCurrentFiles = async () => {
  // This would be called from components that have access to both stores
  // Implementation would get files from file store and pass to compiler store
};
