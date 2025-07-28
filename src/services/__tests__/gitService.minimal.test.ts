import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GitService } from '../gitService';
import { databaseService } from '../databaseService';

// Mock dependencies
vi.mock('../databaseService', () => ({
  databaseService: {
    saveFile: vi.fn(),
    getFile: vi.fn(),
    deleteFile: vi.fn(),
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
    mockFileStore.createFolder.mockResolvedValue(undefined);

    // Execute
    await gitService.init('main');

    // Verify
    expect(mockFileStore.createFolder).toHaveBeenCalledWith('/.git');
  });

  it('should create an initial commit with a .gitkeep file', async () => {
    // Setup
    mockFileStore.createFile.mockResolvedValue(undefined);
    databaseService.saveFile.mockResolvedValue(undefined);
    databaseService.deleteFile.mockResolvedValue(undefined);

    // Mock getStagedFiles to return a non-empty array
    vi.spyOn(gitService as any, 'getStagedFiles').mockResolvedValue(['.gitkeep']);

    // Execute
    const oid = await gitService.createInitialCommit({
      name: 'Test User',
      email: 'test@example.com',
    });

    // Verify
    expect(oid).toBeDefined();
    expect(oid.length).toBe(40); // SHA-1 hash length
    expect(databaseService.saveFile).toHaveBeenCalled();
    expect(databaseService.deleteFile).toHaveBeenCalled();
  });
});
