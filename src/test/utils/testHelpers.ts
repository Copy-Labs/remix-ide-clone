import { vi } from 'vitest';
import { GitCommit, GitBranch, GitRemote, GitStatus } from '@/stores/gitStore';

/**
 * Test utilities for Git integration tests
 */

// Mock data factories
export const createMockCommit = (overrides: Partial<GitCommit> = {}): GitCommit => ({
  oid: 'abc123def456',
  message: 'Test commit',
  author: {
    name: 'Test User',
    email: 'test@example.com',
    timestamp: Date.now(),
  },
  committer: {
    name: 'Test User',
    email: 'test@example.com',
    timestamp: Date.now(),
  },
  ...overrides,
});

export const createMockBranch = (overrides: Partial<GitBranch> = {}): GitBranch => ({
  name: 'main',
  oid: 'abc123',
  current: true,
  ...overrides,
});

export const createMockRemote = (overrides: Partial<GitRemote> = {}): GitRemote => ({
  name: 'origin',
  url: 'https://github.com/user/repo.git',
  ...overrides,
});

export const createMockStatus = (overrides: Partial<GitStatus> = {}): GitStatus => ({
  file: 'test.txt',
  head: 1,
  workdir: 2,
  stage: 0,
  ...overrides,
});

export const createMockGithubRepo = (overrides: any = {}) => ({
  id: 1,
  name: 'test-repo',
  description: 'Test repository',
  language: 'JavaScript',
  private: false,
  clone_url: 'https://github.com/user/test-repo.git',
  ...overrides,
});

// Git service mock factory
export const createMockGitService = () => ({
  init: vi.fn(),
  clone: vi.fn(),
  add: vi.fn(),
  commit: vi.fn(),
  status: vi.fn(),
  listBranches: vi.fn(),
  currentBranch: vi.fn(),
  branch: vi.fn(),
  checkout: vi.fn(),
  deleteBranch: vi.fn(),
  log: vi.fn(),
  addRemote: vi.fn(),
  deleteRemote: vi.fn(),
  listRemotes: vi.fn(),
  push: vi.fn(),
  pull: vi.fn(),
  fetch: vi.fn(),
});

// File store mock factory
export const createMockFileStore = () => ({
  getFileContent: vi.fn(),
  getFile: vi.fn(),
  createFile: vi.fn(),
  updateFileContent: vi.fn(),
  createFolder: vi.fn(),
  deleteFile: vi.fn(),
  getParentPath: vi.fn(),
  files: new Map(),
});

// Octokit mock factory
export const createMockOctokit = () => ({
  rest: {
    users: {
      getAuthenticated: vi.fn(),
    },
    repos: {
      listForAuthenticatedUser: vi.fn(),
      createForAuthenticatedUser: vi.fn(),
    },
  },
});

// Git store state factory
export const createInitialGitState = (overrides: any = {}) => ({
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
  ...overrides,
});

// Test scenario builders
export const buildRepositoryScenario = () => ({
  initialized: () =>
    createInitialGitState({
      isInitialized: true,
      currentBranch: 'main',
      branches: [createMockBranch()],
    }),

  withBranches: (branches: string[]) =>
    createInitialGitState({
      isInitialized: true,
      currentBranch: branches[0] || 'main',
      branches: branches.map((name, index) =>
        createMockBranch({
          name,
          current: index === 0,
        }),
      ),
    }),

  withCommits: (commits: Partial<GitCommit>[]) =>
    createInitialGitState({
      isInitialized: true,
      currentBranch: 'main',
      commits: commits.map((commit) => createMockCommit(commit)),
    }),

  withRemotes: (remotes: Partial<GitRemote>[]) =>
    createInitialGitState({
      isInitialized: true,
      currentBranch: 'main',
      remotes: remotes.map((remote) => createMockRemote(remote)),
    }),

  withStatus: (files: Partial<GitStatus>[]) =>
    createInitialGitState({
      isInitialized: true,
      currentBranch: 'main',
      status: files.map((file) => createMockStatus(file)),
    }),

  withGithubConnection: (username: string = 'testuser') =>
    createInitialGitState({
      isInitialized: true,
      currentBranch: 'main',
      isGithubConnected: true,
      config: {
        user: { name: 'Test User', email: 'test@example.com' },
        github: { token: 'test_token', username },
      },
      githubRepos: [createMockGithubRepo()],
    }),
});

// Assertion helpers
export const expectGitServiceCalled = (mockGitService: any, method: string, ...args: any[]) => {
  expect(mockGitService[method]).toHaveBeenCalledWith(...args);
};

export const expectStoreState = (store: any, expectedState: Partial<any>) => {
  Object.keys(expectedState).forEach((key) => {
    expect(store[key]).toEqual(expectedState[key]);
  });
};

