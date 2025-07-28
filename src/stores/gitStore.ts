import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { gitService } from '@/services/gitService';
import { githubService } from '@/services/githubService';
import { githubAuthService } from '@/services/githubAuthService';
import { debug, error, info } from '@/services/loggerService';
import { createIndexedDBStorage } from '@/utils/indexedDBStorage';
import { GitError, GitErrorType, retryGitOperation } from '@/services/gitError';
import { gitEventEmitter, GitEventType } from '@/services/gitEventEmitter';
import { gitCacheService } from '@/services/gitCacheService';
import {
  gitCredentialsService,
  type CredentialType,
  type GitCredential,
} from '@/services/gitCredentialsService';

export interface GitCommit {
  oid: string;
  message: string;
  author: {
    name: string;
    email: string;
    timestamp: number;
  };
  committer: {
    name: string;
    email: string;
    timestamp: number;
  };
}

export interface GitBranch {
  name: string;
  oid: string;
  current: boolean;
}

export interface GitRemote {
  name: string;
  url: string;
}

export interface GitStatus {
  file: string;
  head: number;
  workdir: number;
  stage: number;
}

export interface GitConfig {
  user: {
    name: string;
    email: string;
  };
  github: {
    token: string | undefined;
    username: string | undefined;
  };
  // Remote repository configuration
  remotes: {
    [url: string]: {
      name: string;
      url: string;
      credentialType?: CredentialType;
    };
  };
  // Default remote name (usually 'origin')
  defaultRemote: string;
}

export interface GitFileBlame {
  commit: {
    oid: string;
    message: string;
    author: {
      name: string;
      email: string;
      timestamp: number;
    };
  };
  line: number;
  content: string;
}

export interface GitFileDiff {
  oldContent: string;
  newContent: string;
  diff: Array<{
    type: 'added' | 'removed' | 'unchanged';
    content: string;
    lineNumber: {
      old: number | null;
      new: number | null;
    };
  }>;
}

export interface GitStash {
  id: string;
  message: string;
  date: Date;
}

export interface GitState {
  // Repository state
  isInitialized: boolean;
  currentBranch: string;
  branches: GitBranch[];
  commits: GitCommit[];
  status: GitStatus[];

  // Configuration
  config: GitConfig;

  // UI state
  isLoading: boolean;
  error: string | null;
  recoverySuggestions: string[]; // Added for improved error handling

  // JetBrains-style Git integration
  fileBlame: Record<string, GitFileBlame[]>;
  fileHistory: Record<string, GitCommit[]>;
  fileDiff: Record<string, GitFileDiff>;
  stashes: GitStash[];

  // UI state for JetBrains-style integration
  selectedCommit: string | null;
  showBlame: boolean;
  showDiff: boolean;

  // GitHub integration
  githubRepos: any[];
  isGithubConnected: boolean;

  // Pagination state
  commitPagination: {
    skip: number;
    limit: number;
    hasMore: boolean;
    total: number;
  };

  // Interactive rebase state
  rebaseInProgress: boolean;
  rebaseTargetCommit: string | null;
  rebaseCommits: GitCommit[];

  // Commit details
  commitDetails: {
    commitOid: string | null;
    files: Array<{
      file: string;
      status: string;
      additions: number;
      deletions: number;
      diff: string;
    }>;
    isLoading: boolean;
  };
  statusPagination: {
    skip: number;
    limit: number;
    hasMore: boolean;
    total: number;
    filter: 'all' | 'modified' | 'staged' | 'untracked';
  };
  githubRepoPagination: {
    page: number;
    perPage: number;
    hasNextPage: boolean;
    totalCount: number;
  };
}

export interface GitActions {
  // Internal actions for persistence
  _onHydrate?: (state: GitState) => void;

  // Repository operations
  initRepository: () => Promise<void>;
  createInitialCommit: () => Promise<void>;
  resetGitIndex: () => Promise<void>;

  // Branch operations
  createBranch: (name: string) => Promise<void>;
  switchBranch: (name: string) => Promise<void>;
  deleteBranch: (name: string) => Promise<void>;
  getBranches: () => Promise<void>;

  // Remote operations
  addRemote: (name: string, url: string) => Promise<void>;
  removeRemote: (name: string) => Promise<void>;

  // Credential operations
  saveCredential: (remoteUrl: string, credential: GitCredential) => Promise<void>;
  loadCredential: (remoteUrl: string) => Promise<GitCredential | null>;
  deleteCredential: (remoteUrl: string) => Promise<void>;
  clearAllCredentials: () => Promise<void>;

  // Commit operations
  addFile: (filepath: string) => Promise<void>;
  unstageFile: (filepath: string) => Promise<void>;
  addHunk: (
    filepath: string,
    hunk: { startLine: number; endLine: number; content: string },
  ) => Promise<void>;
  unstageHunk: (
    filepath: string,
    hunk: { startLine: number; endLine: number; content: string },
  ) => Promise<void>;
  addAllFiles: () => Promise<void>;
  commit: (message: string) => Promise<void>;
  getCommits: (options?: {
    limit?: number;
    skip?: number;
    resetPagination?: boolean;
  }) => Promise<void>;
  loadMoreCommits: () => Promise<void>;

  // Status operations
  getStatus: (options?: {
    limit?: number;
    skip?: number;
    filter?: 'all' | 'modified' | 'staged' | 'untracked';
    resetPagination?: boolean;
  }) => Promise<void>;
  loadMoreStatus: () => Promise<void>;
  setStatusFilter: (filter: 'all' | 'modified' | 'staged' | 'untracked') => void;

  // Configuration
  setConfig: (config: Partial<GitConfig>) => void;

  // GitHub integration
  startGithubOAuth: () => Promise<void>;
  connectGithub: (token: string) => Promise<void>;
  disconnectGithub: () => void;
  getGithubRepos: (options?: {
    page?: number;
    perPage?: number;
    resetPagination?: boolean;
  }) => Promise<void>;
  loadMoreGithubRepos: () => Promise<void>;
  createGithubRepo: (
    name: string,
    options?: { description?: string; private?: boolean },
  ) => Promise<void>;

  // JetBrains-style Git integration
  // File-level operations
  getFileBlame: (filepath: string) => Promise<void>;
  getFileHistory: (filepath: string) => Promise<void>;
  getFileDiff: (filepath: string, oldOid?: string, newOid?: string) => Promise<void>;
  getCommitDetails: (commitOid: string) => Promise<void>;

  // Stash operations
  createStash: (message: string) => Promise<void>;
  listStashes: () => Promise<void>;
  applyStash: (stashId: string) => Promise<void>;
  dropStash: (stashId: string) => Promise<void>;

  // Rebase operations
  startInteractiveRebase: (targetCommitOid: string) => Promise<void>;
  continueRebase: () => Promise<void>;
  abortRebase: () => Promise<void>;
  reorderCommits: (commitOids: string[]) => Promise<void>;
  squashCommit: (commitOid: string, targetOid: string, message: string) => Promise<void>;
  dropCommit: (commitOid: string) => Promise<void>;

  // UI state operations
  toggleBlame: (show?: boolean) => void;
  toggleDiff: (show?: boolean) => void;
  selectCommit: (commitOid: string | null) => void;

