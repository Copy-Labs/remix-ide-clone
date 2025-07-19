import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Octokit } from '@octokit/rest';
import { gitService } from '@/services/gitService';
import { debug, info, warn, error } from '@/services/loggerService';

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
    token?: string;
    username?: string;
  };
}

export interface GitState {
  // Repository state
  isInitialized: boolean;
  currentBranch: string;
  branches: GitBranch[];
  remotes: GitRemote[];
  commits: GitCommit[];
  status: GitStatus[];

  // Configuration
  config: GitConfig;

  // UI state
  isLoading: boolean;
  error: string | null;

  // GitHub integration
  githubRepos: any[];
  isGithubConnected: boolean;
}

export interface GitActions {
  // Repository operations
  initRepository: () => Promise<void>;
  cloneRepository: (url: string, dir?: string) => Promise<void>;

  // Branch operations
  createBranch: (name: string) => Promise<void>;
  switchBranch: (name: string) => Promise<void>;
  deleteBranch: (name: string) => Promise<void>;
  getBranches: () => Promise<void>;

  // Commit operations
  addFile: (filepath: string) => Promise<void>;
  addAllFiles: () => Promise<void>;
  commit: (message: string) => Promise<void>;
  getCommits: (limit?: number) => Promise<void>;

  // Remote operations
  addRemote: (name: string, url: string) => Promise<void>;
  removeRemote: (name: string) => Promise<void>;
  push: (remote?: string, branch?: string) => Promise<void>;
  pull: (remote?: string, branch?: string) => Promise<void>;
  fetch: (remote?: string) => Promise<void>;

  // Status operations
  getStatus: () => Promise<void>;

  // Configuration
  setConfig: (config: Partial<GitConfig>) => void;

