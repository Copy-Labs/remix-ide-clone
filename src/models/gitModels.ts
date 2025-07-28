/**
 * Unified models for Git entities (commits, branches, etc.) across the application.
 * These models provide a consistent interface for working with Git data regardless of the source.
 */

/**
 * Represents a Git commit
 */
export interface GitCommit {
  // Unique identifier for the commit (SHA-1 hash)
  oid: string;

  // Commit message
  message: string;

  // Short version of the message (first line)
  shortMessage?: string;

  // Author information
  author: {
    name: string;
    email: string;
    timestamp: number;
    date?: Date;
  };

  // Committer information (may be different from author)
  committer: {
    name: string;
    email: string;
    timestamp: number;
    date?: Date;
  };

  // Parent commit OIDs
  parents: string[];

  // Files changed in this commit
  files?: GitFileChange[];

  // Commit signature information
  signature?: {
    valid: boolean;
    signer?: string;
    date?: Date;
  };

  // Additional metadata
  metadata?: Record<string, any>;
}

/**
 * Represents a Git branch
 */
export interface GitBranch {
  // Branch name
  name: string;

  // OID of the commit this branch points to
  oid: string;

  // Whether this is the current branch
  current: boolean;

  // Whether this is a remote branch
  isRemote: boolean;

  // Remote name if this is a remote branch
  remote?: string;

  // Whether this branch is ahead/behind its upstream
  upstream?: {
    name: string;
    ahead: number;
    behind: number;
  };

  // Additional metadata
  metadata?: Record<string, any>;
}

/**
 * Represents a Git tag
 */
export interface GitTag {
  // Tag name
  name: string;

  // OID of the commit this tag points to
  oid: string;

  // Tag message (if annotated)
  message?: string;

  // Tagger information (if annotated)
  tagger?: {
    name: string;
    email: string;
    timestamp: number;
    date?: Date;
  };

  // Whether this is an annotated tag
  isAnnotated: boolean;

  // Additional metadata
  metadata?: Record<string, any>;
}

/**
 * Represents a Git remote
 */
export interface GitRemote {
  // Remote name (e.g., 'origin')
  name: string;

  // Remote URL
  url: string;

  // Whether this remote is connected
  isConnected: boolean;

  // Fetch URL (if different from push URL)
  fetchUrl?: string;

  // Push URL (if different from fetch URL)
  pushUrl?: string;

  // Additional metadata
  metadata?: Record<string, any>;
}

/**
 * Represents a file change in Git
 */
export interface GitFileChange {
  // File path
  path: string;

  // Change type
  type: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied' | 'unmodified';

  // Old file path (for renames)
  oldPath?: string;

  // Status in working directory
  workdir?: number;

  // Status in index
  stage?: number;

  // Status in HEAD
  head?: number;

  // Additional metadata
  metadata?: Record<string, any>;
}

/**
 * Represents the status of a Git repository
 */
export interface GitRepositoryStatus {
  // Current branch
  currentBranch: string;

  // Whether the repository is initialized
  isInitialized: boolean;

  // Whether there are uncommitted changes
  isDirty: boolean;

  // Whether there are staged changes
  hasStagedChanges: boolean;

  // Whether there are unstaged changes
  hasUnstagedChanges: boolean;

  // Whether there are untracked files
  hasUntrackedFiles: boolean;

  // List of file changes
  files: GitFileChange[];

  // Additional metadata
  metadata?: Record<string, any>;
}

/**
 * Represents a Git stash
 */
export interface GitStash {
  // Stash ID
  id: string;

  // Stash message
  message: string;

  // Stash date
  date: Date;

  // Branch name at the time of stashing
  branch?: string;

  // Files in the stash
  files?: GitFileChange[];

  // Additional metadata
  metadata?: Record<string, any>;
}

/**
 * Represents blame information for a file
 */
export interface GitBlameInfo {
  // Commit OID
  oid: string;

  // Author name
  author: string;

  // Author email
  email?: string;

  // Date of the commit
  date: string;