  // Remote operations
  push: (remote?: string, branch?: string) => Promise<boolean>;
  pull: (remote?: string, branch?: string) => Promise<boolean>;

  // Utility
  reset: () => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export type GitStore = GitState & GitActions;

const initialState: GitState = {
  isInitialized: false,
  currentBranch: '',
  branches: [],
  commits: [],
  status: [],
  config: {
    user: {
      name: '',
      email: '',
    },
    github: {
      token: undefined,
      username: undefined,
    },
    remotes: {},
    defaultRemote: 'origin',
  },
  isLoading: false,
  error: null,
  recoverySuggestions: [],

  // JetBrains-style Git integration
  fileBlame: {},
  fileHistory: {},
  fileDiff: {},
  stashes: [],
  selectedCommit: null,
  showBlame: false,
  showDiff: false,

  // GitHub integration
  githubRepos: [],
  isGithubConnected: false,

  // Pagination state
  commitPagination: {
    skip: 0,
    limit: 10,
    hasMore: false,
    total: 0,
  },
  statusPagination: {
    skip: 0,
    limit: 100,
    hasMore: false,
    total: 0,
    filter: 'all',
  },
  githubRepoPagination: {
    page: 1,
    perPage: 30,
    hasNextPage: false,
    totalCount: 0,
  },

  // Interactive rebase state
  rebaseInProgress: false,
  rebaseTargetCommit: null,
  rebaseCommits: [],

  // Commit details
  commitDetails: {
    commitOid: null,
    files: [],
    isLoading: false,
  },
};

export const useGitStore = create<GitStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        // Initialize GitService with persisted branches on store hydration
        _onHydrate: (state) => {
          // If we have persisted branches, update the GitService's in-memory branches
          if (state.branches && state.branches.length > 0) {
            // Extract branch names from GitBranch objects
            const branchNames = state.branches.map((branch) => branch.name);
            gitService.syncBranches(branchNames, state.currentBranch);
          }
        },

        // Repository operations
        initRepository: async () => {
          try {
            // Emit loading started event
            gitEventEmitter.emit(GitEventType.LOADING_STARTED, { operation: 'initRepository' });

            set((state) => {
              state.isLoading = true;
              state.error = null;
              state.recoverySuggestions = [];
            });

            // Use retryGitOperation for operations that might fail due to network or timing issues
            await retryGitOperation(async () => {
              await gitService.init('main');
            });

            // Get the actual current branch (may be undefined if no commits yet)
            const currentBranch = await gitService.currentBranch();

            set((state) => {
              state.isInitialized = true;
              state.currentBranch = currentBranch || '';
              state.isLoading = false;
            });

            info('Init Repository', 'Git repository initialized');

            // Get initial repository state
            await get().getBranches();
            await get().getStatus();
            await get().getCommits();

            // Emit repository initialized event
            gitEventEmitter.emit(GitEventType.REPOSITORY_INITIALIZED, {
              currentBranch,
              isInitialized: true,
            });

            // Emit loading finished event
            gitEventEmitter.emit(GitEventType.LOADING_FINISHED, {
              operation: 'initRepository',
              success: true,
            });
          } catch (err) {
            // Convert to GitError if it's not already
            const gitError =
              err instanceof GitError
                ? err
                : GitError.fromError(
                    err instanceof Error ? err : new Error(String(err)),
                    GitErrorType.REPOSITORY_NOT_INITIALIZED,
                    'Failed to initialize Git repository',
                  );

            error('Failed to initialize git repository:', gitError);

            set((state) => {
              state.isInitialized = false;
              state.error = gitError.getUserMessage();
              state.isLoading = false;
              state.recoverySuggestions = gitError.getRecoverySuggestions();
            });

            // Emit error event
            gitEventEmitter.emit(GitEventType.ERROR_OCCURRED, {
              error: gitError,
              operation: 'initRepository',
            });

            // Emit loading finished event
            gitEventEmitter.emit(GitEventType.LOADING_FINISHED, {
              operation: 'initRepository',
              success: false,
            });
          }
        },

        createInitialCommit: async () => {
          try {
            const { config } = get();

            if (!config.user.name || !config.user.email) {
              throw new Error('Git user name and email must be configured');
            }

            set((state) => {
              state.isLoading = true;
              state.error = null;
            });

            await gitService.createInitialCommit({
              name: config.user.name,
              email: config.user.email,
            });

            // Update branches and current branch after initial commit
            await get().getBranches();
            await get().getCommits();

            set((state) => {
              state.isLoading = false;
            });

            info('Initial commit created successfully');
          } catch (err) {
            const errorMessage =
              err instanceof Error ? err.message : 'Failed to create initial commit';
            error('Failed to create initial commit:', errorMessage);
            set((state) => {
              state.error = errorMessage;
              state.isLoading = false;
            });
          }
        },

        resetGitIndex: async () => {
          try {
            set((state) => {
              state.isLoading = true;
              state.error = null;
            });

            await gitService.resetGitIndex();

            // Refresh status after resetting the index
            await get().getStatus();

            set((state) => {
              state.isLoading = false;
            });

            info('Git index has been reset successfully');
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to reset Git index';
            error('Failed to reset Git index:', errorMessage);
            set((state) => {
              state.error = errorMessage;
              state.isLoading = false;
            });
          }
        },

        // Branch operations
        createBranch: async (name: string) => {
          try {
            // Emit loading started event
            gitEventEmitter.emit(GitEventType.LOADING_STARTED, {
              operation: 'createBranch',
              branchName: name,
            });

            set((state) => {
              state.isLoading = true;
              state.error = null;
              state.recoverySuggestions = [];
            });

            await gitService.branch(name);

            await get().getBranches();

            set((state) => {
              state.isLoading = false;
            });

            info(`Branch '${name}' created successfully`);

            // Emit branch created event
            gitEventEmitter.emit(GitEventType.BRANCH_CREATED, {
              name,
              branches: get().branches,
            });

            // Emit loading finished event
            gitEventEmitter.emit(GitEventType.LOADING_FINISHED, {
              operation: 'createBranch',
              success: true,
            });
          } catch (err) {
            // Convert to GitError if it's not already
            const gitError =
              err instanceof GitError
                ? err
                : GitError.fromError(
                    err instanceof Error ? err : new Error(String(err)),
                    GitErrorType.BRANCH_ALREADY_EXISTS,
                    `Failed to create branch: ${name}`,
                  );

            error('Failed to create branch:', gitError);

            set((state) => {
              state.error = gitError.getUserMessage();
              state.isLoading = false;
              state.recoverySuggestions = gitError.getRecoverySuggestions();
            });

            // Emit error event
            gitEventEmitter.emit(GitEventType.ERROR_OCCURRED, {
              error: gitError,
              operation: 'createBranch',
            });

            // Emit loading finished event
            gitEventEmitter.emit(GitEventType.LOADING_FINISHED, {
              operation: 'createBranch',
              success: false,
            });
          }
        },

