import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useGitStore } from '@/stores/gitStore';
import { gitService } from '@/services/gitService';
import { Octokit } from '@octokit/rest';

// Mock dependencies
vi.mock('@/services/gitService');
vi.mock('@/services/loggerService', () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));
vi.mock('@octokit/rest');

describe('GitStore', () => {
  let store: ReturnType<typeof useGitStore>;
  let mockGitService: any;
  let mockOctokit: any;

  beforeEach(() => {
    // Reset store state
    useGitStore.setState({
      isInitialized: false,
      currentBranch: '',
      branches: [],
      remotes: [],
      commits: [],
      status: [],
      config: {
        user: { name: '', email: '' },
        github: { token: undefined, username: undefined },
      },
      isLoading: false,
      error: null,
      githubRepos: [],
      isGithubConnected: false,
    });

    store = useGitStore.getState();
    mockGitService = vi.mocked(gitService);
    mockOctokit = {
      rest: {
        users: {
          getAuthenticated: vi.fn(),
        },
        repos: {
          listForAuthenticatedUser: vi.fn(),
          createForAuthenticatedUser: vi.fn(),
        },
      },
    };
    vi.mocked(Octokit).mockImplementation(() => mockOctokit);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Repository Operations', () => {
    describe('initRepository', () => {
      it('should initialize repository successfully', async () => {
        mockGitService.init.mockResolvedValue(undefined);

        await store.initRepository();

        const currentState = useGitStore.getState();
        expect(mockGitService.init).toHaveBeenCalledWith('main');
        expect(currentState.isInitialized).toBe(true);
        expect(currentState.currentBranch).toBe('main');
        expect(currentState.isLoading).toBe(false);
        expect(currentState.error).toBe(null);
      });

      it('should handle initialization errors', async () => {
        const error = new Error('Init failed');
        mockGitService.init.mockRejectedValue(error);

        await store.initRepository();

        expect(store.isInitialized).toBe(false);
        expect(store.error).toBe('Init failed');
        expect(store.isLoading).toBe(false);
      });

      it('should set loading state during initialization', async () => {
        let resolveInit: () => void;
        const initPromise = new Promise<void>((resolve) => {
          resolveInit = resolve;
        });
        mockGitService.init.mockReturnValue(initPromise);

        const initPromiseResult = store.initRepository();

        // Check loading state is set
        expect(store.isLoading).toBe(true);
        expect(store.error).toBe(null);

        resolveInit!();
        await initPromiseResult;

        expect(store.isLoading).toBe(false);
      });
    });

    describe('cloneRepository', () => {
      it('should clone repository successfully', async () => {
        const url = 'https://github.com/user/repo.git';
        mockGitService.clone.mockResolvedValue(undefined);
        mockGitService.listBranches.mockResolvedValue(['main']);
        mockGitService.currentBranch.mockResolvedValue('main');
        mockGitService.status.mockResolvedValue([]);

        await store.cloneRepository(url);

        expect(mockGitService.clone).toHaveBeenCalledWith(url, '/');
        expect(store.isInitialized).toBe(true);
        expect(store.isLoading).toBe(false);
        expect(store.error).toBe(null);
      });

      it('should clone to custom directory', async () => {
        const url = 'https://github.com/user/repo.git';
        const dir = '/custom';
        mockGitService.clone.mockResolvedValue(undefined);
        mockGitService.listBranches.mockResolvedValue(['main']);
        mockGitService.currentBranch.mockResolvedValue('main');
        mockGitService.status.mockResolvedValue([]);

        await store.cloneRepository(url, dir);

        expect(mockGitService.clone).toHaveBeenCalledWith(url, dir);
      });

      it('should handle clone errors', async () => {
        const url = 'https://github.com/user/repo.git';
        const error = new Error('Clone failed');
        mockGitService.clone.mockRejectedValue(error);

        await store.cloneRepository(url);

        expect(store.isInitialized).toBe(false);
        expect(store.error).toBe('Clone failed');
        expect(store.isLoading).toBe(false);
      });
    });
  });

  describe('Branch Operations', () => {
    beforeEach(() => {
      store.isInitialized = true;
    });

    describe('createBranch', () => {
      it('should create branch successfully', async () => {
        const branchName = 'feature/test';
        mockGitService.branch.mockResolvedValue(undefined);
        mockGitService.listBranches.mockResolvedValue(['main', branchName]);
        mockGitService.currentBranch.mockResolvedValue('main');

        await store.createBranch(branchName);

        expect(mockGitService.branch).toHaveBeenCalledWith(branchName);
        expect(store.branches).toHaveLength(2);
        expect(store.branches.find((b) => b.name === branchName)).toBeDefined();
        expect(store.isLoading).toBe(false);
        expect(store.error).toBe(null);
      });

      it('should handle branch creation errors', async () => {
        const branchName = 'feature/test';
        const error = new Error('Branch creation failed');
        mockGitService.branch.mockRejectedValue(error);

        await store.createBranch(branchName);

        expect(store.error).toBe('Branch creation failed');
        expect(store.isLoading).toBe(false);
      });
    });

    describe('switchBranch', () => {
      it('should switch branch successfully', async () => {
        const branchName = 'develop';
        mockGitService.checkout.mockResolvedValue(undefined);
        mockGitService.listBranches.mockResolvedValue(['main', branchName]);
        mockGitService.currentBranch.mockResolvedValue(branchName);
        mockGitService.status.mockResolvedValue([]);

        await store.switchBranch(branchName);

        expect(mockGitService.checkout).toHaveBeenCalledWith(branchName);
        expect(store.currentBranch).toBe(branchName);
        expect(store.isLoading).toBe(false);
        expect(store.error).toBe(null);
      });

      it('should handle branch switch errors', async () => {
        const branchName = 'develop';
        const error = new Error('Branch switch failed');
        mockGitService.checkout.mockRejectedValue(error);

        await store.switchBranch(branchName);

        expect(store.error).toBe('Branch switch failed');
        expect(store.isLoading).toBe(false);
      });
    });

    describe('deleteBranch', () => {
      it('should delete branch successfully', async () => {
        const branchName = 'feature/old';
        mockGitService.deleteBranch.mockResolvedValue(undefined);
        mockGitService.listBranches.mockResolvedValue(['main']);
        mockGitService.currentBranch.mockResolvedValue('main');

        await store.deleteBranch(branchName);

        expect(mockGitService.deleteBranch).toHaveBeenCalledWith(branchName);
        expect(store.isLoading).toBe(false);
        expect(store.error).toBe(null);
      });

      it('should handle branch deletion errors', async () => {
        const branchName = 'feature/old';
        const error = new Error('Branch deletion failed');
        mockGitService.deleteBranch.mockRejectedValue(error);

        await store.deleteBranch(branchName);

        expect(store.error).toBe('Branch deletion failed');
        expect(store.isLoading).toBe(false);
      });
    });

    describe('getBranches', () => {
      it('should get branches successfully', async () => {
        const branches = ['main', 'develop', 'feature/test'];
        const currentBranch = 'main';
        mockGitService.listBranches.mockResolvedValue(branches);
        mockGitService.currentBranch.mockResolvedValue(currentBranch);

        await store.getBranches();

        expect(store.branches).toHaveLength(3);
        expect(store.branches.find((b) => b.name === 'main')?.current).toBe(true);
        expect(store.branches.find((b) => b.name === 'develop')?.current).toBe(false);
        expect(store.currentBranch).toBe(currentBranch);
        expect(store.error).toBe(null);
      });

      it('should handle get branches errors', async () => {
        const error = new Error('Get branches failed');
        mockGitService.listBranches.mockRejectedValue(error);

        await store.getBranches();

        expect(store.error).toBe('Get branches failed');
      });
    });
  });

  describe('Commit Operations', () => {
    beforeEach(() => {
      store.isInitialized = true;
      store.config.user.name = 'Test User';
      store.config.user.email = 'test@example.com';
    });

    describe('addFile', () => {
      it('should add file to staging area', async () => {
        const filepath = 'test.txt';
        mockGitService.add.mockResolvedValue(undefined);
        mockGitService.status.mockResolvedValue([
          { file: filepath, head: 0, workdir: 2, stage: 2 },
        ]);

        await store.addFile(filepath);

        expect(mockGitService.add).toHaveBeenCalledWith(filepath);
        expect(store.status).toHaveLength(1);
        expect(store.error).toBe(null);
      });

      it('should handle add file errors', async () => {
        const filepath = 'test.txt';
        const error = new Error('Add file failed');
        mockGitService.add.mockRejectedValue(error);

        await store.addFile(filepath);

        expect(store.error).toBe('Add file failed');
      });
    });

    describe('addAllFiles', () => {
      it('should add all files to staging area', async () => {
        mockGitService.add.mockResolvedValue(undefined);
        mockGitService.status.mockResolvedValue([
          { file: 'file1.txt', head: 0, workdir: 2, stage: 2 },
          { file: 'file2.txt', head: 1, workdir: 2, stage: 2 },
        ]);

        await store.addAllFiles();

        expect(mockGitService.add).toHaveBeenCalledWith('.');
        expect(store.status).toHaveLength(2);
        expect(store.error).toBe(null);
      });
    });

    describe('commit', () => {
      it('should commit changes successfully', async () => {
        const message = 'Test commit';
        const oid = 'abc123';
        mockGitService.commit.mockResolvedValue(oid);
        mockGitService.log.mockResolvedValue([
          {
            oid,
            commit: {
              message,
              author: { name: 'Test User', email: 'test@example.com', timestamp: Date.now() },
              committer: { name: 'Test User', email: 'test@example.com', timestamp: Date.now() },
            },
          },
        ]);
        mockGitService.status.mockResolvedValue([]);

        await store.commit(message);

        expect(mockGitService.commit).toHaveBeenCalledWith(message, {
          name: 'Test User',
          email: 'test@example.com',
        });
        expect(store.commits).toHaveLength(1);
        expect(store.commits[0].message).toBe(message);
        expect(store.isLoading).toBe(false);
        expect(store.error).toBe(null);
      });

      it('should handle commit without user configuration', async () => {
        store.config.user.name = '';
        store.config.user.email = '';
        const message = 'Test commit';

        await store.commit(message);

        expect(store.error).toBe('Git user name and email must be configured');
        expect(store.isLoading).toBe(false);
      });

      it('should handle commit errors', async () => {
        const message = 'Test commit';
        const error = new Error('Commit failed');
        mockGitService.commit.mockRejectedValue(error);

        await store.commit(message);

        expect(store.error).toBe('Commit failed');
        expect(store.isLoading).toBe(false);
      });
    });

    describe('getCommits', () => {
      it('should get commit history successfully', async () => {
        const commits = [
          {
            oid: 'abc123',
            commit: {
              message: 'First commit',
              author: { name: 'Test User', email: 'test@example.com', timestamp: Date.now() },
              committer: { name: 'Test User', email: 'test@example.com', timestamp: Date.now() },
            },
          },
          {
            oid: 'def456',
            commit: {
              message: 'Second commit',
              author: { name: 'Test User', email: 'test@example.com', timestamp: Date.now() },
              committer: { name: 'Test User', email: 'test@example.com', timestamp: Date.now() },
            },
          },
        ];
        mockGitService.log.mockResolvedValue(commits);

        await store.getCommits(5);

        expect(mockGitService.log).toHaveBeenCalledWith(5);
        expect(store.commits).toHaveLength(2);
        expect(store.commits[0].message).toBe('First commit');
        expect(store.commits[1].message).toBe('Second commit');
        expect(store.error).toBe(null);
      });

      it('should handle get commits errors', async () => {
        const error = new Error('Get commits failed');
        mockGitService.log.mockRejectedValue(error);

        await store.getCommits();

        expect(store.error).toBe('Get commits failed');
      });
    });
  });

  describe('Remote Operations', () => {
    beforeEach(() => {
      store.isInitialized = true;
    });

    describe('addRemote', () => {
      it('should add remote successfully', async () => {
        const name = 'origin';
        const url = 'https://github.com/user/repo.git';
        mockGitService.addRemote.mockResolvedValue(undefined);
        mockGitService.listRemotes.mockResolvedValue([{ remote: name, url }]);

        await store.addRemote(name, url);

        expect(mockGitService.addRemote).toHaveBeenCalledWith(name, url);
        expect(store.remotes).toHaveLength(1);
        expect(store.remotes[0].name).toBe(name);
        expect(store.remotes[0].url).toBe(url);
        expect(store.error).toBe(null);
      });

      it('should handle add remote errors', async () => {
        const name = 'origin';
        const url = 'https://github.com/user/repo.git';
        const error = new Error('Add remote failed');
        mockGitService.addRemote.mockRejectedValue(error);

        await store.addRemote(name, url);

        expect(store.error).toBe('Add remote failed');
      });
    });

    describe('removeRemote', () => {
      it('should remove remote successfully', async () => {
        const name = 'origin';
        mockGitService.deleteRemote.mockResolvedValue(undefined);
        mockGitService.listRemotes.mockResolvedValue([]);

        await store.removeRemote(name);

        expect(mockGitService.deleteRemote).toHaveBeenCalledWith(name);
        expect(store.remotes).toHaveLength(0);
        expect(store.error).toBe(null);
      });

      it('should handle remove remote errors', async () => {
        const name = 'origin';
        const error = new Error('Remove remote failed');
        mockGitService.deleteRemote.mockRejectedValue(error);

        await store.removeRemote(name);

        expect(store.error).toBe('Remove remote failed');
      });
    });

    describe('push', () => {
      it('should push to remote successfully', async () => {
        store.currentBranch = 'main';
        const remote = 'origin';
        mockGitService.push.mockResolvedValue(undefined);

        await store.push(remote);

        expect(mockGitService.push).toHaveBeenCalledWith(remote, 'main');
        expect(store.isLoading).toBe(false);
        expect(store.error).toBe(null);
      });

      it('should push to custom branch', async () => {
        store.currentBranch = 'main';
        const remote = 'origin';
        const branch = 'develop';
        mockGitService.push.mockResolvedValue(undefined);

        await store.push(remote, branch);

        expect(mockGitService.push).toHaveBeenCalledWith(remote, branch);
      });

      it('should handle push errors', async () => {
        store.currentBranch = 'main';
        const remote = 'origin';
        const error = new Error('Push failed');
        mockGitService.push.mockRejectedValue(error);

        await store.push(remote);

        expect(store.error).toBe('Push failed');
        expect(store.isLoading).toBe(false);
      });
    });

    describe('pull', () => {
      it('should pull from remote successfully', async () => {
        store.currentBranch = 'main';
        const remote = 'origin';
        mockGitService.pull.mockResolvedValue(undefined);
        mockGitService.log.mockResolvedValue([]);
        mockGitService.status.mockResolvedValue([]);

        await store.pull(remote);

        expect(mockGitService.pull).toHaveBeenCalledWith(remote, 'main');
        expect(store.isLoading).toBe(false);
        expect(store.error).toBe(null);
      });

      it('should handle pull errors', async () => {
        store.currentBranch = 'main';
        const remote = 'origin';
        const error = new Error('Pull failed');
        mockGitService.pull.mockRejectedValue(error);

        await store.pull(remote);

        expect(store.error).toBe('Pull failed');
        expect(store.isLoading).toBe(false);
      });
    });

    describe('fetch', () => {
      it('should fetch from remote successfully', async () => {
        const remote = 'origin';
        mockGitService.fetch.mockResolvedValue(undefined);

        await store.fetch(remote);

        expect(mockGitService.fetch).toHaveBeenCalledWith(remote);
        expect(store.isLoading).toBe(false);
        expect(store.error).toBe(null);
      });

      it('should handle fetch errors', async () => {
        const remote = 'origin';
        const error = new Error('Fetch failed');
        mockGitService.fetch.mockRejectedValue(error);

        await store.fetch(remote);

        expect(store.error).toBe('Fetch failed');
        expect(store.isLoading).toBe(false);
      });
    });
  });

  describe('Status Operations', () => {
    beforeEach(() => {
      store.isInitialized = true;
    });

    describe('getStatus', () => {
      it('should get repository status successfully', async () => {
        const statusMatrix = [
          { file: 'file1.txt', head: 1, workdir: 2, stage: 0 },
          { file: 'file2.txt', head: 0, workdir: 2, stage: 0 },
        ];
        mockGitService.status.mockResolvedValue(statusMatrix);

        await store.getStatus();

        expect(store.status).toEqual(statusMatrix);
        expect(store.error).toBe(null);
      });

      it('should handle get status errors', async () => {
        const error = new Error('Get status failed');
        mockGitService.status.mockRejectedValue(error);

        await store.getStatus();

        expect(store.error).toBe('Get status failed');
      });
    });
  });

  describe('Configuration', () => {
    describe('setConfig', () => {
      it('should update user configuration', () => {
        const config = {
          user: {
            name: 'New User',
            email: 'new@example.com',
          },
        };

        store.setConfig(config);

        expect(store.config.user.name).toBe('New User');
        expect(store.config.user.email).toBe('new@example.com');
      });

      it('should partially update configuration', () => {
        store.config.user.name = 'Old User';
        store.config.user.email = 'old@example.com';

        const config = {
          user: {
            name: 'New User',
          },
        };

        store.setConfig(config as any);

        expect(store.config.user.name).toBe('New User');
        expect(store.config.user.email).toBe('old@example.com');
      });
    });
  });

  describe('GitHub Integration', () => {
    describe('connectGithub', () => {
      it('should connect to GitHub successfully', async () => {
        const token = 'ghp_test_token';
        const user = { login: 'testuser' };
        mockOctokit.rest.users.getAuthenticated.mockResolvedValue({ data: user });

        await store.connectGithub(token);

        expect(store.config.github.token).toBe(token);
        expect(store.config.github.username).toBe(user.login);
        expect(store.isGithubConnected).toBe(true);
        expect(store.error).toBe(null);
      });

      it('should handle GitHub connection errors', async () => {
        const token = 'invalid_token';
        const error = new Error('Bad credentials');
        mockOctokit.rest.users.getAuthenticated.mockRejectedValue(error);

        await store.connectGithub(token);

        expect(store.isGithubConnected).toBe(false);
        expect(store.error).toBe('Bad credentials');
      });
    });

    describe('disconnectGithub', () => {
      it('should disconnect from GitHub', () => {
        store.config.github.token = 'test_token';
        store.config.github.username = 'testuser';
        store.isGithubConnected = true;
        store.githubRepos = [{ id: 1, name: 'repo1' }];

        store.disconnectGithub();

        expect(store.config.github.token).toBeUndefined();
        expect(store.config.github.username).toBeUndefined();
        expect(store.isGithubConnected).toBe(false);
        expect(store.githubRepos).toEqual([]);
      });
    });

    describe('getGithubRepos', () => {
      it('should get GitHub repositories successfully with pagination', async () => {
        store.config.github.token = 'test_token';
        store.isGithubConnected = true;

        const repos = [
          { id: 1, name: 'repo1', description: 'First repo' },
          { id: 2, name: 'repo2', description: 'Second repo' },
        ];
        mockOctokit.rest.repos.listForAuthenticatedUser.mockResolvedValue({
          data: repos,
          headers: {
            link: '<https://api.github.com/user/repos?page=2>; rel="next"',
            'x-total-count': '10',
          },
        });

        await store.getGithubRepos();

        expect(mockOctokit.rest.repos.listForAuthenticatedUser).toHaveBeenCalledWith({
          page: 1,
          per_page: 30,
          sort: 'updated',
          direction: 'desc',
        });
        expect(store.githubRepos).toEqual(repos);
        expect(store.githubRepoPagination.page).toBe(1);
        expect(store.githubRepoPagination.hasNextPage).toBe(true);
        expect(store.githubRepoPagination.totalCount).toBe(10);
        expect(store.error).toBe(null);
      });

      it('should handle pagination parameters', async () => {
        store.config.github.token = 'test_token';
        store.isGithubConnected = true;

        const repos = [{ id: 3, name: 'repo3', description: 'Third repo' }];
        mockOctokit.rest.repos.listForAuthenticatedUser.mockResolvedValue({
          data: repos,
          headers: {
            link: '', // No next page
            'x-total-count': '3',
          },
        });

        await store.getGithubRepos({ page: 2, perPage: 2 });

        expect(mockOctokit.rest.repos.listForAuthenticatedUser).toHaveBeenCalledWith({
          page: 2,
          per_page: 2,
          sort: 'updated',
          direction: 'desc',
        });
        expect(store.githubRepos).toEqual(repos);
        expect(store.githubRepoPagination.page).toBe(2);
        expect(store.githubRepoPagination.perPage).toBe(2);
        expect(store.githubRepoPagination.hasNextPage).toBe(false);
        expect(store.githubRepoPagination.totalCount).toBe(3);
      });

      it('should reset pagination when resetPagination is true', async () => {
        store.config.github.token = 'test_token';
        store.isGithubConnected = true;
        store.githubRepoPagination.page = 3;

        const repos = [{ id: 1, name: 'repo1', description: 'First repo' }];
        mockOctokit.rest.repos.listForAuthenticatedUser.mockResolvedValue({
          data: repos,
          headers: {
            link: '',
            'x-total-count': '1',
          },
        });

        await store.getGithubRepos({ resetPagination: true });

        expect(mockOctokit.rest.repos.listForAuthenticatedUser).toHaveBeenCalledWith({
          page: 1, // Should be reset to 1
          per_page: 30,
          sort: 'updated',
          direction: 'desc',
        });
        expect(store.githubRepoPagination.page).toBe(1);
      });

      it('should handle get GitHub repos without token', async () => {
        store.config.github.token = undefined;

        await store.getGithubRepos();

        expect(store.error).toBe('Not connected to GitHub');
      });

      it('should handle get GitHub repos errors', async () => {
        store.config.github.token = 'test_token';
        const error = new Error('API rate limit exceeded');
        mockOctokit.rest.repos.listForAuthenticatedUser.mockRejectedValue(error);

        await store.getGithubRepos();

        expect(store.error).toBe('API rate limit exceeded');
      });
    });

    describe('loadMoreGithubRepos', () => {
      it('should load more GitHub repositories', async () => {
        store.config.github.token = 'test_token';
        store.isGithubConnected = true;
        store.githubRepos = [{ id: 1, name: 'repo1', description: 'First repo' }];
        store.githubRepoPagination = {
          page: 1,
          perPage: 1,
          hasNextPage: true,
          totalCount: 2,
        };

        const moreRepos = [{ id: 2, name: 'repo2', description: 'Second repo' }];
        mockOctokit.rest.repos.listForAuthenticatedUser.mockResolvedValue({
          data: moreRepos,
          headers: {
            link: '',
            'x-total-count': '2',
          },
        });

        await store.loadMoreGithubRepos();

        expect(mockOctokit.rest.repos.listForAuthenticatedUser).toHaveBeenCalledWith({
          page: 2,
          per_page: 1,
          sort: 'updated',
          direction: 'desc',
        });
        expect(store.githubRepos).toEqual([
          { id: 1, name: 'repo1', description: 'First repo' },
          { id: 2, name: 'repo2', description: 'Second repo' },
        ]);
        expect(store.githubRepoPagination.page).toBe(2);
      });

      it('should not load more if there is no next page', async () => {
        store.config.github.token = 'test_token';
        store.isGithubConnected = true;
        store.githubRepos = [{ id: 1, name: 'repo1', description: 'First repo' }];
        store.githubRepoPagination = {
          page: 1,
          perPage: 10,
          hasNextPage: false,
          totalCount: 1,
        };

        await store.loadMoreGithubRepos();

        expect(mockOctokit.rest.repos.listForAuthenticatedUser).not.toHaveBeenCalled();
        expect(store.githubRepos).toEqual([{ id: 1, name: 'repo1', description: 'First repo' }]);
      });
    });

    describe('createGithubRepo', () => {
      it('should create GitHub repository successfully', async () => {
        store.config.github.token = 'test_token';
        const name = 'new-repo';
        const description = 'New repository';
        const repo = { id: 3, name, description };
        mockOctokit.rest.repos.createForAuthenticatedUser.mockResolvedValue({ data: repo });
        mockOctokit.rest.repos.listForAuthenticatedUser.mockResolvedValue({ data: [repo] });

        const result = await store.createGithubRepo(name, description);

        expect(mockOctokit.rest.repos.createForAuthenticatedUser).toHaveBeenCalledWith({
          name,
          description,
          private: false,
        });
        expect(result).toEqual(repo);
        expect(store.githubRepos).toEqual([repo]);
      });

      it('should create private GitHub repository', async () => {
        store.config.github.token = 'test_token';
        const name = 'private-repo';
        const repo = { id: 4, name, private: true };
        mockOctokit.rest.repos.createForAuthenticatedUser.mockResolvedValue({ data: repo });
        mockOctokit.rest.repos.listForAuthenticatedUser.mockResolvedValue({ data: [repo] });

        await store.createGithubRepo(name, undefined, true);

        expect(mockOctokit.rest.repos.createForAuthenticatedUser).toHaveBeenCalledWith({
          name,
          description: undefined,
          private: true,
        });
      });

      it('should handle create GitHub repo without token', async () => {
        store.config.github.token = undefined;
        const name = 'new-repo';

        await expect(store.createGithubRepo(name)).rejects.toThrow('GitHub token not configured');
      });

      it('should handle create GitHub repo errors', async () => {
        store.config.github.token = 'test_token';
        const name = 'new-repo';
        const error = new Error('Repository name already exists');
        mockOctokit.rest.repos.createForAuthenticatedUser.mockRejectedValue(error);

        await expect(store.createGithubRepo(name)).rejects.toThrow(
          'Repository name already exists',
        );
        expect(store.error).toBe('Repository name already exists');
      });
    });
  });

  describe('Utility Functions', () => {
    describe('reset', () => {
      it('should reset store to initial state', () => {
        // Set some state
        store.isInitialized = true;
        store.currentBranch = 'main';
        store.branches = [{ name: 'main', oid: 'abc123', current: true }];
        store.error = 'Some error';

        store.reset();

        expect(store.isInitialized).toBe(false);
        expect(store.currentBranch).toBe('');
        expect(store.branches).toEqual([]);
        expect(store.error).toBe(null);
      });
    });

    describe('setError', () => {
      it('should set error message', () => {
        const error = 'Test error';

        store.setError(error);

        expect(store.error).toBe(error);
      });

      it('should clear error message', () => {
        store.error = 'Previous error';

        store.setError(null);

        expect(store.error).toBe(null);
      });
    });

    describe('setLoading', () => {
      it('should set loading state', () => {
        store.setLoading(true);

        expect(store.isLoading).toBe(true);
      });

      it('should clear loading state', () => {
        store.isLoading = true;

        store.setLoading(false);

        expect(store.isLoading).toBe(false);
      });
    });
  });
});