// Async test helpers
export const waitForStoreUpdate = async (
  store: any,
  condition: (state: any) => boolean,
  timeout = 1000,
) => {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (condition(store)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  throw new Error('Store condition not met within timeout');
};

// Mock setup helpers
export const setupGitServiceMocks = (
  mockGitService: any,
  scenario: 'success' | 'error' = 'success',
) => {
  if (scenario === 'success') {
    mockGitService.init.mockResolvedValue(undefined);
    mockGitService.clone.mockResolvedValue(undefined);
    mockGitService.add.mockResolvedValue(undefined);
    mockGitService.commit.mockResolvedValue('abc123');
    mockGitService.status.mockResolvedValue([]);
    mockGitService.listBranches.mockResolvedValue(['main']);
    mockGitService.currentBranch.mockResolvedValue('main');
    mockGitService.branch.mockResolvedValue(undefined);
    mockGitService.checkout.mockResolvedValue(undefined);
    mockGitService.deleteBranch.mockResolvedValue(undefined);
    mockGitService.log.mockResolvedValue([]);
    mockGitService.addRemote.mockResolvedValue(undefined);
    mockGitService.deleteRemote.mockResolvedValue(undefined);
    mockGitService.listRemotes.mockResolvedValue([]);
    mockGitService.push.mockResolvedValue(undefined);
    mockGitService.pull.mockResolvedValue(undefined);
    mockGitService.fetch.mockResolvedValue(undefined);
  } else {
    const error = new Error('Git operation failed');
    Object.keys(mockGitService).forEach((method) => {
      mockGitService[method].mockRejectedValue(error);
    });
  }
};

export const setupOctokitMocks = (mockOctokit: any, scenario: 'success' | 'error' = 'success') => {
  if (scenario === 'success') {
    mockOctokit.rest.users.getAuthenticated.mockResolvedValue({
      data: { login: 'testuser' },
    });
    mockOctokit.rest.repos.listForAuthenticatedUser.mockResolvedValue({
      data: [createMockGithubRepo()],
    });
    mockOctokit.rest.repos.createForAuthenticatedUser.mockResolvedValue({
      data: createMockGithubRepo({ name: 'new-repo' }),
    });
  } else {
    const error = new Error('GitHub API error');
    mockOctokit.rest.users.getAuthenticated.mockRejectedValue(error);
    mockOctokit.rest.repos.listForAuthenticatedUser.mockRejectedValue(error);
    mockOctokit.rest.repos.createForAuthenticatedUser.mockRejectedValue(error);
  }
};

// File system mock helpers
export const setupFileSystemMocks = (mockFileStore: any) => {
  mockFileStore.getFileContent.mockImplementation((path: string) => {
    const mockFiles: Record<string, string> = {
      'test.sol': 'pragma solidity ^0.8.0;\n\ncontract Test {}',
      'README.md': '# Test Project\n\nThis is a test project.',
    };
    return Promise.resolve(mockFiles[path.split('/').pop() || '']);
  });

  mockFileStore.getFile.mockImplementation((path: string) => {
    const fileName = path.split('/').pop() || '';
    if (['test.sol', 'README.md'].includes(fileName)) {
      return Promise.resolve({
        name: fileName,
        type: 'file',
        lastModified: Date.now(),
      });
    }
    return Promise.resolve(null);
  });

  mockFileStore.createFile.mockResolvedValue(undefined);
  mockFileStore.updateFileContent.mockResolvedValue(undefined);
  mockFileStore.createFolder.mockResolvedValue(undefined);
  mockFileStore.deleteFile.mockResolvedValue(undefined);

  mockFileStore.getParentPath.mockImplementation((path: string) => {
    const parts = path.split('/');
    parts.pop();
    return parts.join('/') || '/';
  });
};

// Test data generators
export const generateCommitHistory = (count: number): GitCommit[] => {
  return Array.from({ length: count }, (_, index) =>
    createMockCommit({
      oid: `commit${index}`,
      message: `Commit ${index + 1}`,
      author: {
        name: `Author ${index + 1}`,
        email: `author${index + 1}@example.com`,
        timestamp: Date.now() - (count - index) * 60000, // 1 minute apart
      },
      committer: {
        name: `Author ${index + 1}`,
        email: `author${index + 1}@example.com`,
        timestamp: Date.now() - (count - index) * 60000,
      },
    }),
  );
};

export const generateFileStatus = (
  files: string[],
  statusType: 'new' | 'modified' | 'staged' = 'new',
): GitStatus[] => {
  const statusMap = {
    new: { head: 0, workdir: 2, stage: 0 },
    modified: { head: 1, workdir: 2, stage: 0 },
    staged: { head: 0, workdir: 2, stage: 2 },
  };

  return files.map((file) =>
    createMockStatus({
      file,
      ...statusMap[statusType],
    }),
  );
};

// Performance test helpers
export const measureExecutionTime = async (fn: () => Promise<void>): Promise<number> => {
  const start = performance.now();
  await fn();
  const end = performance.now();
  return end - start;
};

export const expectExecutionTime = async (fn: () => Promise<void>, maxTime: number) => {
  const executionTime = await measureExecutionTime(fn);
  expect(executionTime).toBeLessThan(maxTime);
};

// Cleanup helpers
export const cleanupMocks = (...mocks: any[]) => {
  mocks.forEach((mock) => {
    if (mock && typeof mock.mockClear === 'function') {
      mock.mockClear();
    } else if (mock && typeof mock === 'object') {
      Object.values(mock).forEach((method) => {
        if (method && typeof method.mockClear === 'function') {
          method.mockClear();
        }
      });
    }
  });
};