        switchBranch: async (name: string) => {
          try {
            // Emit loading started event
            gitEventEmitter.emit(GitEventType.LOADING_STARTED, {
              operation: 'switchBranch',
              branchName: name,
            });

            set((state) => {
              state.isLoading = true;
              state.error = null;
              state.recoverySuggestions = [];
            });

            await gitService.checkout(name);

            set((state) => {
              state.currentBranch = name;
              state.isLoading = false;
            });

            await get().getBranches();
            await get().getStatus();

            info(`Switched to branch '${name}'`);

            // Emit branch switched event
            gitEventEmitter.emit(GitEventType.BRANCH_SWITCHED, {
              name,
              branches: get().branches,
            });

            // Emit loading finished event
            gitEventEmitter.emit(GitEventType.LOADING_FINISHED, {
              operation: 'switchBranch',
              success: true,
            });
          } catch (err) {
            // Convert to GitError if it's not already
            const gitError =
              err instanceof GitError
                ? err
                : GitError.fromError(
                    err instanceof Error ? err : new Error(String(err)),
                    GitErrorType.BRANCH_NOT_FOUND,
                    `Failed to switch to branch: ${name}`,
                  );

            error('Failed to switch branch:', gitError);

            set((state) => {
              state.error = gitError.getUserMessage();
              state.isLoading = false;
              state.recoverySuggestions = gitError.getRecoverySuggestions();
            });

            // Emit error event
            gitEventEmitter.emit(GitEventType.ERROR_OCCURRED, {
              error: gitError,
              operation: 'switchBranch',
            });

            // Emit loading finished event
            gitEventEmitter.emit(GitEventType.LOADING_FINISHED, {
              operation: 'switchBranch',
              success: false,
            });
          }
        },

        deleteBranch: async (name: string) => {
          try {
            set((state) => {
              state.isLoading = true;
              state.error = null;
            });

            await gitService.deleteBranch(name);

            await get().getBranches();

            set((state) => {
              state.isLoading = false;
            });

            info(`Branch '${name}' deleted successfully`);
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to delete branch';
            error('Failed to delete branch:', errorMessage);
            set((state) => {
              state.error = errorMessage;
              state.isLoading = false;
            });
          }
        },

        getBranches: async () => {
          try {
            // Emit loading started event
            gitEventEmitter.emit(GitEventType.LOADING_STARTED, { operation: 'getBranches' });

            set((state) => {
              state.isLoading = true;
              state.error = null;
              state.recoverySuggestions = [];
            });

            // Use the cache service to get or compute the branches
            // Branches don't change often, so cache for 1 minute
            const branches = await gitCacheService.getOrCompute(
              'branches',
              async () => {
                debug('Cache miss for branches, fetching from Git service');
                return gitService.listBranches();
              },
              60000, // Cache for 1 minute
            );

            // Current branch might change more often, so cache for less time
            const currentBranch = await gitCacheService.getOrCompute(
              'currentBranch',
              async () => {
                debug('Cache miss for currentBranch, fetching from Git service');
                return gitService.currentBranch();
              },
              30000, // Cache for 30 seconds
            );

            const branchList: GitBranch[] = branches.map((name) => ({
              name,
              oid: '', // We'll get this if needed later
              current: name === currentBranch,
            }));

            set((state) => {
              state.branches = branchList;
              state.currentBranch = currentBranch || '';
              state.isLoading = false;
            });

            // Emit branches updated event
            gitEventEmitter.emit(GitEventType.BRANCHES_UPDATED, {
              branches: branchList,
              currentBranch,
            });

            // Emit loading finished event
            gitEventEmitter.emit(GitEventType.LOADING_FINISHED, {
              operation: 'getBranches',
              success: true,
            });
          } catch (err) {
            // Convert to GitError if it's not already
            const gitError =
              err instanceof GitError
                ? err
                : GitError.fromError(
                    err instanceof Error ? err : new Error(String(err)),
                    GitErrorType.UNKNOWN_ERROR,
                    'Failed to get branches',
                  );

            error('Failed to get branches:', gitError);

            set((state) => {
              state.error = gitError.getUserMessage();
              state.isLoading = false;
              state.recoverySuggestions = gitError.getRecoverySuggestions();
            });

            // Emit error event
            gitEventEmitter.emit(GitEventType.ERROR_OCCURRED, {
              error: gitError,
              operation: 'getBranches',
            });

            // Emit loading finished event
            gitEventEmitter.emit(GitEventType.LOADING_FINISHED, {
              operation: 'getBranches',
              success: false,
            });
          }
        },

        // Commit operations
        addFile: async (filepath: string) => {
          try {
            set((state) => {
              state.error = null;
              state.recoverySuggestions = [];
            });

            // Use retryGitOperation for operations that might fail due to network or timing issues
            await retryGitOperation(async () => {
              await gitService.add(filepath);
            });

            info(`GitStore::addFile ${filepath}`);

            await get().getStatus();
            info(`File '${filepath}' added to staging area`);
          } catch (err) {
            // Convert to GitError if it's not already
            const gitError =
              err instanceof GitError
                ? err
                : GitError.fromError(
                    err instanceof Error ? err : new Error(String(err)),
                    GitErrorType.FILE_NOT_FOUND,
                    `Failed to add file: ${filepath}`,
                  );

            error('Failed to add file:', gitError);

            set((state) => {
              state.error = gitError.getUserMessage();
              state.recoverySuggestions = gitError.getRecoverySuggestions();
            });
          }
        },

        unstageFile: async (filepath: string) => {
          try {
            await gitService.unstage(filepath);

            await get().getStatus();
            info(`File '${filepath}' removed from staging area`);
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to unstage file';
            error('Failed to unstage file:', errorMessage);
            set((state) => {
              state.error = errorMessage;
            });
          }
        },

        addHunk: async (
          filepath: string,
          hunk: { startLine: number; endLine: number; content: string },
        ) => {
          try {
            set((state) => {
              state.error = null;
              state.recoverySuggestions = [];
            });

            // Use retryGitOperation for operations that might fail due to network or timing issues
            await retryGitOperation(async () => {
              await gitService.addHunk(filepath, hunk);
            });

            info(`GitStore::addHunk ${filepath} lines ${hunk.startLine}-${hunk.endLine}`);

            await get().getStatus();
            info(`Hunk from file '${filepath}' added to staging area`);
          } catch (err) {
            // Convert to GitError if it's not already
            const gitError =
              err instanceof GitError
                ? err
                : GitError.fromError(
                    err instanceof Error ? err : new Error(String(err)),
                    GitErrorType.FILE_NOT_FOUND,
                    `Failed to add hunk from file: ${filepath}`,
                  );

            error('Failed to add hunk:', gitError);

            set((state) => {
              state.error = gitError.getUserMessage();
              state.recoverySuggestions = gitError.getRecoverySuggestions();
            });
          }
        },

        unstageHunk: async (
          filepath: string,
          hunk: { startLine: number; endLine: number; content: string },
        ) => {
          try {
            await gitService.unstageHunk(filepath, hunk);

            await get().getStatus();
            info(`Hunk from file '${filepath}' removed from staging area`);
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to unstage hunk';
            error('Failed to unstage hunk:', errorMessage);
            set((state) => {
              state.error = errorMessage;
            });
          }
        },

