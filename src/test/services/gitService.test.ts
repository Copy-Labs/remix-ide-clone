import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GitService, GitFileSystemAdapter } from '@/services/gitService';
import { useFileStore } from '@/stores/fileStore';
import git from 'isomorphic-git';

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
    clone: vi.fn(),
    add: vi.fn(),
    commit: vi.fn(),
    statusMatrix: vi.fn(),
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
        `ENOENT: no such file or directory, open '${filepath}'`
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
        if (path === '/test-dir/file1.txt' || path === '/test-dir/file2.txt' || path === '/test-dir/subdir') {
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
        `ENOENT: no such file or directory, stat '${filepath}'`
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

      expect(mockGit.init).toHaveBeenCalledWith({
        fs: expect.any(GitFileSystemAdapter),
        dir: '/test',
        defaultBranch: 'main',
      });
    });

    it('should initialize repository with custom branch', async () => {
      await gitService.init('develop');

      expect(mockGit.init).toHaveBeenCalledWith({
        fs: expect.any(GitFileSystemAdapter),
        dir: '/test',
        defaultBranch: 'develop',
      });
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Init failed');
      mockGit.init.mockRejectedValue(error);

      await expect(gitService.init()).rejects.toThrow('Init failed');
    });
  });

  describe('clone', () => {
    it('should clone repository successfully', async () => {
      const url = 'https://github.com/user/repo.git';

      await gitService.clone(url);

      expect(mockGit.clone).toHaveBeenCalledWith({
        fs: expect.any(GitFileSystemAdapter),
        http: fetch,
        dir: '/test',
        url,
        singleBranch: true,
        depth: 1,
      });
    });

    it('should clone to custom directory', async () => {
      const url = 'https://github.com/user/repo.git';
      const dir = '/custom';

      await gitService.clone(url, dir);

      expect(mockGit.clone).toHaveBeenCalledWith({
        fs: expect.any(GitFileSystemAdapter),
        http: fetch,
        dir: '/custom',
        url,
        singleBranch: true,
        depth: 1,
      });
    });
  });

  describe('add', () => {
    it('should add file to staging area', async () => {
      const filepath = 'test.txt';

      await gitService.add(filepath);

      expect(mockGit.add).toHaveBeenCalledWith({
        fs: expect.any(GitFileSystemAdapter),
        dir: '/test',
        filepath,
      });
    });
  });

  describe('commit', () => {
    it('should create commit successfully', async () => {
      const message = 'Test commit';
      const author = { name: 'Test User', email: 'test@example.com' };
      const oid = 'abc123';
      mockGit.commit.mockResolvedValue(oid);

      const result = await gitService.commit(message, author);

      expect(mockGit.commit).toHaveBeenCalledWith({
        fs: expect.any(GitFileSystemAdapter),
        dir: '/test',
        message,
        author,
      });
      expect(result).toBe(oid);
    });
  });

  describe('status', () => {
    it('should return repository status', async () => {
      const statusMatrix = [
        ['file1.txt', 1, 2, 0],
        ['file2.txt', 0, 2, 0],
      ];
      mockGit.statusMatrix.mockResolvedValue(statusMatrix);

      const result = await gitService.status();

      expect(result).toEqual([
        { file: 'file1.txt', head: 1, workdir: 2, stage: 0 },
        { file: 'file2.txt', head: 0, workdir: 2, stage: 0 },
      ]);
    });
  });

  describe('listBranches', () => {
    it('should list all branches', async () => {
      const branches = ['main', 'develop', 'feature/test'];
      mockGit.listBranches.mockResolvedValue(branches);

      const result = await gitService.listBranches();

      expect(result).toEqual(branches);
    });
  });

  describe('currentBranch', () => {
    it('should return current branch', async () => {
      const branch = 'main';
      mockGit.currentBranch.mockResolvedValue(branch);

      const result = await gitService.currentBranch();

      expect(result).toBe(branch);
    });
  });

  describe('branch', () => {
    it('should create new branch', async () => {
      const name = 'feature/new';

      await gitService.branch(name);

      expect(mockGit.branch).toHaveBeenCalledWith({
        fs: expect.any(GitFileSystemAdapter),
        dir: '/test',
        ref: name,
      });
    });
  });

  describe('checkout', () => {
    it('should switch to branch', async () => {
      const ref = 'develop';

      await gitService.checkout(ref);

      expect(mockGit.checkout).toHaveBeenCalledWith({
        fs: expect.any(GitFileSystemAdapter),
        dir: '/test',
        ref,
      });
    });
  });

  describe('deleteBranch', () => {
    it('should delete branch', async () => {
      const name = 'feature/old';

      await gitService.deleteBranch(name);

      expect(mockGit.deleteBranch).toHaveBeenCalledWith({
        fs: expect.any(GitFileSystemAdapter),
        dir: '/test',
        ref: name,
      });
    });
  });

  describe('log', () => {
    it('should return commit history', async () => {
      const commits = [
        { oid: 'abc123', commit: { message: 'Test commit' } },
        { oid: 'def456', commit: { message: 'Another commit' } },
      ];
      mockGit.log.mockResolvedValue(commits);

      const result = await gitService.log(5);

      expect(mockGit.log).toHaveBeenCalledWith({
        fs: expect.any(GitFileSystemAdapter),
        dir: '/test',
        depth: 5,
      });
      expect(result).toEqual(commits);
    });
  });

  describe('addRemote', () => {
    it('should add remote successfully', async () => {
      const remote = 'origin';
      const url = 'https://github.com/user/repo.git';

      await gitService.addRemote(remote, url);

      expect(mockGit.addRemote).toHaveBeenCalledWith({
        fs: expect.any(GitFileSystemAdapter),
        dir: '/test',
        remote,
        url,
        force: false,
      });
    });

    it('should add remote with force option', async () => {
      const remote = 'origin';
      const url = 'https://github.com/user/repo.git';
      const force = true;

      await gitService.addRemote(remote, url, force);

      expect(mockGit.addRemote).toHaveBeenCalledWith({
        fs: expect.any(GitFileSystemAdapter),
        dir: '/test',
        remote,
        url,
        force,
      });
    });
  });

  describe('deleteRemote', () => {
    it('should delete remote successfully', async () => {
      const remote = 'origin';

      await gitService.deleteRemote(remote);

      expect(mockGit.deleteRemote).toHaveBeenCalledWith({
        fs: expect.any(GitFileSystemAdapter),
        dir: '/test',
        remote,
      });
    });
  });

  describe('listRemotes', () => {
    it('should list all remotes', async () => {
      const remotes = [
        { remote: 'origin', url: 'https://github.com/user/repo.git' },
        { remote: 'upstream', url: 'https://github.com/upstream/repo.git' },
      ];
      mockGit.listRemotes.mockResolvedValue(remotes);

      const result = await gitService.listRemotes();

      expect(result).toEqual(remotes);
    });
  });

  describe('push', () => {
    it('should push to remote', async () => {
      const remote = 'origin';
      const ref = 'main';

      await gitService.push(remote, ref);

      expect(mockGit.push).toHaveBeenCalledWith({
        fs: expect.any(GitFileSystemAdapter),
        http: fetch,
        dir: '/test',
        remote,
        ref,
      });
    });
  });

  describe('pull', () => {
    it('should pull from remote', async () => {
      const remote = 'origin';
      const ref = 'main';

      await gitService.pull(remote, ref);

      expect(mockGit.pull).toHaveBeenCalledWith({
        fs: expect.any(GitFileSystemAdapter),
        http: fetch,
        dir: '/test',
        ref,
        singleBranch: true,
      });
    });
  });

  describe('fetch', () => {
    it('should fetch from remote', async () => {
      const remote = 'origin';

      await gitService.fetch(remote);

      expect(mockGit.fetch).toHaveBeenCalledWith({
        fs: expect.any(GitFileSystemAdapter),
        http: fetch,
        dir: '/test',
        remote,
      });
    });
  });
});
