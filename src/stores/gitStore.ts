import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { gitService } from '@/services/gitService';
import { debug, error, info } from '@/services/loggerService';

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

  // JetBrains-style Git integration
  fileBlame: Record<string, GitFileBlame[]>;
  fileHistory: Record<string, GitCommit[]>;
  fileDiff: Record<string, GitFileDiff>;
  stashes: GitStash[];

  // UI state for JetBrains-style integration
  selectedCommit: string | null;
  showBlame: boolean;
  showDiff: boolean;

  // Pagination state
  commitPagination: {
    skip: number;
    limit: number;
    hasMore: boolean;
    total: number;
  };
  statusPagination: {
    skip: number;
    limit: number;
    hasMore: boolean;
    total: number;
    filter: 'all' | 'modified' | 'staged' | 'untracked';
  };
}

export interface GitActions {
  // Repository operations
  initRepository: () => Promise<void>;
  createInitialCommit: () => Promise<void>;
  resetGitIndex: () => Promise<void>;

  // Branch operations
  createBranch: (name: string) => Promise<void>;
  switchBranch: (name: string) => Promise<void>;
  deleteBranch: (name: string) => Promise<void>;
  getBranches: () => Promise<void>;

  // Commit operations
  addFile: (filepath: string) => Promise<void>;
  unstageFile: (filepath: string) => Promise<void>;
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

  // JetBrains-style Git integration
  // File-level operations
  getFileBlame: (filepath: string) => Promise<void>;
  getFileHistory: (filepath: string) => Promise<void>;
  getFileDiff: (filepath: string, oldOid?: string, newOid?: string) => Promise<void>;

  // Stash operations
  createStash: (message: string) => Promise<void>;
  listStashes: () => Promise<void>;
  applyStash: (stashId: string) => Promise<void>;
  dropStash: (stashId: string) => Promise<void>;

  // UI state operations
  toggleBlame: (show?: boolean) => void;
  toggleDiff: (show?: boolean) => void;
  selectCommit: (commitOid: string | null) => void;

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
  },
  isLoading: false,
  error: null,

  // JetBrains-style Git integration
  fileBlame: {},
  fileHistory: {},
  fileDiff: {},
  stashes: [],
  selectedCommit: null,
  showBlame: false,
  showDiff: false,

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
};

export const useGitStore = create<GitStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        // Repository operations
        initRepository: async () => {
          try {
            set((state) => {
              state.isLoading = true;
              state.error = null;
            });

            await gitService.init('main');

            // Get the actual current branch (may be undefined if no commits yet)
            const currentBranch = await gitService.currentBranch();

            set((state) => {
              state.isInitialized = true;
              state.currentBranch = currentBranch || '';
              state.isLoading = false;
            });

            info('Git repository initialized');
          } catch (err) {
            const errorMessage =
              err instanceof Error ? err.message : 'Failed to initialize repository';
            error('Failed to initialize git repository:', errorMessage);
            set((state) => {
              state.error = errorMessage;
              state.isLoading = false;
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
            set((state) => {
              state.isLoading = true;
              state.error = null;
            });

            await gitService.branch(name);

            await get().getBranches();

            set((state) => {
              state.isLoading = false;
            });

            info(`Branch '${name}' created successfully`);
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to create branch';
            error('Failed to create branch:', errorMessage);
            set((state) => {
              state.error = errorMessage;
              state.isLoading = false;
            });
          }
        },

        switchBranch: async (name: string) => {
          try {
            set((state) => {
              state.isLoading = true;
              state.error = null;
            });

            await gitService.checkout(name);

            set((state) => {
              state.currentBranch = name;
              state.isLoading = false;
            });

            await get().getBranches();
            await get().getStatus();

            info(`Switched to branch '${name}'`);
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to switch branch';
            error('Failed to switch branch:', errorMessage);
            set((state) => {
              state.error = errorMessage;
              state.isLoading = false;
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
            const branches = await gitService.listBranches();
            const currentBranch = await gitService.currentBranch();

            const branchList: GitBranch[] = branches.map((name) => ({
              name,
              oid: '', // We'll get this if needed later
              current: name === currentBranch,
            }));

            set((state) => {
              state.branches = branchList;
              state.currentBranch = currentBranch || '';
            });
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to get branches';
            error('Failed to get branches:', errorMessage);
            set((state) => {
              state.error = errorMessage;
            });
          }
        },

        // Commit operations
        addFile: async (filepath: string) => {
          try {
            await gitService.add(filepath);
            info(`GitStore::addFile ${filepath}`);

            await get().getStatus();
            info(`File '${filepath}' added to staging area`);
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to add file';
            error('Failed to add file:', errorMessage);
            set((state) => {
              state.error = errorMessage;
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
            const { config } = get();

            if (!config.user.name || !config.user.email) {
              throw new Error('Git user name and email must be configured');
            }

            set((state) => {
              state.isLoading = true;
              state.error = null;
            });

            const oid = await gitService.commit(message, {
              name: config.user.name,
              email: config.user.email,
            });

            await get().getCommits();
            await get().getStatus();

            set((state) => {
              state.isLoading = false;
            });

            info(`Commit created: ${oid}`);
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to commit';
            error('Failed to commit:', errorMessage);
            set((state) => {
              state.error = errorMessage;
              state.isLoading = false;
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

            const { commits, hasMore } = await gitService.log({
              limit,
              skip: resetPagination ? 0 : skip,
              depth: 100, // Get more commits to support pagination
            });

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
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to get commits';
            error('Failed to get commits:', errorMessage);
            set((state) => {
              state.error = errorMessage;
              state.isLoading = false;
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

            const { files, hasMore, total } = await gitService.status({
              limit,
              skip: resetPagination ? 0 : skip,
              filter: currentFilter,
            });

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
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to get status';
            error('Failed to get status:', errorMessage);
            set((state) => {
              state.error = errorMessage;
              state.isLoading = false;
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
      })),
      {
        name: 'git-store',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          config: state.config,
          isInitialized: state.isInitialized,
        }),
      },
    ),
    {
      name: 'git-store',
    },
  ),
);
