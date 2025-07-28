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

// Mock the database service
vi.mock('@/services/databaseService', () => ({
  databaseService: {
    set: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    saveFile: vi.fn(),
    getFile: vi.fn(),
  },
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
      files: new Map(),
      getFileContent: vi.fn(),
      getFile: vi.fn(),
      createFile: vi.fn(),
      updateFileContent: vi.fn(),
      createFolder: vi.fn(),
      deleteFile: vi.fn(),
      getParentPath: vi.fn(),
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
      const mockFile = {
        id: 'test-txt',
        name: 'test.txt',
        path: '/test.txt',
        type: 'file',
        lastModified: Date.now(),
      };

      mockFileStore.files.set(filepath, mockFile);
      mockFileStore.getFileContent.mockResolvedValue(content);

      const result = await adapter.readFile(filepath, { encoding: 'utf8' });

      expect(result).toBe(content);
      expect(mockFileStore.getFileContent).toHaveBeenCalledWith(filepath);
    });

    it('should throw error when file does not exist', async () => {
      const filepath = '/nonexistent.txt';
      // Don't add file to the Map, so it doesn't exist

      await expect(adapter.readFile(filepath)).rejects.toThrow(
        `ENOENT: no such file or directory, open '${filepath}'`,
      );
    });

    it('should return Uint8Array when encoding is not specified', async () => {
      const filepath = '/test.txt';
      const content = 'test content';
      const mockFile = {
        id: 'test-txt',
        name: 'test.txt',
        path: '/test.txt',
        type: 'file',
        lastModified: Date.now(),
      };

      mockFileStore.files.set(filepath, mockFile);
      mockFileStore.getFileContent.mockResolvedValue(content);

      const result = await adapter.readFile(filepath);

      expect(result).toEqual(new TextEncoder().encode(content));
      expect(new TextDecoder().decode(result as Uint8Array)).toBe(content);
    });
  });

  describe('writeFile', () => {
    it('should create new file when file does not exist', async () => {
      const filepath = '/new.txt';
      const content = 'new content';
      // Don't add file to the Map, so it doesn't exist

      await adapter.writeFile(filepath, content);

      expect(mockFileStore.createFile).toHaveBeenCalledWith(filepath, content);
    });

    it('should update existing file', async () => {
      const filepath = '/existing.txt';
      const content = 'updated content';
      const existingFile = {
        id: 'existing-txt',
        name: 'existing.txt',
        path: '/existing.txt',
        type: 'file',
        lastModified: Date.now(),
      };

      mockFileStore.files.set(filepath, existingFile);

      await adapter.writeFile(filepath, content);

      expect(mockFileStore.updateFileContent).toHaveBeenCalledWith(filepath, content);
    });

    it('should handle Buffer input', async () => {
      const filepath = '/buffer.txt';
      const content = Buffer.from('buffer content');
      // Don't add file to the Map, so it doesn't exist

      await adapter.writeFile(filepath, content);

      expect(mockFileStore.createFile).toHaveBeenCalledWith(filepath, 'buffer content');
    });
  });

  describe('mkdir', () => {
    it('should create directory successfully', async () => {
      const dirpath = '/new-dir';

      await adapter.mkdir(dirpath);

      expect(mockFileStore.createFolder).toHaveBeenCalledWith(dirpath);
    });
  });

  describe('readdir', () => {
    it('should list directory contents', async () => {
      const dirpath = '/test-dir';
      const files = new Map([
        ['/test-dir/file1.txt', { name: 'file1.txt', type: 'file', path: '/test-dir/file1.txt' }],
        ['/test-dir/file2.txt', { name: 'file2.txt', type: 'file', path: '/test-dir/file2.txt' }],
        ['/test-dir/subdir', { name: 'subdir', type: 'folder', path: '/test-dir/subdir' }],
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

      const result = await adapter.readdir(dirpath);

      expect(result).toEqual(['file1.txt', 'file2.txt', 'subdir']);
    });

    it('should return empty array for empty directory', async () => {
      const dirpath = '/empty-dir';
      mockFileStore.files = new Map();

      const result = await adapter.readdir(dirpath);

      expect(result).toEqual([]);
    });
  });

  describe('stat', () => {
    it('should return file stats', async () => {
      const filepath = '/test.txt';
      const content = 'test content';
      const file = {
        id: 'test-txt',
        name: 'test.txt',
        path: '/test.txt',
        type: 'file',
        lastModified: Date.now(),
      };

      mockFileStore.files.set(filepath, file);
      mockFileStore.getFileContent.mockResolvedValue(content);

      const result = await adapter.stat(filepath);

      expect(result.isFile()).toBe(true);
      expect(result.isDirectory()).toBe(false);
      expect(result.size).toBe(content.length);
    });

    it('should return directory stats', async () => {
      const filepath = '/test-dir';
      const file = {
        id: 'test-dir',
        name: 'test-dir',
        path: '/test-dir',
        type: 'folder',
        lastModified: Date.now(),
      };

      mockFileStore.files.set(filepath, file);
      mockFileStore.getFileContent.mockResolvedValue('');

      const result = await adapter.stat(filepath);

      expect(result.isFile()).toBe(false);
      expect(result.isDirectory()).toBe(true);
    });

    it('should throw error for non-existent file', async () => {
      const filepath = '/nonexistent.txt';
      // Don't add file to the Map, so it doesn't exist

      await expect(adapter.stat(filepath)).rejects.toThrow(
        `ENOENT: no such file or directory, stat '${filepath}'`,
      );
    });
  });

  describe('unlink', () => {
    it('should delete file successfully', async () => {
      const filepath = '/test.txt';

      await adapter.unlink(filepath);

      expect(mockFileStore.deleteFile).toHaveBeenCalledWith(filepath);
    });
  });

  describe('rmdir', () => {
    it('should delete directory successfully', async () => {
      const dirpath = '/test-dir';

      await adapter.rmdir(dirpath);

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
      // Mock isomorphic-git init
      mockGit.init.mockResolvedValue(undefined);

      await gitService.init('main');

      // The implementation creates a .git directory and sets the default branch
      expect(gitService['branches']).toContain('main');
      expect(gitService['_currentBranch']).toBe('main');
      expect(mockGit.init).toHaveBeenCalledWith({
        fs: gitService['fs'],
        dir: gitService['workingDirectory'],
        defaultBranch: 'main',
      });
    });

    it('should initialize repository with custom branch', async () => {
      // Mock isomorphic-git init
      mockGit.init.mockResolvedValue(undefined);

      await gitService.init('develop');

      // The implementation creates a .git directory and sets the custom branch
      expect(gitService['branches']).toContain('develop');
      expect(gitService['_currentBranch']).toBe('develop');
      expect(mockGit.init).toHaveBeenCalledWith({
        fs: gitService['fs'],
        dir: gitService['workingDirectory'],
        defaultBranch: 'develop',
      });
    });

    it('should handle initialization errors', async () => {
      // Mock isomorphic-git init to throw an error
      mockGit.init.mockRejectedValue(new Error('Init failed'));

      await expect(gitService.init('main')).rejects.toThrow();
    });
  });

  describe('add', () => {
    it('should add file to staging area', async () => {
      const filepath = 'test.txt';
      const content = 'test content';

      // Initialize the repository first
      gitService['_currentBranch'] = 'main';

      // Mock the fs methods
      vi.spyOn(gitService['fs'], 'stat').mockResolvedValue({
        isFile: () => true,
        isDirectory: () => false,
        size: content.length,
      });
      vi.spyOn(gitService['fs'], 'readFile').mockResolvedValue(content);
      vi.spyOn(gitService['fs'], 'writeFile').mockResolvedValue();

      // Mock isomorphic-git add
      mockGit.add.mockResolvedValue(undefined);

      // Mock databaseService methods
      vi.mocked(databaseService.get).mockResolvedValue({});
      vi.mocked(databaseService.set).mockResolvedValue(undefined);

      await gitService.add(filepath);

      // Verify that isomorphic-git add was called
      expect(mockGit.add).toHaveBeenCalledWith({
        fs: gitService['fs'],
        dir: gitService['workingDirectory'],
        filepath: filepath,
      });

      // Verify that the file was added to staging in database
      expect(databaseService.set).toHaveBeenCalledWith('git:staging', {
        [filepath]: content,
      });

      // Verify that the file was added to stagedFiles
      expect(gitService['stagedFiles'].get(filepath)).toBe(content);
    });
  });

  describe('commit', () => {
    it('should create commit successfully', async () => {
      const message = 'Test commit';
      const author = { name: 'Test User', email: 'test@example.com' };
      const mockCommitId = 'abc123def456';

      // Initialize the repository and add staged files
      gitService['_currentBranch'] = 'main';
      gitService['stagedFiles'].set('test.txt', 'test content');

      // Mock isomorphic-git commit
      mockGit.commit.mockResolvedValue(mockCommitId);

      // Mock getCurrentHead method
      vi.spyOn(gitService as any, 'getCurrentHead').mockResolvedValue('parent123');

      // Mock resetGitIndex method
      vi.spyOn(gitService, 'resetGitIndex').mockResolvedValue();

      // Mock databaseService methods
      vi.mocked(databaseService.set).mockResolvedValue(undefined);
      vi.mocked(databaseService.get).mockResolvedValue({});

      const result = await gitService.commit(message, author);

      // Verify that isomorphic-git commit was called
      expect(mockGit.commit).toHaveBeenCalledWith({
        fs: gitService['fs'],
        dir: gitService['workingDirectory'],
        message,
        author: {
          name: author.name,
          email: author.email,
        },
      });

      // Verify that the commit was stored in database
      expect(databaseService.set).toHaveBeenCalledWith(`git:commit:${mockCommitId}`, {
        oid: mockCommitId,
        message,
        author: {
          name: author.name,
          email: author.email,
          timestamp: expect.any(Number),
        },
        parent: 'parent123',
      });

      // Verify that resetGitIndex was called
      expect(gitService.resetGitIndex).toHaveBeenCalled();

      // Verify the result
      expect(result).toBe(mockCommitId);
    });
  });

  describe('status', () => {
    it('should return repository status', async () => {
      // Mock isomorphic-git statusMatrix
      mockGit.statusMatrix.mockResolvedValue([
        ['file1.txt', 0, 2, 2], // untracked, staged
        ['file2.txt', 1, 2, 0], // modified, not staged
      ]);

      const result = await gitService.status();

      // Verify that the status includes the expected files
      expect(result.files.length).toBe(2);
      expect(result.files).toContainEqual({
        file: 'file1.txt',
        status: 'staged',
      });
      expect(result.files).toContainEqual({
        file: 'file2.txt',
        status: 'modified',
      });
      expect(result.hasMore).toBe(false);
      expect(result.total).toBe(2);

      // Verify that isomorphic-git statusMatrix was called
      expect(mockGit.statusMatrix).toHaveBeenCalledWith({
        fs: gitService['fs'],
        dir: gitService['workingDirectory'],
        filepaths: undefined,
      });
    });

    it('should filter files based on the filter option', async () => {
      // Mock isomorphic-git statusMatrix with filter
      mockGit.statusMatrix.mockResolvedValue([
        ['specific-file.txt', 1, 2, 0], // modified, not staged
      ]);

      const result = await gitService.status({ filter: 'specific-file.txt' });

      // Verify that the status includes only the filtered file
      expect(result.files.length).toBe(1);
      expect(result.files[0].file).toBe('specific-file.txt');
      expect(result.files[0].status).toBe('modified');

      // Verify that isomorphic-git statusMatrix was called with filter
      expect(mockGit.statusMatrix).toHaveBeenCalledWith({
        fs: gitService['fs'],
        dir: gitService['workingDirectory'],
        filepaths: ['specific-file.txt'],
      });
    });

    it('should paginate results based on skip and limit options', async () => {
      // Mock isomorphic-git statusMatrix to return 10 files
      const statusMatrix = [];
      for (let i = 1; i <= 10; i++) {
        statusMatrix.push([`file${i}.txt`, 0, 2, 0]); // untracked files
      }
      mockGit.statusMatrix.mockResolvedValue(statusMatrix);

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
    });
  });

  describe('listBranches', () => {
    it('should list all branches', async () => {
      // Mock isomorphic-git listBranches
      mockGit.listBranches.mockResolvedValue(['main', 'develop', 'feature/test']);

      const result = await gitService.listBranches();

      // Verify that isomorphic-git listBranches was called
      expect(mockGit.listBranches).toHaveBeenCalledWith({
        fs: gitService['fs'],
        dir: gitService['workingDirectory'],
      });

      // Verify that the result includes all branches
      expect(result).toEqual(['main', 'develop', 'feature/test']);

      // Verify that branches were stored in database
      expect(databaseService.set).toHaveBeenCalledWith('git:branches', ['main', 'develop', 'feature/test']);
    });
  });

  describe('currentBranch', () => {
    it('should return current branch', async () => {
      // Mock isomorphic-git currentBranch
      mockGit.currentBranch.mockResolvedValue('main');

      const result = await gitService.currentBranch();

      // Verify that isomorphic-git currentBranch was called
      expect(mockGit.currentBranch).toHaveBeenCalledWith({
        fs: gitService['fs'],
        dir: gitService['workingDirectory'],
        fullname: false,
      });

      // Verify that the result is the current branch
      expect(result).toBe('main');

      // Verify that current branch was stored in database
      expect(databaseService.set).toHaveBeenCalledWith('git:currentBranch', 'main');
    });
  });

  describe('branch', () => {
    it('should create new branch', async () => {
      const name = 'feature/new';

      // Set initial branches in the GitService instance
      gitService['branches'] = ['main'];

      // Mock isomorphic-git branch
      mockGit.branch.mockResolvedValue(undefined);

      // Mock listBranches to return updated list
      vi.spyOn(gitService, 'listBranches').mockResolvedValue(['main', name]);

      await gitService.branch(name);

      // Verify that isomorphic-git branch was called
      expect(mockGit.branch).toHaveBeenCalledWith({
        fs: gitService['fs'],
        dir: gitService['workingDirectory'],
        ref: name,
        checkout: false,
      });

      // Verify that listBranches was called to update the branches list
      expect(gitService.listBranches).toHaveBeenCalled();
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
      gitService['_currentBranch'] = 'main';

      // Mock isomorphic-git checkout
      mockGit.checkout.mockResolvedValue(undefined);

      // Mock currentBranch method to return the new branch and update internal state
      vi.spyOn(gitService, 'currentBranch').mockImplementation(async () => {
        gitService['_currentBranch'] = ref;
        return ref;
      });

      await gitService.checkout(ref);

      // Verify that the current branch was updated
      expect(gitService['_currentBranch']).toBe(ref);
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
      gitService['_currentBranch'] = 'main';

      // Verify that deleting the current branch throws an error
      await expect(gitService.deleteBranch(name)).rejects.toThrow(
        'Cannot delete the current branch',
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
      // Mock isomorphic-git log
      const mockCommits = [
        {
          oid: 'def456',
          commit: {
            message: 'Another commit',
            author: {
              name: 'Another User',
              email: 'another@example.com',
              timestamp: 1234567891,
            },
          },
        },
        {
          oid: 'abc123',
          commit: {
            message: 'Test commit',
            author: {
              name: 'Test User',
              email: 'test@example.com',
              timestamp: 1234567890,
            },
          },
        },
      ];
      mockGit.log.mockResolvedValue(mockCommits);

      const result = await gitService.log({ limit: 5 });

      // Verify that isomorphic-git log was called
      expect(mockGit.log).toHaveBeenCalledWith({
        fs: gitService['fs'],
        dir: gitService['workingDirectory'],
        depth: 6, // skip (0) + limit (5) + 1
      });

      // Verify that the result includes the expected commits
      expect(result.commits.length).toBe(2);
      expect(result.commits[0]).toMatchObject({
        oid: 'def456',
        message: 'Another commit',
        author: {
          name: 'Another User',
          email: 'another@example.com',
          timestamp: 1234567891,
        },
      });
      expect(result.commits[1]).toMatchObject({
        oid: 'abc123',
        message: 'Test commit',
        author: {
          name: 'Test User',
          email: 'test@example.com',
          timestamp: 1234567890,
        },
      });
      expect(result.hasMore).toBe(false);
    });
  });

  describe('push', () => {
    it('should push to remote', async () => {
      const remote = 'origin';
      const ref = 'main';

      // Mock isomorphic-git push
      mockGit.push.mockResolvedValue(undefined);

      const result = await gitService.push(remote, ref);

      // Verify that isomorphic-git push was called
      expect(mockGit.push).toHaveBeenCalledWith({
        fs: gitService['fs'],
        http: expect.any(Function),
        dir: gitService['workingDirectory'],
        remote,
        ref,
      });

      expect(result).toBe(true);
    });
  });

  describe('pull', () => {
    it('should pull from remote', async () => {
      const remote = 'origin';
      const ref = 'main';

      // Mock isomorphic-git pull
      mockGit.pull.mockResolvedValue(undefined);

      const result = await gitService.pull(remote, ref);

      // Verify that isomorphic-git pull was called
      expect(mockGit.pull).toHaveBeenCalledWith({
        fs: gitService['fs'],
        http: expect.any(Function),
        dir: gitService['workingDirectory'],
        ref,
        singleBranch: true,
        author: {
          name: 'User',
          email: 'user@example.com',
        },
      });

      expect(result).toBe(true);
    });
  });
});
