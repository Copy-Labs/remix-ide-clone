import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GitService } from '../gitService';
import { databaseService } from '../databaseService';

// Mock dependencies
vi.mock('../databaseService', () => ({
  databaseService: {
    saveFile: vi.fn(),
    getFile: vi.fn(),
    deleteFile: vi.fn(),
    set: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock GitEventEmitter and GitEventType
vi.mock('../gitEventEmitter', () => {
  const GitEventType = {
    PUSH_COMPLETED: 'push:completed',
    PUSH_ERROR: 'push:error',
    PULL_COMPLETED: 'pull:completed',
    PULL_ERROR: 'pull:error',
  };

  return {
    GitEventType,
    gitEventEmitter: {
      emit: vi.fn(),
      on: vi.fn().mockReturnValue(() => {}),
      off: vi.fn(),
    },
  };
});

// Mock the file store
const mockFileStore = {
  getFileContent: vi.fn(),
  getFile: vi.fn(),
  createFile: vi.fn(),
  updateFileContent: vi.fn(),
  createFolder: vi.fn(),
  deleteFile: vi.fn(),
  getParentPath: vi.fn(),
  files: new Map(),
};

// Mock the useFileStore
vi.mock('@/stores/fileStore', () => ({
  useFileStore: {
    getState: () => mockFileStore,
  },
}));

describe('GitService - Minimal Test', () => {
  let gitService: GitService;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Reset the mock file store
    mockFileStore.files = new Map();
    mockFileStore.getFileContent.mockReset();
    mockFileStore.getFile.mockReset();
    mockFileStore.createFile.mockReset();
    mockFileStore.updateFileContent.mockReset();
    mockFileStore.createFolder.mockReset();
    mockFileStore.deleteFile.mockReset();
    mockFileStore.getParentPath.mockReset();

    // Create a new instance of GitService for each test
    gitService = new GitService('/');
  });

  it('should be defined', () => {
    expect(gitService).toBeDefined();
  });

  it('should have init method', () => {
    expect(typeof gitService.init).toBe('function');
  });

  it('should initialize a Git repository with the default branch', async () => {
    // Setup
    vi.mocked(databaseService.set).mockResolvedValue(undefined);

    // Mock the file system adapter methods for git initialization
    const readFileSpy = vi.spyOn(gitService['fs'], 'readFile');
    const writeFileSpy = vi.spyOn(gitService['fs'], 'writeFile').mockResolvedValue(undefined);
    const mkdirSpy = vi.spyOn(gitService['fs'], 'mkdir').mockResolvedValue(undefined);
    const statSpy = vi.spyOn(gitService['fs'], 'stat');
    const readdirSpy = vi.spyOn(gitService['fs'], 'readdir').mockResolvedValue([]);

    // Mock readFile to simulate that .git/HEAD doesn't exist initially (for initialization check)
    readFileSpy.mockImplementation((filepath) => {
      if (filepath === '/.git/HEAD') {
        return Promise.reject(new Error('ENOENT: no such file or directory, open \'/.git/HEAD\''));
      }
      // For other files, return empty content or reject as needed
      return Promise.resolve('');
    });

    // Mock stat to handle file existence checks
    statSpy.mockImplementation((filepath) => {
      // For isomorphic-git, we need to handle file existence checks properly
      // Return null for non-existent files instead of throwing errors
      if (filepath.includes('.git/')) {
        // During initialization, git files don't exist yet
        return Promise.resolve(null);
      }
      return Promise.resolve({
        isFile: () => true,
        isDirectory: () => false,
        isSymbolicLink: () => false,
        size: 0,
        mtime: new Date(),
      });
    });

    // Execute
    await gitService.init('main');

    // Verify that the service was initialized with the correct branch
    expect(gitService['_currentBranch']).toBe('main');
    expect(gitService['branches']).toContain('main');
    expect(databaseService.set).toHaveBeenCalledWith('git:branches', ['main']);
    expect(databaseService.set).toHaveBeenCalledWith('git:currentBranch', 'main');
  });

  it('should create an initial commit with a .gitkeep file', async () => {
    // Setup
    mockFileStore.createFile.mockResolvedValue(undefined);
    vi.mocked(databaseService.set).mockResolvedValue(undefined);
    vi.mocked(databaseService.get).mockResolvedValue(undefined);

    // Mock the file system adapter methods
    const statSpy = vi.spyOn(gitService['fs'], 'stat');
    const writeFileSpy = vi.spyOn(gitService['fs'], 'writeFile').mockResolvedValue(undefined);
    const readFileSpy = vi.spyOn(gitService['fs'], 'readFile');
    const mkdirSpy = vi.spyOn(gitService['fs'], 'mkdir').mockResolvedValue(undefined);
    const readdirSpy = vi.spyOn(gitService['fs'], 'readdir').mockResolvedValue([]);

    // Mock different file reads based on the filepath
    readFileSpy.mockImplementation((filepath) => {
      if (filepath === 'README.md') {
        return Promise.resolve('# Git Repository\n\nInitialized with Remix IDE Clone');
      } else if (filepath === '/.git/index') {
        // Return empty buffer for git index (empty index)
        return Promise.resolve(new Uint8Array(0));
      } else if (filepath.includes('.git/')) {
        // For other git files, return appropriate content or throw ENOENT
        if (filepath.includes('HEAD')) {
          return Promise.resolve('ref: refs/heads/main');
        } else if (filepath.includes('config')) {
          return Promise.resolve('[core]\n\trepositoryformatversion = 0\n\tfilemode = true\n\tbare = false');
        }
        return Promise.reject(new Error('ENOENT: no such file or directory'));
      }
      return Promise.reject(new Error('ENOENT: no such file or directory'));
    });

    // Mock stat to handle file existence checks
    statSpy.mockImplementation((filepath) => {
      if (filepath === 'README.md') {
        // First call: file doesn't exist, return null
        return Promise.resolve(null);
      } else if (filepath.includes('.git/')) {
        // Git files exist after initialization
        return Promise.resolve({
          isFile: () => true,
          isDirectory: () => false,
          isSymbolicLink: () => false,
          size: 100,
          mtime: new Date(),
        });
      }
      return Promise.resolve({
        isFile: () => true,
        isDirectory: () => false,
        isSymbolicLink: () => false,
        size: 50,
        mtime: new Date(),
      });
    });

    // Execute
    const oid = await gitService.createInitialCommit({
      name: 'Test User',
      email: 'test@example.com',
    });

    // Verify
    expect(oid).toBeDefined();
    expect(typeof oid).toBe('string');
    expect(oid.length).toBeGreaterThan(0);
    expect(writeFileSpy).toHaveBeenCalledWith('README.md', '# Git Repository\n\nInitialized with Remix IDE Clone');
    expect(databaseService.set).toHaveBeenCalled();
  }, 10000); // Increase timeout to 10 seconds
});
