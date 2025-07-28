import { debug, error, info, warn } from '@/services/loggerService';
import { gitEventEmitter, GitEventType } from '@/services/gitEventEmitter';

/**
 * Git operation types that can be processed by the service worker
 */
export enum GitOperationType {
  INIT = 'init',
  ADD = 'add',
  COMMIT = 'commit',
  BRANCH = 'branch',
  CHECKOUT = 'checkout',
  STATUS = 'status',
  LOG = 'log',
  BLAME = 'blame',
  DIFF = 'diff',
  STASH = 'stash',
  UNSTAGE = 'unstage',
}

/**
 * Status of a Git operation
 */
export enum GitOperationStatus {
  QUEUED = 'queued',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELED = 'canceled',
}

/**
 * Interface for Git operation
 */
export interface GitOperation {
  id: string;
  type: GitOperationType;
  params: any;
  status: GitOperationStatus;
  progress: number;
  result?: any;
  error?: Error;
  timestamp: number;
  priority: number;
  requiresNetwork: boolean;
}

/**
 * Git Service Worker Manager
 * Handles Git operations in the background using a service worker
 */
export class GitServiceWorkerManager {
  private static instance: GitServiceWorkerManager;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private operationQueue: GitOperation[] = [];
  private isProcessing: boolean = false;
  private offlineMode: boolean = false;
  private maxConcurrentOperations: number = 2;
  private runningOperations: number = 0;

  private constructor() {
    this.initServiceWorker();
    this.setupNetworkListeners();
    info('Git Service Worker Manager initialized');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): GitServiceWorkerManager {
    if (!GitServiceWorkerManager.instance) {
      GitServiceWorkerManager.instance = new GitServiceWorkerManager();
    }
    return GitServiceWorkerManager.instance;
  }

