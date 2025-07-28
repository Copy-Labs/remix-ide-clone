import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

describe('GitService', () => {
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

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('init', () => {
    it('should initialize a Git repository with the default branch', async () => {
      // Setup
      mockFileStore.createFolder.mockResolvedValue(undefined);

      // Execute
      await gitService.init('main');

      // Verify
      expect(mockFileStore.createFolder).toHaveBeenCalledWith('/.git');
    });

    it('should handle errors during initialization', async () => {
      // Setup
      const error = new Error('Failed to create folder');
      mockFileStore.createFolder.mockRejectedValue(error);

      // Execute & Verify
      await expect(gitService.init('main')).rejects.toThrow(error);
    });
  });

  describe('createInitialCommit', () => {
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

    it('should handle errors during initial commit', async () => {
      // Setup
      const error = new Error('Failed to create file');
      mockFileStore.createFile.mockRejectedValue(error);

      // Execute & Verify
      await expect(
        gitService.createInitialCommit({ name: 'Test User', email: 'test@example.com' }),
      ).rejects.toThrow(error);
    });
  });

  describe('add', () => {
    it('should add a file to the staging area', async () => {
      // Setup
      const filepath = 'test.txt';
      const content = 'Test content';
      mockFileStore.getFile.mockResolvedValue({ type: 'file', content });
      mockFileStore.getFileContent.mockResolvedValue(content);
      databaseService.saveFile.mockResolvedValue(undefined);

      // Execute
      await gitService.add(filepath);

      // Verify
      expect(databaseService.saveFile).toHaveBeenCalledWith(
        expect.objectContaining({
          content,
          type: 'staged',
        }),
      );
    });

    it('should handle errors when adding a file', async () => {
      // Setup
      const filepath = 'test.txt';
      const error = new Error('File not found');
      mockFileStore.getFileContent.mockRejectedValue(error);

      // Execute & Verify
      await expect(gitService.add(filepath)).rejects.toThrow(error);
    });
  });

  describe('unstage', () => {
    it('should remove a file from the staging area', async () => {
      // Setup
      const filepath = 'test.txt';
      databaseService.deleteFile.mockResolvedValue(undefined);

      // Execute
      await gitService.unstage(filepath);

      // Verify
      expect(databaseService.deleteFile).toHaveBeenCalled();
    });

    it('should handle errors when unstaging a file', async () => {
      // Setup
      const filepath = 'test.txt';
      const error = new Error('Failed to delete file');
      databaseService.deleteFile.mockRejectedValue(error);

      // Execute & Verify
      await expect(gitService.unstage(filepath)).rejects.toThrow(error);
    });
  });

  describe('commit', () => {
    it('should create a commit with staged files', async () => {
      // Setup
      const message = 'Test commit';
      const author = { name: 'Test User', email: 'test@example.com' };
      const filepath = 'test.txt';
      const content = 'Test content';

      // Mock the getStagedFiles method
      vi.spyOn(gitService as any, 'getStagedFiles').mockResolvedValue([filepath]);
      vi.spyOn(gitService as any, 'isFileStaged').mockResolvedValue(true);

      databaseService.getFile.mockResolvedValue({ content });
      databaseService.deleteFile.mockResolvedValue(undefined);

      // Execute
      const oid = await gitService.commit(message, author);

      // Verify
      expect(oid).toBeDefined();
      expect(oid.length).toBe(40); // SHA-1 hash length
      expect(databaseService.getFile).toHaveBeenCalled();
      expect(databaseService.deleteFile).toHaveBeenCalled();
    });

    it('should throw an error if there are no staged files', async () => {
      // Setup
      const message = 'Test commit';
      const author = { name: 'Test User', email: 'test@example.com' };

      // Mock the getStagedFiles method to return an empty array
      vi.spyOn(gitService as any, 'getStagedFiles').mockResolvedValue([]);

      // Execute & Verify
      await expect(gitService.commit(message, author)).rejects.toThrow('No changes to commit');
    });
  });

  describe('status', () => {
    it('should return the status of the repository', async () => {
      // Setup
      const filepath = 'test.txt';
      mockFileStore.files = new Map([
        ['/test.txt', { type: 'file', name: 'test.txt', content: 'Test content' }],
      ]);

      // Mock the isFileStaged method
      vi.spyOn(gitService as any, 'isFileStaged').mockResolvedValue(true);

      // Execute
      const status = await gitService.status();

      // Verify
      expect(status).toBeDefined();
      expect(status.files).toBeDefined();
      expect(status.files.length).toBe(1);
      expect(status.files[0].file).toBe('test.txt');
      expect(status.files[0].stage).toBe(2); // Staged
    });
  });

  describe('branch operations', () => {
    it('should list branches', async () => {
      // Setup - GitService initializes with 'main' branch

      // Execute
      const branches = await gitService.listBranches();

      // Verify
      expect(branches).toEqual(['main']);
    });

    it('should create a new branch', async () => {
      // Execute
      await gitService.branch('feature');

      // Verify
      const branches = await gitService.listBranches();
      expect(branches).toContain('feature');
    });

    it('should throw an error when creating a branch that already exists', async () => {
      // Setup
      await gitService.branch('feature');

      // Execute & Verify
      await expect(gitService.branch('feature')).rejects.toThrow('Branch feature already exists');
    });

    it('should checkout a branch', async () => {
      // Setup
      await gitService.branch('feature');

      // Execute
      await gitService.checkout('feature');

      // Verify
      const currentBranch = await gitService.currentBranch();
      expect(currentBranch).toBe('feature');
    });

    it('should throw an error when checking out a non-existent branch', async () => {
      // Execute & Verify
      await expect(gitService.checkout('non-existent')).rejects.toThrow(
        'Branch non-existent does not exist',
      );
    });

    it('should delete a branch', async () => {
      // Setup
      await gitService.branch('feature');

      // Execute
      await gitService.deleteBranch('feature');

      // Verify
      const branches = await gitService.listBranches();
      expect(branches).not.toContain('feature');
    });

    it('should throw an error when deleting the current branch', async () => {
      // Execute & Verify
      await expect(gitService.deleteBranch('main')).rejects.toThrow(
        'Cannot delete the current branch: main',
      );
    });
  });

  describe('log', () => {
    it('should return commit history', async () => {
      // Setup - Create some commits
      vi.spyOn(gitService as any, 'getStagedFiles').mockResolvedValue(['test.txt']);
      vi.spyOn(gitService as any, 'isFileStaged').mockResolvedValue(true);
      databaseService.getFile.mockResolvedValue({ content: 'Test content' });
      databaseService.deleteFile.mockResolvedValue(undefined);

      await gitService.commit('First commit', { name: 'Test User', email: 'test@example.com' });
      await gitService.commit('Second commit', { name: 'Test User', email: 'test@example.com' });

      // Execute
      const log = await gitService.log();

      // Verify
      expect(log).toBeDefined();
      expect(log.commits).toBeDefined();
      expect(log.commits.length).toBe(2);
      expect(log.commits[0].commit.message).toBe('Second commit');
      expect(log.commits[1].commit.message).toBe('First commit');
    });
  });

  describe('file operations', () => {
    it('should get blame information for a file', async () => {
      // Setup
      const filepath = 'test.txt';
      const content = 'Line 1\nLine 2\nLine 3';
      mockFileStore.getFileContent.mockResolvedValue(content);

      // Create a commit with this file
      vi.spyOn(gitService as any, 'getStagedFiles').mockResolvedValue([filepath]);
      vi.spyOn(gitService as any, 'isFileStaged').mockResolvedValue(true);
      databaseService.getFile.mockResolvedValue({ content });
      databaseService.deleteFile.mockResolvedValue(undefined);

      const commitOid = await gitService.commit('Test commit', {
        name: 'Test User',
        email: 'test@example.com',
      });

      // Execute
      const blame = await gitService.getFileBlame(filepath);

      // Verify
      expect(blame).toBeDefined();
      expect(blame.length).toBe(3); // 3 lines
      expect(blame[0].commit.oid).toBe(commitOid);
      expect(blame[0].content).toBe('Line 1');
      expect(blame[1].content).toBe('Line 2');
      expect(blame[2].content).toBe('Line 3');
    });

    it('should get file history', async () => {
      // Setup
      const filepath = 'test.txt';
      const content1 = 'Initial content';
      const content2 = 'Updated content';

      // Mock the file content for different commits
      mockFileStore.getFileContent.mockImplementation((path) => {
        if (path === filepath) {
          return Promise.resolve(content2);
        }
        return Promise.resolve('');
      });

      // Create commits with this file
      vi.spyOn(gitService as any, 'getStagedFiles').mockResolvedValue([filepath]);
      vi.spyOn(gitService as any, 'isFileStaged').mockResolvedValue(true);

      // First commit
      databaseService.getFile.mockResolvedValueOnce({ content: content1 });
      databaseService.deleteFile.mockResolvedValue(undefined);
      await gitService.commit('Initial commit', { name: 'Test User', email: 'test@example.com' });

      // Second commit
      databaseService.getFile.mockResolvedValueOnce({ content: content2 });
      await gitService.commit('Update file', { name: 'Test User', email: 'test@example.com' });

      // Execute
      const history = await gitService.getFileHistory(filepath);

      // Verify
      expect(history).toBeDefined();
      expect(history.length).toBe(2);
      expect(history[0].message).toBe('Initial commit');
      expect(history[1].message).toBe('Update file');
    });

    it('should get file diff', async () => {
      // Setup
      const filepath = 'test.txt';
      const oldContent = 'Line 1\nLine 2\nLine 3';
      const newContent = 'Line 1\nLine 2 modified\nLine 3\nLine 4';

      mockFileStore.getFileContent.mockResolvedValue(newContent);

      // Create a commit with the old content
      vi.spyOn(gitService as any, 'getStagedFiles').mockResolvedValue([filepath]);
      vi.spyOn(gitService as any, 'isFileStaged').mockResolvedValue(true);
      databaseService.getFile.mockResolvedValueOnce({ content: oldContent });
      databaseService.deleteFile.mockResolvedValue(undefined);

      const oldOid = await gitService.commit('Old version', {
        name: 'Test User',
        email: 'test@example.com',
      });

      // Execute
      const diff = await gitService.getFileDiff(filepath, oldOid);

      // Verify
      expect(diff).toBeDefined();
      expect(diff.oldContent).toBe(oldContent);
      expect(diff.newContent).toBe(newContent);
      expect(diff.diff).toBeDefined();
      expect(diff.diff.length).toBeGreaterThan(0);
    });
  });

  describe('hunk operations', () => {
    it('should add a hunk to staging', async () => {
      // Setup
      const filepath = 'test.txt';
      const content = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
      const hunk = {
        startLine: 2,
        endLine: 4,
        content: 'Line 2 modified\nLine 3 modified\nLine 4 modified',
      };

      mockFileStore.getFileContent.mockResolvedValue(content);
      databaseService.getFile.mockResolvedValue({ content });
      databaseService.saveFile.mockResolvedValue(undefined);

      // Execute
      await gitService.addHunk(filepath, hunk);

      // Verify
      expect(databaseService.saveFile).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Line 2 modified'),
          type: 'staged',
        }),
      );
    });

    it('should unstage a hunk', async () => {
      // Setup
      const filepath = 'test.txt';
      const originalContent = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
      const stagedContent = 'Line 1\nLine 2 modified\nLine 3 modified\nLine 4 modified\nLine 5';
      const hunk = {
        startLine: 2,
        endLine: 4,
        content: 'Line 2 modified\nLine 3 modified\nLine 4 modified',
      };

      mockFileStore.getFileContent.mockResolvedValue(originalContent);
      vi.spyOn(gitService as any, 'isFileStaged').mockResolvedValue(true);
      databaseService.getFile.mockResolvedValue({ content: stagedContent });
      databaseService.saveFile.mockResolvedValue(undefined);

      // Execute
      await gitService.unstageHunk(filepath, hunk);

      // Verify
      expect(databaseService.saveFile).toHaveBeenCalled();
    });
  });

  describe('remote operations', () => {
    it('should simulate pushing to a remote repository', async () => {
      // Execute
      const result = await gitService.push('origin', 'main');

      // Verify
      expect(result).toBe(true);
    });

    it('should simulate pulling from a remote repository', async () => {
      // Execute
      const result = await gitService.pull('origin', 'main');

      // Verify
      expect(result).toBe(true);
    });
  });
});