        addAllFiles: async () => {
          try {
            // Use a more robust approach to add all files
            // First get the status to find all unstaged files
            const status = await gitService.status();

            // If there are no files to add, just return
            if (status?.files.length === 0) {
              info('No files to add to staging area');
              return;
            }

            // Add each file individually instead of using '.'
            for (const item of status.files) {
              // Only add files that are not already staged
              if (item.stage !== 2) {
                await gitService.add(item.file);
              }
            }

            await get().getStatus();
            info('All files added to staging area');
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to add all files';
            error('Failed to add all files:', errorMessage);
            set((state) => {
              state.error = errorMessage;
            });
          }
        },

        commit: async (message: string) => {
          try {
            // Emit loading started event
            gitEventEmitter.emit(GitEventType.LOADING_STARTED, { operation: 'commit', message });

            const { config } = get();

            // Validate user configuration
            if (!config.user.name || !config.user.email) {
              throw new GitError(
                GitErrorType.UNKNOWN_ERROR,
                'Git user name and email must be configured',
                undefined,
                false,
              );
            }

            // Validate commit message
            if (!message || message.trim() === '') {
              throw new GitError(
                GitErrorType.UNKNOWN_ERROR,
                'Commit message cannot be empty',
                undefined,
                false,
              );
            }

            set((state) => {
              state.isLoading = true;
              state.error = null;
              state.recoverySuggestions = [];
            });

            // Use retryGitOperation for operations that might fail due to network or timing issues
            const oid = await retryGitOperation(async () => {
              return await gitService.commit(message, {
                name: config.user.name,
                email: config.user.email,
              });
            });

            // Refresh state after commit
            await get().getCommits();
            await get().getStatus();

            set((state) => {
              state.isLoading = false;
            });

            info(`Commit created: ${oid}`);

            // Emit commit created event
            gitEventEmitter.emit(GitEventType.COMMIT_CREATED, {
              oid,
              message,
              author: {
                name: config.user.name,
                email: config.user.email,
              },
            });

            // Emit commits updated event
            gitEventEmitter.emit(GitEventType.COMMITS_UPDATED, {
              commits: get().commits,
            });

            // Emit status updated event
            gitEventEmitter.emit(GitEventType.STATUS_UPDATED, {
              status: get().status,
            });

            // Emit loading finished event
            gitEventEmitter.emit(GitEventType.LOADING_FINISHED, {
              operation: 'commit',
              success: true,
            });
          } catch (err) {
            // Convert to GitError if it's not already
            const gitError =
              err instanceof GitError
                ? err
                : GitError.fromError(
                    err instanceof Error ? err : new Error(String(err)),
                    GitErrorType.UNKNOWN_ERROR,
                    'Failed to commit changes',
                  );

            error('Failed to commit:', gitError);

            set((state) => {
              state.error = gitError.getUserMessage();
              state.isLoading = false;
              state.recoverySuggestions = gitError.getRecoverySuggestions();
            });

            // Emit error event
            gitEventEmitter.emit(GitEventType.ERROR_OCCURRED, {
              error: gitError,
              operation: 'commit',
            });

            // Emit loading finished event
            gitEventEmitter.emit(GitEventType.LOADING_FINISHED, {
              operation: 'commit',
              success: false,
            });
          }
        },

        getCommits: async (options = {}) => {
          try {
            const { limit = 10, skip = 0, resetPagination = false } = options;

            set((state) => {
              state.isLoading = true;
              if (resetPagination) {
                state.commitPagination.skip = 0;
              }
            });

            // Create a cache key based on the options
            const cacheKey = `commits:${resetPagination ? 0 : skip}:${limit}`;

            // Use the cache service to get or compute the commits
            const { commits, hasMore } = await gitCacheService.getOrCompute(
              cacheKey,
              async () => {
                debug(`Cache miss for ${cacheKey}, fetching from Git service`);
                return gitService.log({
                  limit,
                  skip: resetPagination ? 0 : skip,
                  depth: 100, // Get more commits to support pagination
                });
              },
              30000, // Cache for 30 seconds
            );

            const commitList: GitCommit[] = commits.map((commit) => ({
              oid: commit.oid,
              message: commit.commit.message,
              author: {
                name: commit.commit.author.name,
                email: commit.commit.author.email,
                timestamp: commit.commit.author.timestamp,
              },
              committer: {
                name: commit.commit.committer.name,
                email: commit.commit.committer.email,
                timestamp: commit.commit.committer.timestamp,
              },
            }));

            set((state) => {
              if (resetPagination || skip === 0) {
                state.commits = commitList;
              } else {
                state.commits = [...state.commits, ...commitList];
              }
              state.commitPagination.skip = resetPagination ? limit : skip + limit;
              state.commitPagination.limit = limit;
              state.commitPagination.hasMore = hasMore;
              state.commitPagination.total = state.commits.length + (hasMore ? 1 : 0); // Approximate total
              state.isLoading = false;
            });

            // Emit commits updated event
            gitEventEmitter.emit(GitEventType.COMMITS_UPDATED, {
              commits: get().commits,
            });
          } catch (err) {
            // Convert to GitError if it's not already
            const gitError =
              err instanceof GitError
                ? err
                : GitError.fromError(
                    err instanceof Error ? err : new Error(String(err)),
                    GitErrorType.UNKNOWN_ERROR,
                    'Failed to get commits',
                  );

            error('Failed to get commits:', gitError);

            set((state) => {
              state.error = gitError.getUserMessage();
              state.isLoading = false;
              state.recoverySuggestions = gitError.getRecoverySuggestions();
            });

            // Emit error event
            gitEventEmitter.emit(GitEventType.ERROR_OCCURRED, {
              error: gitError,
              operation: 'getCommits',
            });
          }
        },

        loadMoreCommits: async () => {
          const { commitPagination } = get();
          if (!commitPagination.hasMore) return;

          await get().getCommits({
            skip: commitPagination.skip,
            limit: commitPagination.limit,
          });
        },

