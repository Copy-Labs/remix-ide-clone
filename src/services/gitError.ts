/**
 * Git error types
 */
export enum GitErrorType {
  // Repository errors
  REPOSITORY_NOT_INITIALIZED = 'REPOSITORY_NOT_INITIALIZED',
  REPOSITORY_ALREADY_EXISTS = 'REPOSITORY_ALREADY_EXISTS',

  // File errors
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_ALREADY_EXISTS = 'FILE_ALREADY_EXISTS',
  FILE_PERMISSION_DENIED = 'FILE_PERMISSION_DENIED',

  // Branch errors
  BRANCH_NOT_FOUND = 'BRANCH_NOT_FOUND',
  BRANCH_ALREADY_EXISTS = 'BRANCH_ALREADY_EXISTS',
  CANNOT_DELETE_CURRENT_BRANCH = 'CANNOT_DELETE_CURRENT_BRANCH',

  // Commit errors
  NOTHING_TO_COMMIT = 'NOTHING_TO_COMMIT',
  COMMIT_NOT_FOUND = 'COMMIT_NOT_FOUND',

  // Remote errors
  REMOTE_NOT_FOUND = 'REMOTE_NOT_FOUND',
  REMOTE_CONNECTION_FAILED = 'REMOTE_CONNECTION_FAILED',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',

  // Merge errors
  MERGE_CONFLICT = 'MERGE_CONFLICT',

  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',

  // Other errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  OPERATION_ABORTED = 'OPERATION_ABORTED',
  TIMEOUT = 'TIMEOUT',
}

/**
 * Standard Git error class for consistent error handling across the application
 */
export class GitError extends Error {
  type: GitErrorType;
  originalError?: Error;
  retryable: boolean;

