/**
 * GitServiceInterface defines the contract for Git operations
 * that can be implemented for both browser and desktop environments.
 */
export interface GitServiceInterface {
  /**
   * Initialize a Git repository
   * @param defaultBranch Default branch name (e.g., 'main')
   */
  init(defaultBranch: string): Promise<void>;

  /**
   * Create an initial commit in the repository
   * @param author Author information
   */
  createInitialCommit(author: { name: string; email: string }): Promise<string>;

  /**
   * Reset the Git index
   */
  resetGitIndex(): Promise<void>;

  /**
   * Add a file to the Git staging area
   * @param filepath Path to the file
   */
  add(filepath: string): Promise<void>;

  /**
   * Remove a file from the Git staging area
   * @param filepath Path to the file
   */
  unstage(filepath: string): Promise<void>;

  /**
   * Commit changes to the repository
   * @param message Commit message
   * @param author Author information
   */
  commit(message: string, author?: { name: string; email: string }): Promise<string>;

  /**
   * Get the status of the repository
   * @param options Options for status (pagination, filters, etc.)
   */
  status(options?: {
    skip?: number;
    limit?: number;
    filter?: 'all' | 'modified' | 'staged' | 'untracked';
  }): Promise<{
    files: Array<{ file: string; head: number; workdir: number; stage: number }>;
    hasMore: boolean;
    total: number;
  }>;

  /**
   * List all branches in the repository
   */
  listBranches(): Promise<string[]>;

  /**
   * Get the current branch name
   */
  currentBranch(): Promise<string>;

  /**
   * Create a new branch
   * @param name Branch name
   */
  branch(name: string): Promise<void>;

  /**
   * Switch to a different branch
   * @param ref Branch name or commit reference
   */
  checkout(ref: string): Promise<void>;

  /**
   * Delete a branch
   * @param name Branch name
   */
  deleteBranch(name: string): Promise<void>;

  /**
   * Get commit history
   * @param options Options for log (pagination, filters, etc.)
   */
  log(options?: { skip?: number; limit?: number; filepath?: string }): Promise<{
    commits: Array<{
      oid: string;
      message: string;
      author: { name: string; email: string; timestamp: number };
    }>;
    hasMore: boolean;
  }>;

  /**
   * Get blame information for a file
   * @param filepath Path to the file
   */
  getFileBlame(filepath: string): Promise<
    Array<{
      oid: string;
      author: string;
      date: string;
      line: number;
      content: string;
    }>
  >;

  /**
   * Get commit history for a specific file
   * @param filepath Path to the file
   */
  getFileHistory(filepath: string): Promise<
    Array<{
      oid: string;
      message: string;
      author: { name: string; email: string; timestamp: number };
    }>
  >;

  /**
   * Get diff for a file between two commits
   * @param filepath Path to the file
   * @param oldOid Old commit OID
   * @param newOid New commit OID
   */
  getFileDiff(
    filepath: string,
    oldOid: string,
    newOid: string,
  ): Promise<
    Array<{
      type: string;
      oldStart: number;
      oldLines: number;
      newStart: number;
      newLines: number;
      content: string;
    }>
  >;

  /**
   * Create a stash
   * @param message Stash message
   */
  createStash(message: string): Promise<string>;

  /**
   * List all stashes
   */
  listStashes(): Promise<
    Array<{
      id: string;
      message: string;
      date: string;
    }>
  >;

  /**
   * Apply a stash
   * @param stashId Stash ID
   */
  applyStash(stashId: string): Promise<void>;

  /**
   * Drop a stash
   * @param stashId Stash ID
   */
  dropStash(stashId: string): Promise<void>;

  /**
   * Sync branches with the provided list
   * @param branches List of branch names
   * @param currentBranch Current branch name
   */
  syncBranches(branches: string[], currentBranch: string): void;

  /**
   * Get files changed in a commit
   * @param commitOid Commit OID
   */
  getCommitFiles(commitOid: string): Promise<
    Array<{
      file: string;
      status: string;
      additions: number;
      deletions: number;
      diff: string;
    }>
  >;

  /**
   * Stage a specific hunk from a file
   * @param filepath Path to the file
   * @param hunk Hunk information (line numbers and content)
   */
  addHunk(
    filepath: string,
    hunk: {
      startLine: number;
      endLine: number;
      content: string;
    },
  ): Promise<void>;

  /**
   * Unstage a specific hunk from a file
   * @param filepath Path to the file
   * @param hunk Hunk information (line numbers and content)
   */
  unstageHunk(
    filepath: string,
    hunk: {
      startLine: number;
      endLine: number;
      content: string;
    },
  ): Promise<void>;

  /**
   * Push changes to a remote repository
   * @param remote Remote name (default: origin)
   * @param branch Branch name
   */
  push(remote: string, branch: string): Promise<boolean>;

  /**
   * Pull changes from a remote repository
   * @param remote Remote name (default: origin)
   * @param branch Branch name
   */
  pull(remote: string, branch: string): Promise<boolean>;
}