        // Status operations
        getStatus: async (options = {}) => {
          try {
            // Don't try to get status if repository is not initialized
            const { isInitialized } = get();
            if (!isInitialized) {
              debug('Repository not initialized, skipping status check');
              return;
            }

            const { limit = 100, skip = 0, filter, resetPagination = false } = options;

            const currentFilter = filter || get().statusPagination.filter;

            set((state) => {
              state.isLoading = true;
              if (resetPagination) {
                state.statusPagination.skip = 0;
              }
              if (filter) {
                state.statusPagination.filter = filter;
              }
            });

            // Create a cache key based on the options
            const cacheKey = `status:${resetPagination ? 0 : skip}:${limit}:${currentFilter}`;

            // Use the cache service to get or compute the status
            // Status changes frequently, so use a shorter TTL (10 seconds)
            const { files, hasMore, total } = await gitCacheService.getOrCompute(
              cacheKey,
              async () => {
                debug(`Cache miss for ${cacheKey}, fetching from Git service`);
                return gitService.status({
                  limit,
                  skip: resetPagination ? 0 : skip,
                  filter: currentFilter,
                });
              },
              10000, // Cache for 10 seconds
            );

            const status: GitStatus[] = files.map((item) => ({
              file: item.file,
              head: item.head,
              workdir: item.workdir,
              stage: item.stage,
            }));

            set((state) => {
              if (resetPagination || skip === 0) {
                state.status = status;
              } else {
                state.status = [...state.status, ...status];
              }
              state.statusPagination.skip = resetPagination ? limit : skip + limit;
              state.statusPagination.limit = limit;
              state.statusPagination.hasMore = hasMore;
              state.statusPagination.total = total;
              state.isLoading = false;
            });

            // Emit status updated event
            gitEventEmitter.emit(GitEventType.STATUS_UPDATED, {
              status: get().status,
            });
          } catch (err) {
            // Convert to GitError if it's not already
            const gitError =
              err instanceof GitError
                ? err
                : GitError.fromError(
                    err instanceof Error ? err : new Error(String(err)),
                    GitErrorType.UNKNOWN_ERROR,
                    'Failed to get status',
                  );

            error('Failed to get status:', gitError);

            set((state) => {
              state.error = gitError.getUserMessage();
              state.isLoading = false;
              state.recoverySuggestions = gitError.getRecoverySuggestions();
            });

            // Emit error event
            gitEventEmitter.emit(GitEventType.ERROR_OCCURRED, {
              error: gitError,
              operation: 'getStatus',
            });
          }
        },

        loadMoreStatus: async () => {
          const { statusPagination } = get();
          if (!statusPagination.hasMore) return;

          await get().getStatus({
            skip: statusPagination.skip,
            limit: statusPagination.limit,
            filter: statusPagination.filter,
          });
        },

        setStatusFilter: (filter: 'all' | 'modified' | 'staged' | 'untracked') => {
          set((state) => {
            state.statusPagination.filter = filter;
          });

          // Reload status with new filter
          get().getStatus({ resetPagination: true });
        },

        // Configuration
        setConfig: (config: Partial<GitConfig>) => {
          set((state) => {
            state.config = { ...state.config, ...config };
          });
        },

        // Utility
        reset: () => {
          set((state) => {
            Object.assign(state, initialState);
          });
        },

        // Remote operations
        addRemote: async (name: string, url: string) => {
          try {
            // Emit loading started event
            gitEventEmitter.emit(GitEventType.LOADING_STARTED, {
              operation: 'addRemote',
              name,
              url,
            });

            set((state) => {
              state.isLoading = true;
              state.error = null;
              state.recoverySuggestions = [];
            });

            // Add remote to Git
            await gitService.addRemote(name, url);

            // Update config
            set((state) => {
              if (!state.config.remotes) {
                state.config.remotes = {};
              }

              state.config.remotes[url] = {
                name,
                url,
              };

              // If this is the first remote, set it as default
              if (Object.keys(state.config.remotes).length === 1) {
                state.config.defaultRemote = name;
              }

              state.isLoading = false;
            });

            info(`Remote '${name}' added with URL: ${url}`);

            // Emit loading finished event
            gitEventEmitter.emit(GitEventType.LOADING_FINISHED, {
              operation: 'addRemote',
              success: true,
            });
          } catch (err) {
            // Convert to GitError if it's not already
            const gitError =
              err instanceof GitError
                ? err
                : GitError.fromError(
                    err instanceof Error ? err : new Error(String(err)),
                    GitErrorType.UNKNOWN_ERROR,
                    `Failed to add remote: ${name}`,
                  );

            error('Failed to add remote:', gitError);

            set((state) => {
              state.error = gitError.getUserMessage();
              state.isLoading = false;
              state.recoverySuggestions = gitError.getRecoverySuggestions();
            });

            // Emit error event
            gitEventEmitter.emit(GitEventType.ERROR_OCCURRED, {
              error: gitError,
              operation: 'addRemote',
            });

            // Emit loading finished event
            gitEventEmitter.emit(GitEventType.LOADING_FINISHED, {
              operation: 'addRemote',
              success: false,
            });
          }
        },

        removeRemote: async (name: string) => {
          try {
            // Emit loading started event
            gitEventEmitter.emit(GitEventType.LOADING_STARTED, { operation: 'removeRemote', name });

            set((state) => {
              state.isLoading = true;
              state.error = null;
              state.recoverySuggestions = [];
            });

            // Remove remote from Git
            await gitService.removeRemote(name);

            // Update config
            set((state) => {
              // Find the URL for this remote
              const remoteUrl = Object.keys(state.config.remotes).find(
                (url) => state.config.remotes[url].name === name,
              );

              if (remoteUrl) {
                delete state.config.remotes[remoteUrl];
              }

              // If we removed the default remote, set a new default if possible
              if (state.config.defaultRemote === name) {
                const remoteNames = Object.values(state.config.remotes).map((r) => r.name);
                state.config.defaultRemote = remoteNames.length > 0 ? remoteNames[0] : '';
              }

              state.isLoading = false;
            });

            info(`Remote '${name}' removed`);

            // Emit loading finished event
            gitEventEmitter.emit(GitEventType.LOADING_FINISHED, {
              operation: 'removeRemote',
              success: true,
            });
          } catch (err) {
            // Convert to GitError if it's not already
            const gitError =
              err instanceof GitError
                ? err
                : GitError.fromError(
                    err instanceof Error ? err : new Error(String(err)),
                    GitErrorType.UNKNOWN_ERROR,
                    `Failed to remove remote: ${name}`,
                  );

            error('Failed to remove remote:', gitError);

            set((state) => {
              state.error = gitError.getUserMessage();
              state.isLoading = false;
              state.recoverySuggestions = gitError.getRecoverySuggestions();
            });

            // Emit error event
            gitEventEmitter.emit(GitEventType.ERROR_OCCURRED, {
              error: gitError,
              operation: 'removeRemote',
            });

            // Emit loading finished event
            gitEventEmitter.emit(GitEventType.LOADING_FINISHED, {
              operation: 'removeRemote',
              success: false,
            });
          }
        },

        // Credential operations
        saveCredential: async (remoteUrl: string, credential: GitCredential) => {
          try {
            // Store credential securely
            await gitCredentialsService.saveCredential(remoteUrl, credential);

            // Update config to track credential type
            set((state) => {
              if (!state.config.remotes) {
                state.config.remotes = {};
              }

              // Find the remote entry for this URL
              const normalizedUrl = gitCredentialsService['normalizeUrl'](remoteUrl);
              const matchingUrl = Object.keys(state.config.remotes).find(
                (url) => gitCredentialsService['normalizeUrl'](url) === normalizedUrl,
              );

              if (matchingUrl) {
                state.config.remotes[matchingUrl].credentialType = credential.type;
              }
            });

            info(`Credentials saved for remote: ${remoteUrl}`);
          } catch (err) {
            error('Failed to save credentials:', err);
            throw err;
          }
        },

        loadCredential: async (remoteUrl: string) => {
          try {
            // Load credential from secure storage
            return await gitCredentialsService.loadCredential(remoteUrl);
          } catch (err) {
            error('Failed to load credentials:', err);
            throw err;
          }
        },