  /**
   * Initialize service worker
   */
  private async initServiceWorker(): Promise<void> {
    try {
      if ('serviceWorker' in navigator) {
        // Register service worker
        this.serviceWorkerRegistration = await navigator.serviceWorker.register(
          '/gitServiceWorker.js',
          {
            scope: '/',
          },
        );

        info('Git Service Worker registered successfully');

        // Set up message listener
        navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage);

        // Check if service worker is active
        if (this.serviceWorkerRegistration.active) {
          info('Git Service Worker is active');
        } else {
          // Wait for service worker to become active
          this.serviceWorkerRegistration.addEventListener('updatefound', () => {
            const newWorker = this.serviceWorkerRegistration!.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'activated') {
                  info('Git Service Worker activated');
                }
              });
            }
          });
        }
      } else {
        warn('Service Workers are not supported in this browser');
      }
    } catch (e) {
      error('Failed to register Git Service Worker:', e);
    }
  }

  /**
   * Set up network listeners to detect online/offline status
   */
  private setupNetworkListeners(): void {
    // Check initial network status
    this.offlineMode = !navigator.onLine;

    // Listen for online/offline events
    window.addEventListener('online', () => {
      info('Network connection restored');
      this.offlineMode = false;
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      warn('Network connection lost');
      this.offlineMode = true;
    });
  }

  /**
   * Handle messages from service worker
   */
  private handleServiceWorkerMessage = (event: MessageEvent): void => {
    const { type, data } = event.data;

    switch (type) {
      case 'operation-progress':
        this.updateOperationProgress(data.operationId, data.progress);
        break;
      case 'operation-completed':
        this.completeOperation(data.operationId, data.result);
        break;
      case 'operation-failed':
        this.failOperation(data.operationId, data.error);
        break;
      default:
        debug(`Received unknown message type from service worker: ${type}`);
    }
  };

  /**
   * Queue a Git operation to be processed by the service worker
   */
  public queueOperation(
    type: GitOperationType,
    params: any,
    priority: number = 1,
    requiresNetwork: boolean = false,
  ): string {
    const operationId = this.generateOperationId();

    const operation: GitOperation = {
      id: operationId,
      type,
      params,
      status: GitOperationStatus.QUEUED,
      progress: 0,
      timestamp: Date.now(),
      priority,
      requiresNetwork,
    };

    this.operationQueue.push(operation);

    // Sort queue by priority (higher first) and then by timestamp (older first)
    this.operationQueue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.timestamp - b.timestamp;
    });

    info(`Queued Git operation: ${type}`, params);
    gitEventEmitter.emit(GitEventType.OPERATION_QUEUED, { operation });

    // Start processing queue if not already processing
    if (!this.isProcessing) {
      this.processQueue();
    }

    return operationId;
  }

  /**
   * Process the operation queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.runningOperations >= this.maxConcurrentOperations) {
      return;
    }

    this.isProcessing = true;

    try {
      // Process operations until queue is empty or max concurrent operations reached
      while (
        this.operationQueue.length > 0 &&
        this.runningOperations < this.maxConcurrentOperations
      ) {
        // Find the next operation that can be processed
        const nextOperationIndex = this.operationQueue.findIndex(
          (op) =>
            op.status === GitOperationStatus.QUEUED && (!op.requiresNetwork || !this.offlineMode),
        );

        if (nextOperationIndex === -1) {
          // No operations can be processed at this time
          break;
        }

        const operation = this.operationQueue[nextOperationIndex];

        // Update operation status
        operation.status = GitOperationStatus.RUNNING;
        this.runningOperations++;

        info(`Processing Git operation: ${operation.type}`, operation.params);
        gitEventEmitter.emit(GitEventType.OPERATION_STARTED, { operation });

        // Process operation in the background
        this.processOperation(operation).catch((err) => {
          error(`Error processing operation ${operation.id}:`, err);
          this.failOperation(operation.id, err);
        });
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a Git operation
   */
  private async processOperation(operation: GitOperation): Promise<void> {
    try {
      if (!this.serviceWorkerRegistration || !this.serviceWorkerRegistration.active) {
        throw new Error('Service worker is not active');
      }

      // Send operation to service worker
      this.serviceWorkerRegistration.active.postMessage({
        type: 'process-git-operation',
        data: {
          operation,
        },
      });

      // For operations that don't use the service worker or for testing
      // Simulate processing with direct execution
      if (process.env.NODE_ENV === 'development' && !this.serviceWorkerRegistration.active) {
        await this.simulateOperationProcessing(operation);
      }
    } catch (err) {
      this.failOperation(operation.id, err);
    }
  }

  /**
   * Simulate operation processing (for development/testing)
   */
  private async simulateOperationProcessing(operation: GitOperation): Promise<void> {
    try {
      // Simulate progress updates
      const updateInterval = setInterval(() => {
        const progress = Math.min(operation.progress + 10, 90);
        this.updateOperationProgress(operation.id, progress);
      }, 300);

      // Simulate operation completion
      setTimeout(() => {
        clearInterval(updateInterval);

        // 10% chance of failure for testing
        if (Math.random() < 0.1) {
          this.failOperation(operation.id, new Error('Simulated operation failure'));
        } else {
          this.completeOperation(operation.id, { success: true });
        }
      }, 2000);
    } catch (err) {
      this.failOperation(operation.id, err);
    }
  }

  /**
   * Update operation progress
   */
  private updateOperationProgress(operationId: string, progress: number): void {
    const operationIndex = this.operationQueue.findIndex((op) => op.id === operationId);

    if (operationIndex !== -1) {
      const operation = this.operationQueue[operationIndex];
      operation.progress = progress;

      gitEventEmitter.emit(GitEventType.OPERATION_PROGRESS, {
        operation,
        progress,
      });
    }
  }

  /**
   * Complete an operation
   */
  private completeOperation(operationId: string, result: any): void {
    const operationIndex = this.operationQueue.findIndex((op) => op.id === operationId);

    if (operationIndex !== -1) {
      const operation = this.operationQueue[operationIndex];
      operation.status = GitOperationStatus.COMPLETED;
      operation.progress = 100;
      operation.result = result;

      gitEventEmitter.emit(GitEventType.OPERATION_COMPLETED, {
        operation,
        result,
      });

      // Remove operation from queue
      this.operationQueue.splice(operationIndex, 1);
      this.runningOperations--;

      // Continue processing queue
      this.processQueue();
    }
  }

  /**
   * Fail an operation
   */
  private failOperation(operationId: string, err: any): void {
    const operationIndex = this.operationQueue.findIndex((op) => op.id === operationId);

    if (operationIndex !== -1) {
      const operation = this.operationQueue[operationIndex];
      operation.status = GitOperationStatus.FAILED;
      operation.error = err;

      gitEventEmitter.emit(GitEventType.OPERATION_FAILED, {
        operation,
        error: err,
      });

      // Remove operation from queue
      this.operationQueue.splice(operationIndex, 1);
      this.runningOperations--;

      // Continue processing queue
      this.processQueue();
    }
  }

  /**
   * Cancel an operation
   */
  public cancelOperation(operationId: string): void {
    const operationIndex = this.operationQueue.findIndex((op) => op.id === operationId);

    if (operationIndex !== -1) {
      const operation = this.operationQueue[operationIndex];

      if (operation.status === GitOperationStatus.QUEUED) {
        // If operation is queued, just remove it
        operation.status = GitOperationStatus.CANCELED;
        gitEventEmitter.emit(GitEventType.OPERATION_CANCELED, { operation });
        this.operationQueue.splice(operationIndex, 1);
      } else if (operation.status === GitOperationStatus.RUNNING) {
        // If operation is running, notify service worker to cancel it
        if (this.serviceWorkerRegistration && this.serviceWorkerRegistration.active) {
          this.serviceWorkerRegistration.active.postMessage({
            type: 'cancel-git-operation',
            data: {
              operationId,
            },
          });
        }

        // Mark as canceled (actual cleanup will happen when service worker responds)
        operation.status = GitOperationStatus.CANCELED;
        gitEventEmitter.emit(GitEventType.OPERATION_CANCELED, { operation });
      }
    }
  }

  /**
   * Get all operations
   */
  public getOperations(): GitOperation[] {
    return [...this.operationQueue];
  }

  /**
   * Get operation by ID
   */
  public getOperation(operationId: string): GitOperation | undefined {
    return this.operationQueue.find((op) => op.id === operationId);
  }

  /**
   * Check if an operation is in progress
   */
  public isOperationInProgress(type: GitOperationType): boolean {
    return this.operationQueue.some(
      (op) =>
        op.type === type &&
        (op.status === GitOperationStatus.QUEUED || op.status === GitOperationStatus.RUNNING),
    );
  }

  /**
   * Generate a unique operation ID
   */
  private generateOperationId(): string {
    return `git-op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const gitServiceWorkerManager = GitServiceWorkerManager.getInstance();