  // GitHub integration
  connectGithub: (token: string) => Promise<void>;
  disconnectGithub: () => void;
  getGithubRepos: () => Promise<void>;
  createGithubRepo: (name: string, description?: string, isPrivate?: boolean) => Promise<void>;

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
  remotes: [],
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
  },
  isLoading: false,
  error: null,
  githubRepos: [],
  isGithubConnected: false,
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

            set((state) => {
              state.isInitialized = true;
              state.currentBranch = 'main';
              state.isLoading = false;
            });

            info('Git repository initialized');
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to initialize repository';
            error('Failed to initialize git repository:', errorMessage);
            set((state) => {
              state.error = errorMessage;
              state.isLoading = false;
            });
          }
        },

        cloneRepository: async (url: string, dir = '/') => {
          try {
            set((state) => {
              state.isLoading = true;
              state.error = null;
            });

            await gitService.clone(url, dir);

            set((state) => {
              state.isInitialized = true;
              state.isLoading = false;
            });

            // Get initial branch and status
            await get().getBranches();
            await get().getStatus();

            info('Repository cloned successfully');
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to clone repository';
            error('Failed to clone repository:', errorMessage);
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

        addAllFiles: async () => {
          try {
            await gitService.add('.');

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

        getCommits: async (limit = 10) => {
          try {
            const commits = await gitService.log(limit);

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
              state.commits = commitList;
            });
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to get commits';
            error('Failed to get commits:', errorMessage);
            set((state) => {
              state.error = errorMessage;
            });
          }
        },

        // Remote operations
        addRemote: async (name: string, url: string) => {
          try {
            await gitService.addRemote(name, url);

            const remotes = await gitService.listRemotes();

            set((state) => {
              state.remotes = remotes.map((remote) => ({
                name: remote.remote,
                url: remote.url,
              }));
            });

            info(`Remote '${name}' added successfully`);
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to add remote';
            error('Failed to add remote:', errorMessage);
            set((state) => {
              state.error = errorMessage;
            });
          }
        },

        removeRemote: async (name: string) => {
          try {
            await gitService.deleteRemote(name);

            const remotes = await gitService.listRemotes();

            set((state) => {
              state.remotes = remotes.map((remote) => ({
                name: remote.remote,
                url: remote.url,
              }));
            });

            info(`Remote '${name}' removed successfully`);
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to remove remote';
            error('Failed to remove remote:', errorMessage);
            set((state) => {
              state.error = errorMessage;
            });
          }
        },

        push: async (remote = 'origin', branch?: string) => {
          try {
            const { currentBranch } = get();
            const targetBranch = branch || currentBranch;

            set((state) => {
              state.isLoading = true;
              state.error = null;
            });

            await gitService.push(remote, targetBranch);

            set((state) => {
              state.isLoading = false;
            });

            info(`Pushed to ${remote}/${targetBranch}`);
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to push';
            error('Failed to push:', errorMessage);
            set((state) => {
              state.error = errorMessage;
              state.isLoading = false;
            });
          }
        },

        pull: async (remote = 'origin', branch?: string) => {
          try {
            const { currentBranch } = get();
            const targetBranch = branch || currentBranch;

            set((state) => {
              state.isLoading = true;
              state.error = null;
            });

            await gitService.pull(remote, targetBranch);

            await get().getCommits();
            await get().getStatus();

            set((state) => {
              state.isLoading = false;
            });

            info(`Pulled from ${remote}/${targetBranch}`);
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to pull';
            error('Failed to pull:', errorMessage);
            set((state) => {
              state.error = errorMessage;
              state.isLoading = false;
            });
          }
        },

        fetch: async (remote = 'origin') => {
          try {
            set((state) => {
              state.isLoading = true;
              state.error = null;
            });

            await gitService.fetch(remote);

            set((state) => {
              state.isLoading = false;
            });

            info(`Fetched from ${remote}`);
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch';
            error('Failed to fetch:', errorMessage);
            set((state) => {
              state.error = errorMessage;
              state.isLoading = false;
            });
          }
        },

        // Status operations
        getStatus: async () => {
          try {
            const statusMatrix = await gitService.status();

            const status: GitStatus[] = statusMatrix.map((item) => ({
              file: item.file,
              head: item.head,
              workdir: item.workdir,
              stage: item.stage,
            }));

            set((state) => {
              state.status = status;
            });
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to get status';
            error('Failed to get status:', errorMessage);
            set((state) => {
              state.error = errorMessage;
            });
          }
        },

        // Configuration
        setConfig: (config: Partial<GitConfig>) => {
          set((state) => {
            state.config = { ...state.config, ...config };
          });
        },

        // GitHub integration
        connectGithub: async (token: string) => {
          try {
            const octokit = new Octokit({ auth: token });
            const { data: user } = await octokit.rest.users.getAuthenticated();

            set((state) => {
              state.config.github.token = token;
              state.config.github.username = user.login;
              state.isGithubConnected = true;
              state.error = null;
            });

            info(`Connected to GitHub as ${user.login}`);
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to connect to GitHub';
            error('Failed to connect to GitHub:', errorMessage);
            set((state) => {
              state.error = errorMessage;
              state.isGithubConnected = false;
            });
          }
        },

        disconnectGithub: () => {
          set((state) => {
            state.config.github.token = undefined;
            state.config.github.username = undefined;
            state.isGithubConnected = false;
            state.githubRepos = [];
          });
          info('Disconnected from GitHub');
        },

        getGithubRepos: async () => {
          try {
            const { config } = get();
            if (!config.github.token) {
              throw new Error('GitHub token not configured');
            }

            const octokit = new Octokit({ auth: config.github.token });
            const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({
              sort: 'updated',
              per_page: 50,
            });

            set((state) => {
              state.githubRepos = repos;
            });
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to get GitHub repositories';
            error('Failed to get GitHub repositories:', errorMessage);
            set((state) => {
              state.error = errorMessage;
            });
          }
        },

        createGithubRepo: async (name: string, description?: string, isPrivate = false) => {
          try {
            const { config } = get();
            if (!config.github.token) {
              throw new Error('GitHub token not configured');
            }

            const octokit = new Octokit({ auth: config.github.token });
            const { data: repo } = await octokit.rest.repos.createForAuthenticatedUser({
              name,
              description,
              private: isPrivate,
            });

            await get().getGithubRepos();
            info(`GitHub repository '${name}' created successfully`);

            return repo;
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to create GitHub repository';
            error('Failed to create GitHub repository:', errorMessage);
            set((state) => {
              state.error = errorMessage;
            });
            throw err;
          }
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
      })),
      {
        name: 'git-store',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          config: state.config,
          isGithubConnected: state.isGithubConnected,
        }),
      }
    ),
    {
      name: 'git-store',
    }
  )
);