  /**
   * Create a new GitError
   * @param type Error type from GitErrorType enum
   * @param message Human-readable error message
   * @param originalError Original error that caused this error (if any)
   * @param retryable Whether this operation can be retried
   */
  constructor(
    type: GitErrorType,
    message: string,
    originalError?: Error,
    retryable: boolean = false,
  ) {
    super(message);
    this.name = 'GitError';
    this.type = type;
    this.originalError = originalError;
    this.retryable = retryable;

    // Maintain proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, GitError);
    }
  }

  /**
   * Get a user-friendly error message
   */
  getUserMessage(): string {
    switch (this.type) {
      case GitErrorType.REPOSITORY_NOT_INITIALIZED:
        return 'Git repository is not initialized. Please initialize a repository first.';

      case GitErrorType.REPOSITORY_ALREADY_EXISTS:
        return 'Git repository already exists in this directory.';

      case GitErrorType.FILE_NOT_FOUND:
        return 'The specified file was not found.';

      case GitErrorType.FILE_ALREADY_EXISTS:
        return 'The specified file already exists.';

      case GitErrorType.FILE_PERMISSION_DENIED:
        return 'Permission denied when accessing the file.';

      case GitErrorType.BRANCH_NOT_FOUND:
        return 'The specified branch was not found.';

      case GitErrorType.BRANCH_ALREADY_EXISTS:
        return 'A branch with this name already exists.';

      case GitErrorType.CANNOT_DELETE_CURRENT_BRANCH:
        return 'Cannot delete the current branch. Please switch to another branch first.';

      case GitErrorType.NOTHING_TO_COMMIT:
        return 'Nothing to commit. Please make some changes first.';

      case GitErrorType.COMMIT_NOT_FOUND:
        return 'The specified commit was not found.';

      case GitErrorType.REMOTE_NOT_FOUND:
        return 'The specified remote repository was not found.';

      case GitErrorType.REMOTE_CONNECTION_FAILED:
        return 'Failed to connect to the remote repository. Please check your internet connection.';

      case GitErrorType.AUTHENTICATION_FAILED:
        return 'Authentication failed. Please check your credentials.';

      case GitErrorType.MERGE_CONFLICT:
        return 'Merge conflict detected. Please resolve conflicts before continuing.';

      case GitErrorType.NETWORK_ERROR:
        return 'Network error occurred. Please check your internet connection.';

      case GitErrorType.OPERATION_ABORTED:
        return 'The operation was aborted.';

      case GitErrorType.TIMEOUT:
        return 'The operation timed out. Please try again.';

      case GitErrorType.UNKNOWN_ERROR:
      default:
        return this.message || 'An unknown error occurred.';
    }
  }

  /**
   * Get recovery suggestions based on the error type
   */
  getRecoverySuggestions(): string[] {
    switch (this.type) {
      case GitErrorType.REPOSITORY_NOT_INITIALIZED:
        return [
          'Initialize a new Git repository using the "Initialize Repository" button.',
          'Clone an existing repository from GitHub or another remote source.',
        ];

      case GitErrorType.REPOSITORY_ALREADY_EXISTS:
        return [
          'Open the existing repository instead of creating a new one.',
          'Delete the existing repository if you want to start fresh.',
        ];

      case GitErrorType.FILE_NOT_FOUND:
        return ['Check if the file path is correct.', "Create the file if it doesn't exist."];

      case GitErrorType.FILE_ALREADY_EXISTS:
        return ['Use a different file name.', 'Delete or rename the existing file.'];

      case GitErrorType.FILE_PERMISSION_DENIED:
        return [
          'Check your file system permissions.',
          'Try running the application with elevated privileges.',
        ];

      case GitErrorType.BRANCH_NOT_FOUND:
        return [
          "Create the branch if it doesn't exist.",
          'Check if the branch name is spelled correctly.',
        ];

      case GitErrorType.BRANCH_ALREADY_EXISTS:
        return ['Use a different branch name.', 'Delete or rename the existing branch.'];

      case GitErrorType.CANNOT_DELETE_CURRENT_BRANCH:
        return [
          'Switch to another branch before deleting this one.',
          'Create a new branch if no other branches exist.',
        ];

      case GitErrorType.NOTHING_TO_COMMIT:
        return [
          'Make changes to files in the repository.',
          'Add files to the staging area before committing.',
        ];

      case GitErrorType.COMMIT_NOT_FOUND:
        return [
          'Check if the commit hash is correct.',
          'Fetch the latest commits from the remote repository.',
        ];

      case GitErrorType.REMOTE_NOT_FOUND:
        return ['Check if the remote URL is correct.', "Add the remote if it doesn't exist."];

      case GitErrorType.REMOTE_CONNECTION_FAILED:
        return [
          'Check your internet connection.',
          'Verify that the remote server is online.',
          'Check if the remote URL is correct.',
        ];

      case GitErrorType.AUTHENTICATION_FAILED:
        return [
          'Check your username and password or access token.',
          'Verify that you have access to the repository.',
          'Generate a new access token if the current one has expired.',
        ];

      case GitErrorType.MERGE_CONFLICT:
        return [
          'Resolve conflicts in the affected files.',
          'Use the "Abort Merge" option to cancel the merge operation.',
          'Consider using a visual merge tool to help resolve conflicts.',
        ];

      case GitErrorType.NETWORK_ERROR:
        return [
          'Check your internet connection.',
          'Try again later if the server might be temporarily unavailable.',
        ];

      case GitErrorType.OPERATION_ABORTED:
        return ['Try the operation again if it was accidentally aborted.'];

      case GitErrorType.TIMEOUT:
        return [
          'Try the operation again.',
          'Check your internet connection if the operation involves a remote repository.',
          'Consider breaking up large operations into smaller ones.',
        ];

      case GitErrorType.UNKNOWN_ERROR:
      default:
        return [
          'Try the operation again.',
          'Check the application logs for more details.',
          'Restart the application if the problem persists.',
        ];
    }
  }

  /**
   * Create a GitError from a native Error
   * @param error Native Error object
   * @param defaultType Default error type if the error can't be classified
   * @param defaultMessage Default error message if the error doesn't have one
   */
  static fromError(
    error: Error,
    defaultType: GitErrorType = GitErrorType.UNKNOWN_ERROR,
    defaultMessage: string = 'An unknown error occurred',
  ): GitError {
    // Try to classify the error based on its message
    let type = defaultType;
    let retryable = false;

    const message = error.message || defaultMessage;

    // Check for common error patterns
    if (message.includes('not a git repository')) {
      type = GitErrorType.REPOSITORY_NOT_INITIALIZED;
    } else if (message.includes('already exists')) {
      if (message.includes('branch')) {
        type = GitErrorType.BRANCH_ALREADY_EXISTS;
      } else if (message.includes('file')) {
        type = GitErrorType.FILE_ALREADY_EXISTS;
      } else if (message.includes('repository')) {
        type = GitErrorType.REPOSITORY_ALREADY_EXISTS;
      }
    } else if (message.includes('not found') || message.includes('does not exist')) {
      if (message.includes('branch')) {
        type = GitErrorType.BRANCH_NOT_FOUND;
      } else if (message.includes('file')) {
        type = GitErrorType.FILE_NOT_FOUND;
      } else if (message.includes('commit')) {
        type = GitErrorType.COMMIT_NOT_FOUND;
      } else if (message.includes('remote')) {
        type = GitErrorType.REMOTE_NOT_FOUND;
      }
    } else if (message.includes('permission denied')) {
      type = GitErrorType.FILE_PERMISSION_DENIED;
    } else if (message.includes('nothing to commit')) {
      type = GitErrorType.NOTHING_TO_COMMIT;
    } else if (message.includes('conflict')) {
      type = GitErrorType.MERGE_CONFLICT;
    } else if (
      message.includes('authentication') ||
      message.includes('authorization') ||
      message.includes('401')
    ) {
      type = GitErrorType.AUTHENTICATION_FAILED;
      retryable = true;
    } else if (
      message.includes('network') ||
      message.includes('connection') ||
      message.includes('unreachable')
    ) {
      type = GitErrorType.NETWORK_ERROR;
      retryable = true;
    } else if (message.includes('timeout') || message.includes('timed out')) {
      type = GitErrorType.TIMEOUT;
      retryable = true;
    } else if (message.includes('aborted')) {
      type = GitErrorType.OPERATION_ABORTED;
      retryable = true;
    }

    return new GitError(type, message, error, retryable);
  }
}

/**
 * Retry a Git operation with exponential backoff
 * @param operation Function that performs the Git operation
 * @param maxRetries Maximum number of retry attempts
 * @param initialDelay Initial delay in milliseconds
 * @param maxDelay Maximum delay in milliseconds
 */
export async function retryGitOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000,
  maxDelay: number = 10000,
): Promise<T> {
  let lastError: GitError | null = null;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      // Convert to GitError if it's not already
      const gitError =
        error instanceof GitError
          ? error
          : GitError.fromError(error instanceof Error ? error : new Error(String(error)));

      lastError = gitError;

      // If the error is not retryable or we've reached the maximum retries, throw it
      if (!gitError.retryable || attempt === maxRetries) {
        throw gitError;
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Increase delay for next attempt (exponential backoff)
      delay = Math.min(delay * 2, maxDelay);
    }
  }

  // This should never happen, but TypeScript requires a return statement
  throw (
    lastError || new GitError(GitErrorType.UNKNOWN_ERROR, 'Unknown error occurred during retry')
  );
}
