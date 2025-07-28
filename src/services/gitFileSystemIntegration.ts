import { useFileStore } from '@/stores/fileStore';
import { useGitStore } from '@/stores/gitStore';
import { debug, info } from '@/services/loggerService';
import { gitEventEmitter, GitEventType } from '@/services/gitEventEmitter';

/**
 * GitFileSystemIntegration
 *
 * This service integrates the file system with Git for automatic detection of changes.
 * It listens for file system events and automatically updates the Git status.
 */
class GitFileSystemIntegration {
  private static instance: GitFileSystemIntegration;
  private isInitialized: boolean = false;
  private fileChangeDebounceTimers: Record<string, NodeJS.Timeout> = {};
  private DEBOUNCE_TIME = 500; // ms

  private constructor() {}

  public static getInstance(): GitFileSystemIntegration {
    if (!GitFileSystemIntegration.instance) {
      GitFileSystemIntegration.instance = new GitFileSystemIntegration();
    }
    return GitFileSystemIntegration.instance;
  }

  /**
   * Initialize the Git file system integration
   */
  public initialize(): void {
    if (this.isInitialized) {
      return;
    }

    info('GitFileSystemIntegration', 'Initializing Git file system integration');

    // Subscribe to file system events
    this.subscribeToFileSystemEvents();

    // Subscribe to Git events
    this.subscribeToGitEvents();

    this.isInitialized = true;
  }

  /**
   * Subscribe to file system events
   */
  private subscribeToFileSystemEvents(): void {
    const fileStore = useFileStore.getState();

    // Create a subscription to the file store
    useFileStore.subscribe((state, prevState) => {
      // Check if files have changed
      if (state.files !== prevState.files) {
        this.handleFileSystemChange(state, prevState);
      }
    });

    debug('GitFileSystemIntegration', 'Subscribed to file system events');
  }

  /**
   * Subscribe to Git events
   */
  private subscribeToGitEvents(): void {
    // Listen for Git events
    gitEventEmitter.on(GitEventType.REPOSITORY_INITIALIZED, () => {
      debug('GitFileSystemIntegration', 'Git repository initialized, refreshing status');
      this.refreshGitStatus();
    });

    gitEventEmitter.on(GitEventType.COMMIT_CREATED, () => {
      debug('GitFileSystemIntegration', 'Commit created, refreshing status');
      this.refreshGitStatus();
    });

    gitEventEmitter.on(GitEventType.BRANCH_SWITCHED, () => {
      debug('GitFileSystemIntegration', 'Branch switched, refreshing status');
      this.refreshGitStatus();
    });

    debug('GitFileSystemIntegration', 'Subscribed to Git events');
  }

  /**
   * Handle file system changes
   */
  private handleFileSystemChange(currentState: any, previousState: any): void {
    // Find changed files
    const changedFiles = this.detectChangedFiles(currentState.files, previousState.files);

    if (changedFiles.length > 0) {
      debug('GitFileSystemIntegration', `Detected ${changedFiles.length} changed files`);

      // Debounce the Git status refresh to avoid too many updates
      changedFiles.forEach((filepath) => {
        // Clear existing timer for this file if it exists
        if (this.fileChangeDebounceTimers[filepath]) {
          clearTimeout(this.fileChangeDebounceTimers[filepath]);
        }

        // Set a new timer
        this.fileChangeDebounceTimers[filepath] = setTimeout(() => {
          debug('GitFileSystemIntegration', `Refreshing Git status for changed file: ${filepath}`);
          this.refreshGitStatus();
          delete this.fileChangeDebounceTimers[filepath];
        }, this.DEBOUNCE_TIME);
      });
    }
  }

  /**
   * Detect changed files between two file system states
   */
  private detectChangedFiles(
    currentFiles: Record<string, any>,
    previousFiles: Record<string, any>,
  ): string[] {
    const changedFiles: string[] = [];

    // Check for new or modified files
    Object.entries(currentFiles).forEach(([path, file]) => {
      // Skip directories
      if (file.isDirectory) {
        return;
      }

      // If file is new or content has changed
      if (!previousFiles[path] || previousFiles[path].content !== file.content) {
        changedFiles.push(path);
      }
    });

    // Check for deleted files
    Object.keys(previousFiles).forEach((path) => {
      if (!currentFiles[path] && !previousFiles[path].isDirectory) {
        changedFiles.push(path);
      }
    });

    return changedFiles;
  }

  /**
   * Refresh Git status
   */
  private refreshGitStatus(): void {
    const gitStore = useGitStore.getState();
    gitStore.getStatus();
  }
}

export const gitFileSystemIntegration = GitFileSystemIntegration.getInstance();
