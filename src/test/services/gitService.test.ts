import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GitFileSystemAdapter, GitService } from '@/services/gitService';
import { useFileStore } from '@/stores/fileStore';
import git from 'isomorphic-git';
import { databaseService } from '@/services/databaseService.ts';

// Mock the file store
vi.mock('@/stores/fileStore');
vi.mock('@/services/loggerService', () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

// Mock isomorphic-git
vi.mock('isomorphic-git', () => ({
  default: {
    init: vi.fn(),
    add: vi.fn(),
    commit: vi.fn(),
    statusMatrix: vi.fn(),
    listBranches: vi.fn(),
    currentBranch: vi.fn(),
    branch: vi.fn(),
    checkout: vi.fn(),
    deleteBranch: vi.fn(),
    log: vi.fn(),
    push: vi.fn(),
    pull: vi.fn(),
  },
}));

// Mock isomorphic-git http
vi.mock('isomorphic-git/http/web', () => ({
  default: fetch,
}));

describe('GitFileSystemAdapter', () => {
  let adapter: GitFileSystemAdapter;
  let mockFileStore: any;

  beforeEach(() => {
    adapter = new GitFileSystemAdapter();
    mockFileStore = {
      getFileContent: vi.fn(),
      getFile: vi.fn(),
      createFile: vi.fn(),
      updateFileContent: vi.fn(),
      createFolder: vi.fn(),
      deleteFile: vi.fn(),
      getParentPath: vi.fn(),
      files: new Map(),
    };

    vi.mocked(useFileStore.getState).mockReturnValue(mockFileStore);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('readFile', () => {
    it('should read file content successfully', async () => {
      const filepath = '/test.txt';
      const content = 'test content';
      mockFileStore.getFileContent.mockResolvedValue(content);

      const result = await adapter.promises.readFile(filepath, { encoding: 'utf8' });

      expect(result).toBe(content);
      expect(mockFileStore.getFileContent).toHaveBeenCalledWith(filepath);
    });

    it('should throw error when file does not exist', async () => {
      const filepath = '/nonexistent.txt';
      mockFileStore.getFileContent.mockResolvedValue(undefined);

      await expect(adapter.promises.readFile(filepath)).rejects.toThrow(
        `ENOENT: no such file or directory, open '${filepath}'`,
      );
    });

    it('should return Buffer when encoding is not specified', async () => {
      const filepath = '/test.txt';
      const content = 'test content';
      mockFileStore.getFileContent.mockResolvedValue(content);

      const result = await adapter.promises.readFile(filepath);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe(content);
    });
  });

  describe('writeFile', () => {
    it('should create new file when file does not exist', async () => {
      const filepath = '/new.txt';
      const content = 'new content';
      mockFileStore.getFile.mockResolvedValue(null);

      await adapter.promises.writeFile(filepath, content);

      expect(mockFileStore.createFile).toHaveBeenCalledWith(filepath, content);
    });

    it('should update existing file', async () => {
      const filepath = '/existing.txt';
      const content = 'updated content';
      const existingFile = { name: 'existing.txt', type: 'file' };
      mockFileStore.getFile.mockResolvedValue(existingFile);

      await adapter.promises.writeFile(filepath, content);

      expect(mockFileStore.updateFileContent).toHaveBeenCalledWith(filepath, content);
    });

    it('should handle Buffer input', async () => {
      const filepath = '/buffer.txt';
      const content = Buffer.from('buffer content');
      mockFileStore.getFile.mockResolvedValue(null);

      await adapter.promises.writeFile(filepath, content);

      expect(mockFileStore.createFile).toHaveBeenCalledWith(filepath, 'buffer content');
    });
  });

  describe('mkdir', () => {
    it('should create directory successfully', async () => {
      const dirpath = '/new-dir';

      await adapter.promises.mkdir(dirpath);

      expect(mockFileStore.createFolder).toHaveBeenCalledWith(dirpath);
    });
  });

  describe('readdir', () => {
    it('should list directory contents', async () => {
      const dirpath = '/test-dir';
      const files = new Map([
        ['/test-dir/file1.txt', { name: 'file1.txt', type: 'file' }],
        ['/test-dir/file2.txt', { name: 'file2.txt', type: 'file' }],
        ['/test-dir/subdir', { name: 'subdir', type: 'folder' }],
      ]);

      mockFileStore.files = files;
      mockFileStore.getParentPath.mockImplementation((path: string) => {
        if (
          path === '/test-dir/file1.txt' ||
          path === '/test-dir/file2.txt' ||
          path === '/test-dir/subdir'
        ) {
          return '/test-dir';
        }
        return '/';
      });

      const result = await adapter.promises.readdir(dirpath);

      expect(result).toEqual(['file1.txt', 'file2.txt', 'subdir']);
    });

    it('should return empty array for empty directory', async () => {
      const dirpath = '/empty-dir';
      mockFileStore.files = new Map();

      const result = await adapter.promises.readdir(dirpath);

      expect(result).toEqual([]);
    });
  });

  describe('stat', () => {
    it('should return file stats', async () => {
      const filepath = '/test.txt';
      const file = {
        type: 'file',
        content: 'test content',
        lastModified: Date.now(),
      };
      mockFileStore.getFile.mockResolvedValue(file);

      const result = await adapter.promises.stat(filepath);

      expect(result.isFile()).toBe(true);
      expect(result.isDirectory()).toBe(false);
      expect(result.size).toBe(file.content.length);
    });

    it('should return directory stats', async () => {
      const filepath = '/test-dir';
      const file = {
        type: 'folder',
        lastModified: Date.now(),
      };
      mockFileStore.getFile.mockResolvedValue(file);

      const result = await adapter.promises.stat(filepath);

      expect(result.isFile()).toBe(false);
      expect(result.isDirectory()).toBe(true);
    });

    it('should throw error for non-existent file', async () => {
      const filepath = '/nonexistent.txt';
      mockFileStore.getFile.mockResolvedValue(null);

      await expect(adapter.promises.stat(filepath)).rejects.toThrow(
        `ENOENT: no such file or directory, stat '${filepath}'`,
      );
    });
  });

  describe('unlink', () => {
    it('should delete file successfully', async () => {
      const filepath = '/test.txt';

      await adapter.promises.unlink(filepath);

      expect(mockFileStore.deleteFile).toHaveBeenCalledWith(filepath);
    });
  });

  describe('rmdir', () => {
    it('should delete directory successfully', async () => {
      const dirpath = '/test-dir';

      await adapter.promises.rmdir(dirpath);

      expect(mockFileStore.deleteFile).toHaveBeenCalledWith(dirpath);
    });
  });
});

describe('GitService', () => {
  let gitService: GitService;
  let mockGit: any;

  beforeEach(() => {
    gitService = new GitService('/test');
    mockGit = vi.mocked(git);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('init', () => {
    it('should initialize repository with default branch', async () => {
      await gitService.init();

      // The implementation creates a .git directory and sets the default branch
      expect(gitService['branches']).toContain('main');
      expect(gitService['currentBranchName']).toBe('main');
    });

    it('should initialize repository with custom branch', async () => {
      await gitService.init('develop');

      // The implementation creates a .git directory and sets the custom branch
      expect(gitService['branches']).toContain('develop');
      expect(gitService['currentBranchName']).toBe('develop');
    });

    it('should handle initialization errors', async () => {
      // Mock the fs.promises.mkdir to throw an error
      const originalMkdir = gitService['fs'].promises.mkdir;
      gitService['fs'].promises.mkdir = vi.fn().mockRejectedValue(new Error('Init failed'));

      await expect(gitService.init()).rejects.toThrow('Init failed');

      // Restore the original mkdir function
      gitService['fs'].promises.mkdir = originalMkdir;
    });
  });

  describe('add', () => {
    it('should add file to staging area', async () => {
      const filepath = 'test.txt';
      const content = 'test content';

      // Mock the fs.promises.stat and fs.promises.readFile methods
      const originalStat = gitService['fs'].promises.stat;
      const originalReadFile = gitService['fs'].promises.readFile;
      gitService['fs'].promises.stat = vi.fn().mockResolvedValue({});
      gitService['fs'].promises.readFile = vi.fn().mockResolvedValue(content);

      // Mock the databaseService.saveFile method
      const originalSaveFile = databaseService.saveFile;
      databaseService.saveFile = vi.fn().mockResolvedValue(undefined);

      await gitService.add(filepath);

      // Verify that the file was added to staging
      expect(databaseService.saveFile).toHaveBeenCalledWith({
        id: expect.stringContaining(filepath),
        content,
        lastModified: expect.any(Number),
        type: 'staged',
      });

      // Restore the original methods
      gitService['fs'].promises.stat = originalStat;
      gitService['fs'].promises.readFile = originalReadFile;
      databaseService.saveFile = originalSaveFile;
    });
  });

  describe('commit', () => {
    it('should create commit successfully', async () => {
      const message = 'Test commit';
      const author = { name: 'Test User', email: 'test@example.com' };

      // Mock the getStagedFiles method to return some staged files
      const originalGetStagedFiles = gitService['getStagedFiles'];
      gitService['getStagedFiles'] = vi.fn().mockResolvedValue(['test.txt']);

      // Mock the databaseService.getFile method
      const originalGetFile = databaseService.getFile;
      databaseService.getFile = vi.fn().mockResolvedValue({
        content: 'test content',
        lastModified: Date.now(),
      });

      // Mock the resetGitIndex method
      const originalResetGitIndex = gitService.resetGitIndex;
      gitService.resetGitIndex = vi.fn().mockResolvedValue(undefined);

      // Mock the generateOid method to return a predictable value
      const originalGenerateOid = gitService['generateOid'];
      const mockOid = 'abc123';
      gitService['generateOid'] = vi.fn().mockReturnValue(mockOid);

      const result = await gitService.commit(message, author);

      // Verify that a commit was created with the expected properties
      expect(result).toBe(mockOid);
      expect(gitService['commits'].length).toBeGreaterThan(0);
      const lastCommit = gitService['commits'][gitService['commits'].length - 1];
      expect(lastCommit.oid).toBe(mockOid);
      expect(lastCommit.message).toBe(message);
      expect(lastCommit.author.name).toBe(author.name);
      expect(lastCommit.author.email).toBe(author.email);

      // Verify that the staged files were reset
      expect(gitService.resetGitIndex).toHaveBeenCalled();

      // Restore the original methods
      gitService['getStagedFiles'] = originalGetStagedFiles;
      databaseService.getFile = originalGetFile;
      gitService.resetGitIndex = originalResetGitIndex;
      gitService['generateOid'] = originalGenerateOid;
    });
  });

  describe('status', () => {
    it('should return repository status', async () => {
      // Mock the fs.getFileStore method to return a store with some files
      const originalGetFileStore = gitService['fs'].getFileStore;
      gitService['fs'].getFileStore = vi.fn().mockReturnValue({
        files: new Map([
          ['/file1.txt', { type: 'file', content: 'file1 content' }],
          ['/file2.txt', { type: 'file', content: 'file2 content' }],
        ]),
      });

      // Mock the isFileStaged method to indicate that file1.txt is staged
      const originalIsFileStaged = gitService['isFileStaged'];
      gitService['isFileStaged'] = vi.fn().mockImplementation((filepath) => {
        return Promise.resolve(filepath === 'file1.txt');
      });

      const result = await gitService.status();

      // Verify that the status includes the expected files
      expect(result.files.length).toBe(2);
      expect(result.files).toContainEqual({
        file: 'file1.txt',
        head: 0, // Not in head
        workdir: 2, // Modified in workdir
        stage: 2, // Staged
      });
      expect(result.files).toContainEqual({
        file: 'file2.txt',
        head: 0, // Not in head
        workdir: 2, // Modified in workdir
        stage: 0, // Not staged
      });
      expect(result.hasMore).toBe(false);
      expect(result.total).toBe(2);

      // Restore the original methods
      gitService['fs'].getFileStore = originalGetFileStore;
      gitService['isFileStaged'] = originalIsFileStaged;
    });

    it('should filter files based on the filter option', async () => {
      // Mock the fs.getFileStore method to return a store with some files
      const originalGetFileStore = gitService['fs'].getFileStore;
      gitService['fs'].getFileStore = vi.fn().mockReturnValue({
        files: new Map([
          ['/file1.txt', { type: 'file', content: 'file1 content' }],
          ['/file2.txt', { type: 'file', content: 'file2 content' }],
          ['/file3.txt', { type: 'file', content: 'file3 content' }],
        ]),
      });

      // Mock the isFileStaged method to indicate that file1.txt is staged
      const originalIsFileStaged = gitService['isFileStaged'];
      gitService['isFileStaged'] = vi.fn().mockImplementation((filepath) => {
        return Promise.resolve(filepath === 'file1.txt');
      });

      // Mock the commits array to simulate file2.txt being in the latest commit
      const originalCommits = gitService['commits'];
      gitService['commits'] = [
        {
          oid: 'commit1',
          message: 'Initial commit',
          author: { name: 'Test', email: 'test@example.com', timestamp: Date.now() },
          files: new Map([['file2.txt', 'file2 content']]),
        },
      ];

      // Test filtering for staged files
      const stagedResult = await gitService.status({ filter: 'staged' });
      expect(stagedResult.files.length).toBe(1);
      expect(stagedResult.files[0].file).toBe('file1.txt');
      expect(stagedResult.files[0].stage).toBe(2);

      // Test filtering for modified files
      const modifiedResult = await gitService.status({ filter: 'modified' });
      expect(modifiedResult.files.length).toBe(1);
      expect(modifiedResult.files[0].file).toBe('file2.txt');
      expect(modifiedResult.files[0].head).toBe(1);
      expect(modifiedResult.files[0].workdir).toBe(2);
      expect(modifiedResult.files[0].stage).toBe(0);

      // Test filtering for untracked files
      const untrackedResult = await gitService.status({ filter: 'untracked' });
      expect(untrackedResult.files.length).toBe(1);
      expect(untrackedResult.files[0].file).toBe('file3.txt');
      expect(untrackedResult.files[0].head).toBe(0);
      expect(untrackedResult.files[0].workdir).toBe(2);
      expect(untrackedResult.files[0].stage).toBe(0);

      // Restore the original methods and properties
      gitService['fs'].getFileStore = originalGetFileStore;
      gitService['isFileStaged'] = originalIsFileStaged;
      gitService['commits'] = originalCommits;
    });

    it('should paginate results based on skip and limit options', async () => {
      // Mock the fs.getFileStore method to return a store with many files
      const originalGetFileStore = gitService['fs'].getFileStore;
      const files = new Map();
      for (let i = 1; i <= 10; i++) {
        files.set(`/file${i}.txt`, { type: 'file', content: `file${i} content` });
      }
      gitService['fs'].getFileStore = vi.fn().mockReturnValue({ files });

      // Mock the isFileStaged method to return false for all files
      const originalIsFileStaged = gitService['isFileStaged'];
      gitService['isFileStaged'] = vi.fn().mockResolvedValue(false);

      // Test pagination with skip and limit
      const result1 = await gitService.status({ skip: 0, limit: 3 });
      expect(result1.files.length).toBe(3);
      expect(result1.hasMore).toBe(true);
      expect(result1.total).toBe(10);
      expect(result1.files[0].file).toBe('file1.txt');
      expect(result1.files[1].file).toBe('file2.txt');
      expect(result1.files[2].file).toBe('file3.txt');

      const result2 = await gitService.status({ skip: 3, limit: 3 });
      expect(result2.files.length).toBe(3);
      expect(result2.hasMore).toBe(true);
      expect(result2.total).toBe(10);
      expect(result2.files[0].file).toBe('file4.txt');
      expect(result2.files[1].file).toBe('file5.txt');
      expect(result2.files[2].file).toBe('file6.txt');

      const result3 = await gitService.status({ skip: 6, limit: 3 });
      expect(result3.files.length).toBe(3);
      expect(result3.hasMore).toBe(true);
      expect(result3.total).toBe(10);
      expect(result3.files[0].file).toBe('file7.txt');
      expect(result3.files[1].file).toBe('file8.txt');
      expect(result3.files[2].file).toBe('file9.txt');

      const result4 = await gitService.status({ skip: 9, limit: 3 });
      expect(result4.files.length).toBe(1);
      expect(result4.hasMore).toBe(false);
      expect(result4.total).toBe(10);
      expect(result4.files[0].file).toBe('file10.txt');

      // Restore the original methods
      gitService['fs'].getFileStore = originalGetFileStore;
      gitService['isFileStaged'] = originalIsFileStaged;
    });
  });

  describe('listBranches', () => {
    it('should list all branches', async () => {
      // Set some branches in the GitService instance
      gitService['branches'] = ['main', 'develop', 'feature/test'];

      const result = await gitService.listBranches();

      // Verify that the result includes all branches
      expect(result).toEqual(['main', 'develop', 'feature/test']);
    });
  });

  describe('currentBranch', () => {
    it('should return current branch', async () => {
      // Set the current branch in the GitService instance
      gitService['currentBranchName'] = 'main';

      const result = await gitService.currentBranch();

      // Verify that the result is the current branch
      expect(result).toBe('main');
    });
  });

  describe('branch', () => {
    it('should create new branch', async () => {
      const name = 'feature/new';

      // Set initial branches in the GitService instance
      gitService['branches'] = ['main'];

      await gitService.branch(name);

      // Verify that the branch was added to the branches array
      expect(gitService['branches']).toContain(name);
    });

    it('should throw error if branch already exists', async () => {
      const name = 'main';

      // Set initial branches in the GitService instance
      gitService['branches'] = ['main'];

      // Verify that creating an existing branch throws an error
      await expect(gitService.branch(name)).rejects.toThrow(`Branch ${name} already exists`);
    });
  });

  describe('checkout', () => {
    it('should switch to branch', async () => {
      const ref = 'develop';

      // Set initial branches and current branch in the GitService instance
      gitService['branches'] = ['main', 'develop'];
      gitService['currentBranchName'] = 'main';

      await gitService.checkout(ref);

      // Verify that the current branch was updated
      expect(gitService['currentBranchName']).toBe(ref);
    });

    it('should throw error if branch does not exist', async () => {
      const ref = 'nonexistent';

      // Set initial branches in the GitService instance
      gitService['branches'] = ['main'];

      // Verify that checking out a non-existent branch throws an error
      await expect(gitService.checkout(ref)).rejects.toThrow(`Branch ${ref} does not exist`);
    });
  });

  describe('deleteBranch', () => {
    it('should delete branch', async () => {
      const name = 'feature/old';

      // Set initial branches and current branch in the GitService instance
      gitService['branches'] = ['main', 'feature/old'];
      gitService['currentBranchName'] = 'main';

      await gitService.deleteBranch(name);

      // Verify that the branch was removed from the branches array
      expect(gitService['branches']).not.toContain(name);
    });

    it('should throw error if trying to delete current branch', async () => {
      const name = 'main';

      // Set initial branches and current branch in the GitService instance
      gitService['branches'] = ['main'];
      gitService['currentBranchName'] = 'main';

      // Verify that deleting the current branch throws an error
      await expect(gitService.deleteBranch(name)).rejects.toThrow(
        `Cannot delete the current branch: ${name}`,
      );
    });

    it('should throw error if branch does not exist', async () => {
      const name = 'nonexistent';

      // Set initial branches in the GitService instance
      gitService['branches'] = ['main'];
      gitService['currentBranchName'] = 'main';

      // Verify that deleting a non-existent branch throws an error
      await expect(gitService.deleteBranch(name)).rejects.toThrow(`Branch ${name} does not exist`);
    });
  });

  describe('log', () => {
    it('should return commit history', async () => {
      // Set some commits in the GitService instance
      const testCommits = [
        {
          oid: 'abc123',
          message: 'Test commit',
          author: {
            name: 'Test User',
            email: 'test@example.com',
            timestamp: 1234567890,
          },
          files: new Map(),
        },
        {
          oid: 'def456',
          message: 'Another commit',
          author: {
            name: 'Another User',
            email: 'another@example.com',
            timestamp: 1234567891,
          },
          files: new Map(),
        },
      ];
      gitService['commits'] = testCommits;

      const result = await gitService.log({ limit: 5 });

      // Verify that the result includes the expected commits
      expect(result.commits.length).toBe(2);
      expect(result.commits[0]).toMatchObject({
        oid: 'def456',
        commit: {
          message: 'Another commit',
          author: {
            name: 'Another User',
            email: 'another@example.com',
            timestamp: 1234567891,
          },
        },
      });
      expect(result.commits[1]).toMatchObject({
        oid: 'abc123',
        commit: {
          message: 'Test commit',
          author: {
            name: 'Test User',
            email: 'test@example.com',
            timestamp: 1234567890,
          },
        },
      });
      expect(result.hasMore).toBe(false);
    });
  });

  describe('push', () => {
    it('should push to remote', async () => {
      const remote = 'origin';
      const ref = 'main';

      const result = await gitService.push(remote, ref);

      expect(result).toBe(true);
    });
  });

  describe('pull', () => {
    it('should pull from remote', async () => {
      const remote = 'origin';
      const ref = 'main';

      const result = await gitService.pull(remote, ref);

      expect(result).toBe(true);
    });
  });
});
