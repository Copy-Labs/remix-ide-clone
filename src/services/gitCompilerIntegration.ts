import { useCompilerStore } from '@/stores/compilerStore';
import { useGitStore } from '@/stores/gitStore';
import { debug, info, warn } from '@/services/loggerService';
import { gitHooksService, GitHookType } from '@/services/gitHooksService';

/**
 * GitCompilerIntegration
 *
 * This service integrates the compiler with Git to automatically commit on successful compilation.
 * It registers hooks to listen for successful compilations and can automatically commit the changes.
 */
class GitCompilerIntegration {
  private static instance: GitCompilerIntegration;
  private isInitialized: boolean = false;
  private autoCommitEnabled: boolean = false;
  private lastCommitHash: string | null = null;
  private compilationInProgress: boolean = false;

  private constructor() {}

  public static getInstance(): GitCompilerIntegration {
    if (!GitCompilerIntegration.instance) {
      GitCompilerIntegration.instance = new GitCompilerIntegration();
    }
    return GitCompilerIntegration.instance;
  }

  /**
   * Initialize the Git compiler integration
   */
  public initialize(): void {
    if (this.isInitialized) {
      return;
    }

    info('GitCompilerIntegration', 'Initializing Git compiler integration');

    // Subscribe to compiler events
    this.subscribeToCompilerEvents();

    // Register Git hooks
    this.registerGitHooks();

    this.isInitialized = true;
  }

  /**
   * Enable or disable automatic commits on successful compilation
   * @param enabled Whether automatic commits should be enabled
   */
  public setAutoCommitEnabled(enabled: boolean): void {
    this.autoCommitEnabled = enabled;
    info(
      'GitCompilerIntegration',
      `Auto-commit on successful compilation ${enabled ? 'enabled' : 'disabled'}`,
    );
  }

  /**
   * Get whether automatic commits are enabled
   * @returns Whether automatic commits are enabled
   */
  public isAutoCommitEnabled(): boolean {
    return this.autoCommitEnabled;
  }

  /**
   * Subscribe to compiler events
   */
  private subscribeToCompilerEvents(): void {
    // Create a subscription to the compiler store
    useCompilerStore.subscribe((state, prevState) => {
      // Check if compilation status has changed
      if (state.compiling !== prevState.compiling) {
        if (state.compiling) {
          // Compilation started
          this.compilationInProgress = true;
          debug('GitCompilerIntegration', 'Compilation started');
        } else if (this.compilationInProgress) {
          // Compilation finished
          this.compilationInProgress = false;

          // Check if compilation was successful
          if (state.compilationResult && !state.compilationResult.errors?.length) {
            debug('GitCompilerIntegration', 'Compilation successful');
            this.handleSuccessfulCompilation(state.compilationResult);
          } else {
            debug('GitCompilerIntegration', 'Compilation failed');
          }
        }
      }
    });

    debug('GitCompilerIntegration', 'Subscribed to compiler events');
  }

  /**
   * Register Git hooks
   */
  private registerGitHooks(): void {
    // Register a pre-commit hook to prevent commits during compilation
    gitHooksService.registerHook({
      type: GitHookType.PRE_COMMIT,
      name: 'prevent-commit-during-compilation',
      description: 'Prevents commits while compilation is in progress',
      callback: async () => {
        if (this.compilationInProgress) {
          warn('GitCompilerIntegration', 'Cannot commit while compilation is in progress');
          return false;
        }
        return true;
      },
    });

    debug('GitCompilerIntegration', 'Registered Git hooks');
  }

  /**
   * Handle successful compilation
   * @param compilationResult The compilation result
   */
  private handleSuccessfulCompilation(compilationResult: any): void {
    if (!this.autoCommitEnabled) {
      debug('GitCompilerIntegration', 'Auto-commit is disabled, skipping commit');
      return;
    }

    // Get the list of compiled files
    const compiledFiles = this.getCompiledFiles(compilationResult);

    if (compiledFiles.length === 0) {
      debug('GitCompilerIntegration', 'No files were compiled, skipping commit');
      return;
    }

    // Auto-commit the changes
    this.autoCommitChanges(compiledFiles, compilationResult);
  }

  /**
   * Get the list of files that were compiled
   * @param compilationResult The compilation result
   * @returns The list of compiled files
   */
  private getCompiledFiles(compilationResult: any): string[] {
    const compiledFiles: string[] = [];

    // Extract file paths from the compilation result
    if (compilationResult.sources) {
      for (const sourcePath in compilationResult.sources) {
        compiledFiles.push(sourcePath);
      }
    }

    return compiledFiles;
  }

  /**
   * Automatically commit changes after successful compilation
   * @param compiledFiles The list of compiled files
   * @param compilationResult The compilation result
   */
  private autoCommitChanges(compiledFiles: string[], compilationResult: any): void {
    const gitStore = useGitStore.getState();

    // First, get the current status to see if there are any changes
    gitStore.getStatus().then(() => {
      const { status } = gitStore;

      if (!status || status.files.length === 0) {
        debug('GitCompilerIntegration', 'No changes to commit');
        return;
      }

      // Stage all compiled files that have changes
      const filesToStage = status.files
        .filter((file) => compiledFiles.includes(file.file))
        .map((file) => file.file);

      if (filesToStage.length === 0) {
        debug('GitCompilerIntegration', 'No compiled files have changes, skipping commit');
        return;
      }

      // Stage the files
      Promise.all(filesToStage.map((file) => gitStore.addFile(file)))
        .then(() => {
          // Create a commit message
          const commitMessage = this.generateCommitMessage(compilationResult);

          // Commit the changes
          return gitStore.commit(commitMessage);
        })
        .then((commitHash) => {
          this.lastCommitHash = commitHash;
          info(
            'GitCompilerIntegration',
            `Auto-committed changes after successful compilation: ${commitHash}`,
          );
        })
        .catch((error) => {
          warn('GitCompilerIntegration', `Failed to auto-commit changes: ${error}`);
        });
    });
  }

  /**
   * Generate a commit message for the auto-commit
   * @param compilationResult The compilation result
   * @returns The commit message
   */
  private generateCommitMessage(compilationResult: any): string {
    // Extract compiler version
    const compilerVersion = useCompilerStore.getState().compilerVersion || 'unknown';

    // Count the number of contracts
    let contractCount = 0;
    if (compilationResult.contracts) {
      for (const sourcePath in compilationResult.contracts) {
        contractCount += Object.keys(compilationResult.contracts[sourcePath]).length;
      }
    }

    // Generate the commit message
    return (
      `Auto-commit: Successful compilation with ${compilerVersion}\n\n` +
      `Compiled ${contractCount} contract${contractCount !== 1 ? 's' : ''} successfully`
    );
  }
}

export const gitCompilerIntegration = GitCompilerIntegration.getInstance();