        deleteCredential: async (remoteUrl: string) => {
          try {
            // Delete credential from secure storage
            await gitCredentialsService.deleteCredential(remoteUrl);

            // Update config to remove credential type
            set((state) => {
              if (!state.config.remotes) {
                return;
              }

              // Find the remote entry for this URL
              const normalizedUrl = gitCredentialsService['normalizeUrl'](remoteUrl);
              const matchingUrl = Object.keys(state.config.remotes).find(
                (url) => gitCredentialsService['normalizeUrl'](url) === normalizedUrl,
              );

              if (matchingUrl && state.config.remotes[matchingUrl]) {
                delete state.config.remotes[matchingUrl].credentialType;
              }
            });

            info(`Credentials deleted for remote: ${remoteUrl}`);
          } catch (err) {
            error('Failed to delete credentials:', err);
            throw err;
          }
        },

        clearAllCredentials: async () => {
          try {
            // Clear all credentials from secure storage
            await gitCredentialsService.clearAllCredentials();

            // Update config to remove all credential types
            set((state) => {
              if (!state.config.remotes) {
                return;
              }

              // Remove credential type from all remotes
              Object.keys(state.config.remotes).forEach((url) => {
                if (state.config.remotes[url]) {
                  delete state.config.remotes[url].credentialType;
                }
              });
            });

            info('All credentials cleared');
          } catch (err) {
            error('Failed to clear all credentials:', err);
            throw err;
          }
        },

        setError: (error: string | null) => {
          set((state) => {
            state.error = error;
          });
        },

        setLoading: (loading: boolean) => {
          set((state) => {
            state.isLoading = loading;
          });
        },

        // Remote operations
        push: async (remote: string = 'origin', branch?: string): Promise<boolean> => {
          try {
            // Set loading state
            set((state) => {
              state.isLoading = true;
              state.error = null;
            });

            gitEventEmitter.emit(GitEventType.LOADING_STARTED, {
              operation: 'push',
              remote,
              branch,
            });

            // Get current branch if not specified
            const targetBranch = branch || get().currentBranch;
            if (!targetBranch) {
              throw new Error('No branch specified and no current branch found');
            }

            // Use gitService to push changes
            const result = await gitService.push(remote, targetBranch);

            // Update state based on result
            set((state) => {
              state.isLoading = false;
            });

            gitEventEmitter.emit(GitEventType.LOADING_FINISHED, {
              operation: 'push',
              success: true,
            });

            return result;
          } catch (err) {
            // Handle error
            const errorMessage = err instanceof Error ? err.message : String(err);

            set((state) => {
              state.isLoading = false;
              state.error = errorMessage;
            });

            gitEventEmitter.emit(GitEventType.ERROR_OCCURRED, {
              operation: 'push',
              error: errorMessage,
            });

            gitEventEmitter.emit(GitEventType.LOADING_FINISHED, {
              operation: 'push',
              success: false,
            });

            return false;
          }
        },

        pull: async (remote: string = 'origin', branch?: string): Promise<boolean> => {
          try {
            // Set loading state
            set((state) => {
              state.isLoading = true;
              state.error = null;
            });

            gitEventEmitter.emit(GitEventType.LOADING_STARTED, {
              operation: 'pull',
              remote,
              branch,
            });

            // Get current branch if not specified
            const targetBranch = branch || get().currentBranch;
            if (!targetBranch) {
              throw new Error('No branch specified and no current branch found');
            }

            // Use gitService to pull changes
            const result = await gitService.pull(remote, targetBranch);

            // Update state based on result
            set((state) => {
              state.isLoading = false;
            });

            // If successful, refresh commits and status
            if (result) {
              await get().getCommits();
              await get().getStatus();
            }

            gitEventEmitter.emit(GitEventType.LOADING_FINISHED, {
              operation: 'pull',
              success: true,
            });

            return result;
          } catch (err) {
            // Handle error
            const errorMessage = err instanceof Error ? err.message : String(err);

            set((state) => {
              state.isLoading = false;
              state.error = errorMessage;
            });

            gitEventEmitter.emit(GitEventType.ERROR_OCCURRED, {
              operation: 'pull',
              error: errorMessage,
            });

            gitEventEmitter.emit(GitEventType.LOADING_FINISHED, {
              operation: 'pull',
              success: false,
            });

            return false;
          }
        },

