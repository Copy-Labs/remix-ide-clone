import { debug, error, info, warn } from '@/services/loggerService';
import { GitError, GitErrorType } from '@/services/gitError';

/**
 * Enum for Git operation support level in browser environments
 */
export enum BrowserSupportLevel {
  FULL = 'full', // Fully supported in browser
  LIMITED = 'limited', // Limited support in browser
  UNSUPPORTED = 'unsupported', // Not supported in browser
  DESKTOP_ONLY = 'desktop_only', // Only supported in desktop environment
}

/**
 * Interface for Git operation metadata
 */
export interface GitOperationMetadata {
  name: string;
  description: string;
  supportLevel: BrowserSupportLevel;
  alternativeOperation?: string;
  desktopHandoffUrl?: string;
  userGuidance: string;
}

/**
 * GitFallbackService provides fallback mechanisms for Git operations
 * that are not fully supported in browser environments.
 */
export class GitFallbackService {
  // Map of Git operations and their support level in browser environments
  private operationsMetadata: Map<string, GitOperationMetadata> = new Map();

  constructor() {
    this.initializeOperationsMetadata();
  }

  /**
   * Initialize the operations metadata map
   */
  private initializeOperationsMetadata(): void {
    // Basic operations
    this.operationsMetadata.set('init', {
      name: 'Initialize Repository',
      description: 'Create a new Git repository',
      supportLevel: BrowserSupportLevel.FULL,
      userGuidance: 'Fully supported in browser environment.',
    });

    this.operationsMetadata.set('add', {
      name: 'Add Files',
      description: 'Add files to the staging area',
      supportLevel: BrowserSupportLevel.FULL,
      userGuidance: 'Fully supported in browser environment.',
    });

    this.operationsMetadata.set('commit', {
      name: 'Commit Changes',
      description: 'Commit staged changes to the repository',
      supportLevel: BrowserSupportLevel.FULL,
      userGuidance: 'Fully supported in browser environment.',
    });

    this.operationsMetadata.set('status', {
      name: 'Check Status',
      description: 'Check the status of the repository',
      supportLevel: BrowserSupportLevel.FULL,
      userGuidance: 'Fully supported in browser environment.',
    });

    this.operationsMetadata.set('branch', {
      name: 'Create Branch',
      description: 'Create a new branch',
      supportLevel: BrowserSupportLevel.FULL,
      userGuidance: 'Fully supported in browser environment.',
    });

    this.operationsMetadata.set('checkout', {
      name: 'Checkout Branch',
      description: 'Switch to a different branch',
      supportLevel: BrowserSupportLevel.FULL,
      userGuidance: 'Fully supported in browser environment.',
    });

    // Limited support operations
    this.operationsMetadata.set('clone', {
      name: 'Clone Repository',
      description: 'Clone a repository from a remote URL',
      supportLevel: BrowserSupportLevel.LIMITED,
      alternativeOperation: 'import',
      userGuidance:
        'Limited support in browser. Only public repositories without authentication are supported. For private repositories, use the desktop environment or import from a ZIP file.',
    });

    this.operationsMetadata.set('push', {
      name: 'Push Changes',
      description: 'Push local changes to a remote repository',
      supportLevel: BrowserSupportLevel.LIMITED,
      alternativeOperation: 'export',
      desktopHandoffUrl:
        'https://docs.github.com/en/github/using-git/pushing-commits-to-a-remote-repository',
      userGuidance:
        'Limited support in browser due to CORS restrictions. For best results, use the desktop environment or export your project and push manually.',
    });

    this.operationsMetadata.set('pull', {
      name: 'Pull Changes',
      description: 'Pull changes from a remote repository',
      supportLevel: BrowserSupportLevel.LIMITED,
      alternativeOperation: 'import',
      desktopHandoffUrl:
        'https://docs.github.com/en/github/using-git/getting-changes-from-a-remote-repository',
      userGuidance:
        'Limited support in browser due to CORS restrictions. For best results, use the desktop environment or import the latest version of your project.',
    });

    this.operationsMetadata.set('merge', {
      name: 'Merge Branches',
      description: 'Merge changes from one branch into another',
      supportLevel: BrowserSupportLevel.LIMITED,
      userGuidance:
        'Basic merging is supported, but complex merge conflicts may require desktop environment.',
    });

    // Unsupported operations
    this.operationsMetadata.set('submodule', {
      name: 'Submodules',
      description: 'Work with Git submodules',
      supportLevel: BrowserSupportLevel.UNSUPPORTED,
      desktopHandoffUrl: 'https://git-scm.com/book/en/v2/Git-Tools-Submodules',
      userGuidance:
        'Git submodules are not supported in browser environment. Use the desktop environment for submodule operations.',
    });

    this.operationsMetadata.set('bisect', {
      name: 'Bisect',
      description: 'Use binary search to find the commit that introduced a bug',
      supportLevel: BrowserSupportLevel.UNSUPPORTED,
      desktopHandoffUrl: 'https://git-scm.com/docs/git-bisect',
      userGuidance:
        'Git bisect is not supported in browser environment. Use the desktop environment for bisect operations.',
    });

    this.operationsMetadata.set('worktree', {
      name: 'Worktree',
      description: 'Manage multiple working trees',
      supportLevel: BrowserSupportLevel.UNSUPPORTED,
      desktopHandoffUrl: 'https://git-scm.com/docs/git-worktree',
      userGuidance:
        'Git worktree is not supported in browser environment. Use the desktop environment for worktree operations.',
    });

    // Desktop-only operations
    this.operationsMetadata.set('hook', {
      name: 'Git Hooks',
      description: 'Execute scripts when certain Git events occur',
      supportLevel: BrowserSupportLevel.DESKTOP_ONLY,
      desktopHandoffUrl: 'https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks',
      userGuidance:
        'Git hooks require access to the file system and execution of scripts, which is not possible in browser environment. Use the desktop environment for hook operations.',
    });

    this.operationsMetadata.set('gc', {
      name: 'Garbage Collection',
      description: 'Clean up unnecessary files and optimize the local repository',
      supportLevel: BrowserSupportLevel.DESKTOP_ONLY,
      desktopHandoffUrl: 'https://git-scm.com/docs/git-gc',
      userGuidance:
        'Git garbage collection is not supported in browser environment. Use the desktop environment for garbage collection operations.',
    });
  }