  // Line number
  line: number;

  // Line content
  content: string;

  // Commit message
  message?: string;

  // Additional metadata
  metadata?: Record<string, any>;
}

/**
 * Represents a diff between two versions of a file
 */
export interface GitFileDiff {
  // Old file content
  oldContent: string;

  // New file content
  newContent: string;

  // Diff hunks
  hunks: GitDiffHunk[];

  // Additional metadata
  metadata?: Record<string, any>;
}

/**
 * Represents a hunk in a diff
 */
export interface GitDiffHunk {
  // Type of change
  type: 'added' | 'removed' | 'modified' | 'unchanged';

  // Content of the hunk
  content: string;

  // Line numbers
  lineNumber: {
    old: number | null;
    new: number | null;
  };

  // Additional metadata
  metadata?: Record<string, any>;
}

/**
 * Represents a Git reference (branch, tag, etc.)
 */
export interface GitReference {
  // Reference name
  name: string;

  // Reference type
  type: 'branch' | 'tag' | 'remote' | 'head' | 'other';

  // OID the reference points to
  oid: string;

  // Whether this is the current reference
  isCurrent: boolean;

  // Additional metadata
  metadata?: Record<string, any>;
}

/**
 * Represents a Git configuration
 */
export interface GitConfig {
  // User information
  user: {
    name: string;
    email: string;
  };

  // GitHub information
  github?: {
    token?: string;
    username?: string;
  };

  // Remote repositories
  remotes: Record<string, GitRemote>;

  // Default remote name
  defaultRemote: string;

  // Additional configuration options
  options?: Record<string, any>;
}

/**
 * Factory functions for creating Git entities
 */
export const GitEntityFactory = {
  /**
   * Create a GitCommit object
   */
  createCommit(
    oid: string,
    message: string,
    author: { name: string; email: string; timestamp: number },
    committer?: { name: string; email: string; timestamp: number },
    parents: string[] = [],
  ): GitCommit {
    return {
      oid,
      message,
      shortMessage: message.split('\n')[0],
      author: {
        ...author,
        date: new Date(author.timestamp * 1000),
      },
      committer: committer
        ? {
            ...committer,
            date: new Date(committer.timestamp * 1000),
          }
        : {
            ...author,
            date: new Date(author.timestamp * 1000),
          },
      parents,
    };
  },

  /**
   * Create a GitBranch object
   */
  createBranch(
    name: string,
    oid: string,
    current: boolean = false,
    isRemote: boolean = false,
    remote?: string,
  ): GitBranch {
    return {
      name,
      oid,
      current,
      isRemote,
      remote,
    };
  },

  /**
   * Create a GitFileChange object
   */
  createFileChange(
    path: string,
    type: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied' | 'unmodified',
    oldPath?: string,
    workdir?: number,
    stage?: number,
    head?: number,
  ): GitFileChange {
    return {
      path,
      type,
      oldPath,
      workdir,
      stage,
      head,
    };
  },

  /**
   * Create a GitRemote object
   */
  createRemote(
    name: string,
    url: string,
    isConnected: boolean = false,
    fetchUrl?: string,
    pushUrl?: string,
  ): GitRemote {
    return {
      name,
      url,
      isConnected,
      fetchUrl,
      pushUrl,
    };
  },

  /**
   * Create a GitRepositoryStatus object
   */
  createRepositoryStatus(
    currentBranch: string,
    isInitialized: boolean,
    files: GitFileChange[] = [],
  ): GitRepositoryStatus {
    const hasStagedChanges = files.some((file) => file.stage === 2);
    const hasUnstagedChanges = files.some((file) => file.workdir === 2);
    const hasUntrackedFiles = files.some((file) => file.head === 0 && file.workdir === 2);

    return {
      currentBranch,
      isInitialized,
      isDirty: hasStagedChanges || hasUnstagedChanges || hasUntrackedFiles,
      hasStagedChanges,
      hasUnstagedChanges,
      hasUntrackedFiles,
      files,
    };
  },
};