        // Rebase operations
        startInteractiveRebase: async (targetCommitOid: string) => {
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });

          try {
            // In a real implementation, this would call the Git service
            // For now, we'll just simulate the operation
            debug('Starting interactive rebase to commit', targetCommitOid);

            // Set rebase state in the store
            set((state) => {
              state.rebaseInProgress = true;
              state.rebaseTargetCommit = targetCommitOid;
              state.rebaseCommits = state.commits
                .filter((commit) => commit.oid !== targetCommitOid) // Exclude the target commit
                .slice(
                  0,
                  state.commits.findIndex((c) => c.oid === targetCommitOid),
                ); // Get commits up to target
            });

            // Notify UI of rebase start
            gitEventEmitter.emit(GitEventType.REBASE_STARTED, { targetCommit: targetCommitOid });
          } catch (err) {
            const gitError = new GitError(
              GitErrorType.REBASE_ERROR,
              'Failed to start interactive rebase',
              err as Error,
            );
            error('Failed to start interactive rebase:', gitError);
            set((state) => {
              state.error = gitError.message;
            });
            throw gitError;
          } finally {
            set((state) => {
              state.isLoading = false;
            });
          }
        },

        continueRebase: async () => {
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });

          try {
            // In a real implementation, this would call the Git service
            // For now, we'll just simulate the operation
            debug('Continuing rebase');

            // Complete the rebase
            set((state) => {
              state.rebaseInProgress = false;
              state.rebaseTargetCommit = null;
              state.rebaseCommits = [];
            });

            // Refresh commits and branches
            const store = get();
            await store.getCommits();
            await store.getBranches();

            // Notify UI of rebase completion
            gitEventEmitter.emit(GitEventType.REBASE_COMPLETED, {});
          } catch (err) {
            const gitError = new GitError(
              GitErrorType.REBASE_ERROR,
              'Failed to continue rebase',
              err as Error,
            );
            error('Failed to continue rebase:', gitError);
            set((state) => {
              state.error = gitError.message;
            });
            throw gitError;
          } finally {
            set((state) => {
              state.isLoading = false;
            });
          }
        },

        abortRebase: async () => {
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });

          try {
            // In a real implementation, this would call the Git service
            // For now, we'll just simulate the operation
            debug('Aborting rebase');

            // Reset rebase state
            set((state) => {
              state.rebaseInProgress = false;
              state.rebaseTargetCommit = null;
              state.rebaseCommits = [];
            });

            // Refresh commits and branches
            const store = get();
            await store.getCommits();
            await store.getBranches();

            // Notify UI of rebase abort
            gitEventEmitter.emit(GitEventType.REBASE_ABORTED, {});
          } catch (err) {
            const gitError = new GitError(
              GitErrorType.REBASE_ERROR,
              'Failed to abort rebase',
              err as Error,
            );
            error('Failed to abort rebase:', gitError);
            set((state) => {
              state.error = gitError.message;
            });
            throw gitError;
          } finally {
            set((state) => {
              state.isLoading = false;
            });
          }
        },

        reorderCommits: async (commitOids: string[]) => {
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });

          try {
            // In a real implementation, this would call the Git service
            // For now, we'll just simulate the operation
            debug('Reordering commits', commitOids);

            // Update rebase commits order
            set((state) => {
              // Create a new array with the reordered commits
              const reorderedCommits = [];
              for (const oid of commitOids) {
                const commit = state.rebaseCommits.find((c) => c.oid === oid);
                if (commit) {
                  reorderedCommits.push(commit);
                }
              }
              state.rebaseCommits = reorderedCommits;
            });
          } catch (err) {
            const gitError = new GitError(
              GitErrorType.REBASE_ERROR,
              'Failed to reorder commits',
              err as Error,
            );
            error('Failed to reorder commits:', gitError);
            set((state) => {
              state.error = gitError.message;
            });
            throw gitError;
          } finally {
            set((state) => {
              state.isLoading = false;
            });
          }
        },

        squashCommit: async (commitOid: string, targetOid: string, message: string) => {
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });

          try {
            // In a real implementation, this would call the Git service
            // For now, we'll just simulate the operation
            debug('Squashing commit', commitOid, 'into', targetOid, 'with message', message);

            // Update rebase commits to reflect squash
            set((state) => {
              const commitIndex = state.rebaseCommits.findIndex((c) => c.oid === commitOid);
              const targetIndex = state.rebaseCommits.findIndex((c) => c.oid === targetOid);

              if (commitIndex !== -1 && targetIndex !== -1) {
                // Create a new array without the squashed commit
                const newRebaseCommits = [...state.rebaseCommits];
                newRebaseCommits.splice(commitIndex, 1);

                // Update the target commit message if provided
                if (message) {
                  newRebaseCommits[targetIndex] = {
                    ...newRebaseCommits[targetIndex],
                    message,
                  };
                }

                state.rebaseCommits = newRebaseCommits;
              }
            });
          } catch (err) {
            const gitError = new GitError(
              GitErrorType.REBASE_ERROR,
              'Failed to squash commit',
              err as Error,
            );
            error('Failed to squash commit:', gitError);
            set((state) => {
              state.error = gitError.message;
            });
            throw gitError;
          } finally {
            set((state) => {
              state.isLoading = false;
            });
          }
        },

        dropCommit: async (commitOid: string) => {
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });

          try {
            // In a real implementation, this would call the Git service
            // For now, we'll just simulate the operation
            debug('Dropping commit', commitOid);

            // Remove the commit from rebase commits
            set((state) => {
              state.rebaseCommits = state.rebaseCommits.filter((c) => c.oid !== commitOid);
            });
          } catch (err) {
            const gitError = new GitError(
              GitErrorType.REBASE_ERROR,
              'Failed to drop commit',
              err as Error,
            );
            error('Failed to drop commit:', gitError);
            set((state) => {
              state.error = gitError.message;
            });
            throw gitError;
          } finally {
            set((state) => {
              state.isLoading = false;
            });
          }
        },

        // JetBrains-style Git integration
        // File-level operations
        getFileBlame: async (filepath: string) => {
          try {
            set((state) => {
              state.isLoading = true;
              state.error = null;
            });

            const blame = await gitService.getFileBlame(filepath);

            set((state) => {
              state.fileBlame[filepath] = blame;
              state.isLoading = false;
            });

            debug(`Got blame for ${filepath}`);
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to get file blame';
            error('Failed to get file blame:', errorMessage);
            set((state) => {
              state.error = errorMessage;
              state.isLoading = false;
            });
          }
        },

        getFileHistory: async (filepath: string) => {
          try {
            set((state) => {
              state.isLoading = true;
              state.error = null;
            });

            const history = await gitService.getFileHistory(filepath);

            set((state) => {
              state.fileHistory[filepath] = history.map((commit) => ({
                oid: commit.oid,
                message: commit.message,
                author: {
                  name: commit.author.name,
                  email: commit.author.email,
                  timestamp: commit.author.timestamp,
                },
                committer: {
                  name: commit.author.name,
                  email: commit.author.email,
                  timestamp: commit.author.timestamp,
                },
              }));
              state.isLoading = false;
            });

            debug(`Got history for ${filepath}`);
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to get file history';
            error('Failed to get file history:', errorMessage);
            set((state) => {
              state.error = errorMessage;
              state.isLoading = false;
            });
          }
        },

        getFileDiff: async (filepath: string, oldOid?: string, newOid?: string) => {
          try {
            set((state) => {
              state.isLoading = true;
              state.error = null;
            });

            const diff = await gitService.getFileDiff(filepath, oldOid, newOid);

            set((state) => {
              state.fileDiff[filepath] = diff;
              state.isLoading = false;
            });

            debug(`Got diff for ${filepath}`);
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to get file diff';
            error('Failed to get file diff:', errorMessage);
            set((state) => {
              state.error = errorMessage;
              state.isLoading = false;
            });
          }
        },

        getCommitDetails: async (commitOid: string) => {
          try {
            set((state) => {
              state.commitDetails.isLoading = true;
              state.error = null;
            });

            const files = await gitService.getCommitFiles(commitOid);

            set((state) => {
              state.commitDetails = {
                commitOid,
                files,
                isLoading: false,
              };
            });

            debug(`Got details for commit ${commitOid}`);
          } catch (err) {
            const errorMessage =
              err instanceof Error ? err.message : 'Failed to get commit details';
            error('Failed to get commit details:', errorMessage);
            set((state) => {
              state.error = errorMessage;
              state.commitDetails.isLoading = false;
            });
          }
        },

        // Stash operations
        createStash: async (message: string) => {
          try {
            set((state) => {
              state.isLoading = true;
              state.error = null;
            });

            const stashId = await gitService.createStash(message);

            // Refresh stashes
            await get().listStashes();

            set((state) => {
              state.isLoading = false;
            });

            info(`Stash created: ${stashId}`);
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to create stash';
            error('Failed to create stash:', errorMessage);
            set((state) => {
              state.error = errorMessage;
              state.isLoading = false;
            });
          }
        },

        listStashes: async () => {
          try {
            set((state) => {
              state.isLoading = true;
              state.error = null;
            });

            const stashes = await gitService.listStashes();

            set((state) => {
              state.stashes = stashes;
              state.isLoading = false;
            });

            debug(`Got ${stashes.length} stashes`);
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to list stashes';
            error('Failed to list stashes:', errorMessage);
            set((state) => {
              state.error = errorMessage;
              state.isLoading = false;
            });
          }
        },

        applyStash: async (stashId: string) => {
          try {
            set((state) => {
              state.isLoading = true;
              state.error = null;
            });

            await gitService.applyStash(stashId);

            // Refresh status
            await get().getStatus();

            set((state) => {
              state.isLoading = false;
            });

            info(`Stash applied: ${stashId}`);
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to apply stash';
            error('Failed to apply stash:', errorMessage);
            set((state) => {
              state.error = errorMessage;
              state.isLoading = false;
            });
          }
        },

        dropStash: async (stashId: string) => {
          try {
            set((state) => {
              state.isLoading = true;
              state.error = null;
            });

            await gitService.dropStash(stashId);

            // Refresh stashes
            await get().listStashes();

            set((state) => {
              state.isLoading = false;
            });

            info(`Stash dropped: ${stashId}`);
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to drop stash';
            error('Failed to drop stash:', errorMessage);
            set((state) => {
              state.error = errorMessage;
              state.isLoading = false;
            });
          }
        },

        // UI state operations
        toggleBlame: (show?: boolean) => {
          set((state) => {
            state.showBlame = show !== undefined ? show : !state.showBlame;
            // If we're showing blame, hide diff
            if (state.showBlame) {
              state.showDiff = false;
            }
          });
        },

        toggleDiff: (show?: boolean) => {
          set((state) => {
            state.showDiff = show !== undefined ? show : !state.showDiff;
            // If we're showing diff, hide blame
            if (state.showDiff) {
              state.showBlame = false;
            }
          });
        },

        selectCommit: (commitOid: string | null) => {
          set((state) => {
            state.selectedCommit = commitOid;
          });
        },

        // GitHub integration
        startGithubOAuth: async () => {
          try {
            set((state) => {
              state.isLoading = true;
              state.error = null;
            });

            // Start the OAuth flow
            await githubAuthService.startOAuthFlow();

            // Note: This will redirect the user to GitHub's authorization page,
            // so the following code won't be executed until the user returns
            // via the OAuth callback page.
          } catch (err) {
            const errorMessage =
              err instanceof Error ? err.message : 'Failed to start GitHub OAuth flow';
            error('GitStore', errorMessage);
            set((state) => {
              state.error = errorMessage;
              state.isLoading = false;
            });
          }
        },

        connectGithub: async (token: string) => {
          try {
            set((state) => {
              state.isLoading = true;
              state.error = null;
            });

            // For backward compatibility, we still support personal access tokens
            // If the user is already authenticated via OAuth, this will be a no-op
            if (!githubAuthService.isAuthenticated()) {
              // Try to authenticate with the token using the old service
              const { username } = await githubService.authenticate(token);

              set((state) => {
                // Ensure github object exists in config
                if (!state.config.github) {
                  state.config.github = {
                    token: undefined,
                    username: undefined,
                  };
                }
                state.config.github.token = token;
                state.config.github.username = username;
                state.isGithubConnected = true;
                state.isLoading = false;
              });
            } else {
              // User is already authenticated via OAuth
              const user = githubAuthService.getAuthenticatedUser();

              if (user) {
                set((state) => {
                  // Ensure github object exists in config
                  if (!state.config.github) {
                    state.config.github = {
                      token: undefined,
                      username: undefined,
                    };
                  }
                  state.config.github.token = token; // Store the token for backward compatibility
                  state.config.github.username = user.username;
                  state.isGithubConnected = true;
                  state.isLoading = false;
                });
              }
            }

            // Get repositories after successful connection
            await get().getGithubRepos();

            const username = get().config.github.username;
            info('GitStore', `Connected to GitHub as ${username}`);
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to connect to GitHub';
            error('GitStore', errorMessage);
            set((state) => {
              state.error = errorMessage;
              state.isLoading = false;
            });
          }
        },

        disconnectGithub: () => {
          // Disconnect from both services
          githubService.disconnect();
          githubAuthService.logout();

          set((state) => {
            state.config.github.token = undefined;
            state.config.github.username = undefined;
            state.isGithubConnected = false;
            state.githubRepos = [];
          });

          info('GitStore', 'Disconnected from GitHub');
        },

        getGithubRepos: async (options = {}) => {
          try {
            if (!get().isGithubConnected) {
              throw new Error('Not connected to GitHub');
            }

            const { page = 1, perPage = 30, resetPagination = false } = options;

            set((state) => {
              state.isLoading = true;
              state.error = null;
              if (resetPagination) {
                state.githubRepoPagination.page = 1;
              }
            });

            const currentPage = resetPagination ? 1 : page;
            const { repositories, hasNextPage, totalCount } = await githubService.listRepositories(
              currentPage,
              perPage,
            );

            set((state) => {
              if (resetPagination || currentPage === 1) {
                state.githubRepos = repositories;
              } else {
                state.githubRepos = [...state.githubRepos, ...repositories];
              }
              state.githubRepoPagination.page = currentPage;
              state.githubRepoPagination.perPage = perPage;
              state.githubRepoPagination.hasNextPage = hasNextPage;
              state.githubRepoPagination.totalCount = totalCount;
              state.isLoading = false;
            });

            debug(
              'GitStore',
              `Found ${repositories.length} GitHub repositories (page ${currentPage}, total: ${totalCount})`,
            );
          } catch (err) {
            const errorMessage =
              err instanceof Error ? err.message : 'Failed to get GitHub repositories';
            error('GitStore', errorMessage);
            set((state) => {
              state.error = errorMessage;
              state.isLoading = false;
            });
          }
        },

        loadMoreGithubRepos: async () => {
          const { githubRepoPagination } = get();
          if (!githubRepoPagination.hasNextPage) return;

          await get().getGithubRepos({
            page: githubRepoPagination.page + 1,
            perPage: githubRepoPagination.perPage,
          });
        },

        createGithubRepo: async (name: string, options = {}) => {
          try {
            if (!get().isGithubConnected) {
              throw new Error('Not connected to GitHub');
            }

            set((state) => {
              state.isLoading = true;
              state.error = null;
            });

            const repo = await githubService.createRepository(name, options);

            // Refresh the list of repositories
            await get().getGithubRepos();

            set((state) => {
              state.isLoading = false;
            });

            info('GitStore', `Created GitHub repository ${name}`);
            return repo;
          } catch (err) {
            const errorMessage =
              err instanceof Error ? err.message : `Failed to create GitHub repository ${name}`;
            error('GitStore', errorMessage);
            set((state) => {
              state.error = errorMessage;
              state.isLoading = false;
            });
          }
        },
      })),
      {
        name: 'git-store',
        storage: createIndexedDBStorage('git-store'),
        partialize: (state) => ({
          config: state.config,
          isInitialized: state.isInitialized,
          branches: state.branches,
          currentBranch: state.currentBranch,
          isGithubConnected: state.isGithubConnected,
          githubRepos: state.githubRepos,
        }),
        onRehydrateStorage: (state) => {
          // Return a function that will be called when the store is rehydrated
          return (rehydratedState, error) => {
            if (error) {
              console.error('Error rehydrating git store:', error);
              return;
            }

            if (rehydratedState) {
              // Call our _onHydrate function with the rehydrated state
              const store = useGitStore.getState();
              if (store._onHydrate) {
                store._onHydrate(rehydratedState);
              }

              // Restore GitHub authentication if connected
              if (rehydratedState.isGithubConnected && rehydratedState.config?.github?.token) {
                // Re-authenticate with GitHub using the stored token
                // We use a silent approach to avoid disrupting the user experience
                githubService.authenticate(rehydratedState.config.github.token).catch((err) => {
                  // If authentication fails, update the store to reflect disconnected state
                  console.error('Failed to restore GitHub authentication:', err);
                  store.disconnectGithub();
                });
              }
            }
          };
        },
      },
    ),
    {
      name: 'git-store',
    },
  ),
);