  /**
   * Check if an operation is supported in browser environment
   * @param operation Git operation name
   * @returns Support level for the operation
   */
  isSupportedInBrowser(operation: string): BrowserSupportLevel {
    const metadata = this.operationsMetadata.get(operation);
    return metadata ? metadata.supportLevel : BrowserSupportLevel.UNSUPPORTED;
  }

  /**
   * Get metadata for a Git operation
   * @param operation Git operation name
   * @returns Metadata for the operation
   */
  getOperationMetadata(operation: string): GitOperationMetadata | undefined {
    return this.operationsMetadata.get(operation);
  }

  /**
   * Get all operations metadata
   * @returns Map of all operations metadata
   */
  getAllOperationsMetadata(): Map<string, GitOperationMetadata> {
    return this.operationsMetadata;
  }

  /**
   * Get operations by support level
   * @param supportLevel Support level to filter by
   * @returns Array of operations with the specified support level
   */
  getOperationsBySupportLevel(supportLevel: BrowserSupportLevel): GitOperationMetadata[] {
    const operations: GitOperationMetadata[] = [];

    this.operationsMetadata.forEach((metadata) => {
      if (metadata.supportLevel === supportLevel) {
        operations.push(metadata);
      }
    });

    return operations;
  }

  /**
   * Get alternative operation for an unsupported or limited operation
   * @param operation Git operation name
   * @returns Alternative operation name, or undefined if no alternative exists
   */
  getAlternativeOperation(operation: string): string | undefined {
    const metadata = this.operationsMetadata.get(operation);
    return metadata?.alternativeOperation;
  }

  /**
   * Get desktop handoff URL for an unsupported or limited operation
   * @param operation Git operation name
   * @returns Desktop handoff URL, or undefined if no URL exists
   */
  getDesktopHandoffUrl(operation: string): string | undefined {
    const metadata = this.operationsMetadata.get(operation);
    return metadata?.desktopHandoffUrl;
  }

  /**
   * Get user guidance for an operation
   * @param operation Git operation name
   * @returns User guidance for the operation
   */
  getUserGuidance(operation: string): string {
    const metadata = this.operationsMetadata.get(operation);
    return metadata?.userGuidance || 'No guidance available for this operation.';
  }

  /**
   * Execute an operation with fallback
   * @param operation Git operation name
   * @param primaryCallback Callback for the primary operation
   * @param fallbackCallback Optional callback for the fallback operation
   * @returns Result of the operation
   */
  async executeWithFallback<T>(
    operation: string,
    primaryCallback: () => Promise<T>,
    fallbackCallback?: () => Promise<T>,
  ): Promise<T> {
    const supportLevel = this.isSupportedInBrowser(operation);

    try {
      // For fully supported operations, just execute the primary callback
      if (supportLevel === BrowserSupportLevel.FULL) {
        return await primaryCallback();
      }

      // For limited support operations, try the primary callback first
      if (supportLevel === BrowserSupportLevel.LIMITED) {
        try {
          return await primaryCallback();
        } catch (err) {
          warn(`Primary operation ${operation} failed, trying fallback`, err);

          // If fallback callback is provided, try it
          if (fallbackCallback) {
            return await fallbackCallback();
          }

          // Otherwise, throw a more helpful error
          throw new GitError(
            GitErrorType.BROWSER_LIMITATION,
            `Operation ${operation} has limited support in browser environment: ${this.getUserGuidance(operation)}`,
            err instanceof Error ? err : new Error(String(err)),
            false,
          );
        }
      }

      // For unsupported or desktop-only operations, use fallback if provided
      if (fallbackCallback) {
        warn(`Operation ${operation} is not fully supported in browser, using fallback`);
        return await fallbackCallback();
      }

      // Otherwise, throw a helpful error
      throw new GitError(
        GitErrorType.BROWSER_LIMITATION,
        `Operation ${operation} is not supported in browser environment: ${this.getUserGuidance(operation)}`,
        undefined,
        false,
      );
    } catch (err) {
      // If it's already a GitError, just rethrow it
      if (err instanceof GitError) {
        throw err;
      }

      // Otherwise, wrap it in a GitError
      throw new GitError(
        GitErrorType.BROWSER_LIMITATION,
        `Failed to execute operation ${operation}: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err : new Error(String(err)),
        false,
      );
    }
  }
}

// Export a singleton instance
export const gitFallbackService = new GitFallbackService();
