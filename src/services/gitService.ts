import { useFileStore } from '@/stores/fileStore';
import { debug, info, warn, error } from '@/services/loggerService';

// Mock implementation of Git functionality for browser environments
// This class provides the same interface as the original GitService
// but doesn't rely on actual Git operations

// File system adapter for our file store
export class GitFileSystemAdapter {
  private fileStore: any;

  constructor() {
    // We'll get the file store instance when needed
    this.fileStore = null;
  }

  private getFileStore() {
    if (!this.fileStore) {
      this.fileStore = useFileStore.getState();
    }
    return this.fileStore;
  }

  promises = {
    readFile: async (filepath: string, options?: any): Promise<string> => {
      try {
        // Debug logging to identify undefined filepath issues
        if (typeof filepath !== 'string' || filepath === undefined || filepath === null || filepath === '' || filepath === 'undefined') {
          debug(`Invalid filepath in readFile: ${typeof filepath}, value: ${filepath}`);
          const err = new Error(`ENOENT: no such file or directory, open '${filepath}'`);
          (err as any).code = 'ENOENT';
          throw err;
        }

        const store = this.getFileStore();
        const content = await store.getFileContent(filepath);

        if (content === undefined) {
          const err = new Error(`ENOENT: no such file or directory, open '${filepath}'`);
          (err as any).code = 'ENOENT';
          throw err;
        }

        return content;
      } catch (err) {
        error(`Failed to read file ${filepath}:`, err);
        throw err;
      }
    },

    writeFile: async (filepath: string, data: string, options?: any): Promise<void> => {
      try {
        // Validate filepath parameter
        if (filepath === undefined || filepath === null || filepath === '') {
          throw new Error(`ENOENT: no such file or directory, open '${filepath}'`);
        }

        const store = this.getFileStore();
        const content = data;

        // Normalize path to handle various path formats
        const normalizedPath = filepath.replace(/\/+/g, '/').replace(/^\/$/, '') || '/';

        // Extract directory path
        const lastSlashIndex = normalizedPath.lastIndexOf('/');
        if (lastSlashIndex > 0) {
          const dirPath = normalizedPath.substring(0, lastSlashIndex);

          // Check if the directory exists
          try {
            await this.promises.stat(dirPath);
          } catch (statErr) {
            // Directory doesn't exist, so create it
            debug(`Creating directory: ${dirPath} for file: ${filepath}`);
            await this.promises.mkdir(dirPath, { recursive: true });
          }
        }

        // Check if file exists
        const existingFile = await store.getFile(normalizedPath);

        if (existingFile) {
          // Update existing file
          await store.updateFileContent(normalizedPath, content);
        } else {
          // Create new file
          await store.createFile(normalizedPath, content);
        }

        debug(`File written: ${filepath}`);
      } catch (err) {
        error(`Failed to write file ${filepath}:`, err);
        throw err;
      }
    },

    mkdir: async (dirpath: string, options?: any): Promise<void> => {
      try {
        // Validate dirpath parameter
        if (dirpath === undefined || dirpath === null || dirpath === '') {
          throw new Error(`ENOENT: invalid directory path '${dirpath}'`);
        }

        const store = this.getFileStore();
        const normalizedPath = dirpath.replace(/\/+/g, '/').replace(/\/$/, '') || '/';

        // If recursive option is set, create parent directories if they don't exist
        if (options?.recursive) {
          const pathParts = normalizedPath.split('/').filter(Boolean);
          let currentPath = '';

          for (const part of pathParts) {
            currentPath = currentPath ? `${currentPath}/${part}` : `/${part}`;

            try {
              await this.promises.stat(currentPath);
              // Directory exists, continue to next part
            } catch (statErr) {
              // Directory doesn't exist, create it
              await store.createFolder(currentPath);
              debug(`Directory created: ${currentPath}`);
            }
          }
        } else {
          // Non-recursive mode, just create the directory
          await store.createFolder(normalizedPath);
          debug(`Directory created: ${normalizedPath}`);
        }
      } catch (err) {
        error(`Failed to create directory ${dirpath}:`, err);
        throw err;
      }
    },

    readdir: async (dirpath: string): Promise<string[]> => {
      try {
        // Validate dirpath parameter
        if (dirpath === undefined || dirpath === null) {
          const err = new Error(`ENOENT: no such file or directory, scandir '${dirpath}'`);
          (err as any).code = 'ENOENT';
          throw err;
        }

        // Normalize path to handle various path formats
        let normalizedPath = dirpath.replace(/\/+/g, '/').replace(/\/$/, '') || '/';

        // Special case for root or special directories
        if (normalizedPath === '.' || normalizedPath === '/.' || normalizedPath === '//') {
          normalizedPath = '/';
        }

        debug(`readdir called for: ${dirpath} (normalized to: ${normalizedPath})`);

        const store = this.getFileStore();
        const files = store.files;
        const entries: string[] = [];
        const processedNames = new Set<string>(); // To avoid duplicates

        // Find all files and folders in the specified directory
        for (const [path, file] of files) {
          const parentPath = store.getParentPath(path);
          if (parentPath === normalizedPath && !processedNames.has(file.name)) {
            entries.push(file.name);
            processedNames.add(file.name);
          }
        }

        // If no entries found and this is not the root, check if directory exists
        if (entries.length === 0 && normalizedPath !== '/') {
          // Check if directory exists by looking for any path that starts with this directory
          const directoryExists = Array.from(files.keys()).some(path =>
            path === normalizedPath ||
            path.startsWith(normalizedPath + '/')
          );

          if (!directoryExists) {
            const err = new Error(`ENOENT: no such file or directory, scandir '${dirpath}'`);
            (err as any).code = 'ENOENT';
            throw err;
          }
        }

        debug(`Directory read: ${dirpath}, entries: ${entries.length}`);
        return entries;
      } catch (err) {
        error(`Failed to read directory ${dirpath}:`, err);
        throw err;
      }
    },

    stat: async (filepath: string): Promise<any> => {
      try {
        // Handle invalid filepath parameters
        if (typeof filepath !== 'string' || filepath === undefined || filepath === null || filepath === '' || filepath === 'undefined') {
          debug(`Invalid filepath in stat: ${typeof filepath}, value: ${filepath}`);
          const err = new Error(`ENOENT: no such file or directory, stat '${filepath}'`);
          (err as any).code = 'ENOENT';
          throw err;
        }

        // Normalize path to handle various path formats
        const normalizedPath = filepath.replace(/\/+/g, '/').replace(/\/$/, '') || '/';

        // Special case for current directory, parent directory, or root
        if (normalizedPath === '.' || normalizedPath === '..' ||
            normalizedPath === '/.' || normalizedPath === '/..' ||
            normalizedPath === '/' || normalizedPath === '//.') {
          debug(`stat called for special directory ('${filepath}' -> '${normalizedPath}')`);

          // Return a directory stat object for the special directory
          return {
            isFile: () => false,
            isDirectory: () => true,
            isSymbolicLink: () => false,
            size: 0,
            mtime: new Date(),
            ctime: new Date(),
            mode: 16877, // 0o040755 for directories
          };
        }

        const store = this.getFileStore();
        const file = await store.getFile(normalizedPath);

        if (!file) {
          // Check if this might be a directory that exists but isn't explicitly tracked
          const potentialChildren = Array.from(store.files.keys()).filter(path =>
            path.startsWith(normalizedPath + '/') || path === normalizedPath
          );

          if (potentialChildren.length > 0) {
            debug(`stat: treating ${normalizedPath} as directory based on child paths`);
            return {
              isFile: () => false,
              isDirectory: () => true,
              isSymbolicLink: () => false,
              size: 0,
              mtime: new Date(),
              ctime: new Date(),
              mode: 16877, // 0o040755 for directories
            };
          }

          const err = new Error(`ENOENT: no such file or directory, stat '${filepath}'`);
          (err as any).code = 'ENOENT';
          throw err;
        }

        // Return stat-like object
        return {
          isFile: () => file.type === 'file',
          isDirectory: () => file.type === 'folder',
          isSymbolicLink: () => false,
          size: file.content ? file.content.length : 0,
          mtime: new Date(file.lastModified),
          ctime: new Date(file.lastModified),
          mode: file.type === 'file' ? 33188 : 16877, // 0o100644 for files, 0o040755 for directories
        };
      } catch (err) {
        error(`Failed to stat ${filepath}:`, err);
        throw err;
      }
    },

    unlink: async (filepath: string): Promise<void> => {
      try {
        const store = this.getFileStore();
        await store.deleteFile(filepath);
        debug(`File deleted: ${filepath}`);
      } catch (err) {
        error(`Failed to delete file ${filepath}:`, err);
        throw err;
      }
    },

    rmdir: async (dirpath: string): Promise<void> => {
      try {
        const store = this.getFileStore();
        await store.deleteFile(dirpath);
        debug(`Directory deleted: ${dirpath}`);
      } catch (err) {
        error(`Failed to delete directory ${dirpath}:`, err);
        throw err;
      }
    },

    lstat: async (filepath: string): Promise<any> => {
      // For our mock implementation, lstat is the same as stat
      return this.promises.stat(filepath);
    },

    readlink: async (filepath: string): Promise<string> => {
      // We don't support symbolic links in our file system
      throw new Error(`EINVAL: invalid argument, readlink '${filepath}'`);
    },

    symlink: async (target: string, filepath: string): Promise<void> => {
      // We don't support symbolic links in our file system
      throw new Error(`EPERM: operation not permitted, symlink '${target}' -> '${filepath}'`);
    },
  };
}

// Create a singleton instance
export const gitFS = new GitFileSystemAdapter();

// Mock Git service class for browser environments
export class GitService {
  private fs: GitFileSystemAdapter;
  private dir: string;

  // In-memory storage for Git-like state
  private branches: string[] = ['main'];
  private currentBranchName: string = 'main';
  private commits: Array<{
    oid: string;
    message: string;
    author: { name: string; email: string; timestamp: number; };
    parent?: string;
    files: Map<string, string>; // filepath -> content
  }> = [];
  private stagedFiles: Set<string> = new Set();
  private remotes: Array<{ remote: string; url: string }> = [];

  constructor(workingDirectory: string = '/') {
    this.fs = gitFS;
    this.dir = workingDirectory;
  }

  // Initialize a new git repository
  async init(defaultBranch: string = 'main'): Promise<void> {
    try {
      // Create .git directory to simulate initialization
      await this.fs.promises.mkdir(`${this.dir}/.git`, { recursive: true });

      // Set default branch
      this.branches = [defaultBranch];
      this.currentBranchName = defaultBranch;

      info('Git repository initialized (browser-compatible mock)');
    } catch (err) {
      error('Failed to initialize git repository:', err);
      throw err;
    }
  }

  // Create an initial commit
  async createInitialCommit(author: { name: string; email: string }): Promise<string> {
    try {
      // Create a .gitkeep file to have something to commit
      const gitkeepPath = `${this.dir === '/' ? '' : this.dir}/.gitkeep`;
      await this.fs.promises.writeFile(gitkeepPath, '', { encoding: 'utf8' });

      // Add the file to staging
      this.stagedFiles.add('.gitkeep');

      // Create a commit
      const oid = this.generateOid();
      const timestamp = Math.floor(Date.now() / 1000);

      const files = new Map<string, string>();
      files.set('.gitkeep', '');

      this.commits.push({
        oid,
        message: 'Initial commit',
        author: {
          name: author.name,
          email: author.email,
          timestamp
        },
        files
      });

      // Clear staged files
      this.stagedFiles.clear();

      info('Initial commit created (browser-compatible mock)');
      return oid;
    } catch (err) {
      error('Failed to create initial commit:', err);
      throw err;
    }
  }

  // Clone a repository - not supported in browser
  async clone(url: string, dir?: string): Promise<void> {
    warn('Git clone operation is not supported in browser environment');
    throw new Error('Git clone operation is not supported in browser environment');
  }

  // Reset the git index
  async resetGitIndex(): Promise<void> {
    try {
      // In our mock implementation, just clear staged files
      this.stagedFiles.clear();
      info('Git index has been reset (browser-compatible mock)');
    } catch (err) {
      error('Failed to reset git index:', err);
      throw err;
    }
  }

  // Add files to staging area
  async add(filepath: string): Promise<void> {
    try {
      // Check if file exists
      await this.fs.promises.stat(filepath);

      // Add to staged files
      this.stagedFiles.add(filepath);
      debug(`File added to staging: ${filepath} (browser-compatible mock)`);
    } catch (err) {
      error(`Failed to add file ${filepath}:`, err);
      throw err;
    }
  }

  // Remove files from staging area (unstage)
  async unstage(filepath: string): Promise<void> {
    try {
      // Remove from staged files
      this.stagedFiles.delete(filepath);
      debug(`File removed from staging: ${filepath} (browser-compatible mock)`);
    } catch (err) {
      error(`Failed to unstage file ${filepath}:`, err);
      throw err;
    }
  }

  // Commit changes
  async commit(message: string, author: { name: string; email: string }): Promise<string> {
    try {
      if (this.stagedFiles.size === 0) {
        throw new Error('No changes to commit');
      }

      const oid = this.generateOid();
      const timestamp = Math.floor(Date.now() / 1000);

      // Get the latest commit as parent
      const parent = this.commits.length > 0 ? this.commits[this.commits.length - 1].oid : undefined;

      // Create a new commit with the staged files
      const files = new Map<string, string>();
      for (const filepath of this.stagedFiles) {
        try {
          const content = await this.fs.promises.readFile(filepath, { encoding: 'utf8' });
          files.set(filepath, content);
        } catch (err) {
          // Skip files that can't be read
          warn(`Skipping file ${filepath} in commit due to error:`, err);
        }
      }

      this.commits.push({
        oid,
        message,
        author: {
          name: author.name,
          email: author.email,
          timestamp
        },
        parent,
        files
      });

      // Clear staged files
      this.stagedFiles.clear();

      info(`Commit created: ${oid} (browser-compatible mock)`);
      return oid;
    } catch (err) {
      error('Failed to commit:', err);
      throw err;
    }
  }

  // Get repository status
  async status(options: {
    skip?: number;
    limit?: number;
    filter?: 'all' | 'modified' | 'staged' | 'untracked'
  } = {}): Promise<{
    files: Array<{ file: string; head: number; workdir: number; stage: number }>;
    hasMore: boolean;
    total: number;
  }> {
    try {
      const { skip = 0, limit = 100, filter = 'all' } = options;

      // Get all files in the working directory
      const allFiles: Array<{ file: string; head: number; workdir: number; stage: number }> = [];

      // Get the latest commit files
      const latestCommit = this.commits.length > 0 ? this.commits[this.commits.length - 1] : null;
      const commitFiles = latestCommit ? latestCommit.files : new Map<string, string>();

      // Get all files in the working directory
      const store = this.fs.getFileStore();
      const files = store.files;

      for (const [path, file] of files) {
        if (file.type === 'file' && !path.startsWith('/.git/')) {
          const relativePath = path.startsWith('/') ? path.substring(1) : path;

          // Check if file is in the latest commit
          const inHead = commitFiles.has(relativePath) ? 1 : 0;

          // Check if file is staged
          const inStage = this.stagedFiles.has(relativePath) ? 2 : 0;

          // Always consider the file as modified in workdir for simplicity
          const inWorkdir = 2;

          allFiles.push({
            file: relativePath,
            head: inHead,
            workdir: inWorkdir,
            stage: inStage
          });
        }
      }

      // Apply filtering
      let filteredFiles = allFiles;
      if (filter === 'modified') {
        filteredFiles = allFiles.filter(file => file.head === 1 && file.workdir === 2 && file.stage === 0);
      } else if (filter === 'staged') {
        filteredFiles = allFiles.filter(file => file.stage === 2);
      } else if (filter === 'untracked') {
        filteredFiles = allFiles.filter(file => file.head === 0 && file.workdir === 2 && file.stage === 0);
      }

      // Apply pagination
      const paginatedFiles = filteredFiles.slice(skip, skip + limit);
      const hasMore = skip + limit < filteredFiles.length;

      return {
        files: paginatedFiles,
        hasMore,
        total: filteredFiles.length
      };
    } catch (err) {
      error('Failed to get status:', err);
      throw err;
    }
  }

  // List branches
  async listBranches(): Promise<string[]> {
    return this.branches;
  }

  // Get current branch
  async currentBranch(): Promise<string | undefined> {
    return this.currentBranchName;
  }

  // Create a new branch
  async branch(name: string): Promise<void> {
    try {
      if (this.branches.includes(name)) {
        throw new Error(`Branch ${name} already exists`);
      }

      this.branches.push(name);
      info(`Branch created: ${name} (browser-compatible mock)`);
    } catch (err) {
      error(`Failed to create branch ${name}:`, err);
      throw err;
    }
  }

  // Switch to a branch
  async checkout(ref: string): Promise<void> {
    try {
      if (!this.branches.includes(ref)) {
        throw new Error(`Branch ${ref} does not exist`);
      }

      this.currentBranchName = ref;
      info(`Switched to branch: ${ref} (browser-compatible mock)`);
    } catch (err) {
      error(`Failed to checkout ${ref}:`, err);
      throw err;
    }
  }

  // Delete a branch
  async deleteBranch(name: string): Promise<void> {
    try {
      if (name === this.currentBranchName) {
        throw new Error(`Cannot delete the current branch: ${name}`);
      }

      const index = this.branches.indexOf(name);
      if (index === -1) {
        throw new Error(`Branch ${name} does not exist`);
      }

      this.branches.splice(index, 1);
      info(`Branch deleted: ${name} (browser-compatible mock)`);
    } catch (err) {
      error(`Failed to delete branch ${name}:`, err);
      throw err;
    }
  }

  // Get commit log
  async log(options: { depth?: number; skip?: number; limit?: number } = {}): Promise<{ commits: any[]; hasMore: boolean }> {
    try {
      const { depth = 50, skip = 0, limit = 10 } = options;

      // Get all commits up to the depth
      const allCommits = this.commits.slice(-depth).reverse();

      // Format commits to match isomorphic-git format
      const formattedCommits = allCommits.map(commit => ({
        oid: commit.oid,
        commit: {
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
        },
        payload: ''
      }));

      // Apply pagination
      const paginatedCommits = formattedCommits.slice(skip, skip + limit);
      const hasMore = skip + limit < formattedCommits.length;

      return {
        commits: paginatedCommits,
        hasMore
      };
    } catch (err) {
      error('Failed to get commit log:', err);
      throw err;
    }
  }

  // Add remote
  async addRemote(remote: string, url: string, force: boolean = false): Promise<void> {
    try {
      // Check if remote already exists
      const existingRemoteIndex = this.remotes.findIndex(r => r.remote === remote);

      if (existingRemoteIndex !== -1) {
        if (force) {
          // Replace the existing remote
          this.remotes[existingRemoteIndex] = { remote, url };
        } else {
          throw new Error(`Remote ${remote} already exists`);
        }
      } else {
        // Add new remote
        this.remotes.push({ remote, url });
      }

      info(`Remote added: ${remote} -> ${url} (browser-compatible mock)`);
    } catch (err) {
      error(`Failed to add remote ${remote}:`, err);
      throw err;
    }
  }

  // Remove remote
  async deleteRemote(remote: string): Promise<void> {
    try {
      const index = this.remotes.findIndex(r => r.remote === remote);

      if (index === -1) {
        throw new Error(`Remote ${remote} does not exist`);
      }

      this.remotes.splice(index, 1);
      info(`Remote deleted: ${remote} (browser-compatible mock)`);
    } catch (err) {
      error(`Failed to delete remote ${remote}:`, err);
      throw err;
    }
  }

  // List remotes
  async listRemotes(): Promise<Array<{ remote: string; url: string }>> {
    return this.remotes;
  }

  // Push to remote - not supported in browser
  async push(remote: string = 'origin', ref?: string): Promise<void> {
    warn('Git push operation is not supported in browser environment');
    throw new Error('Git push operation is not supported in browser environment');
  }

  // Pull from remote - not supported in browser
  async pull(remote: string = 'origin', ref?: string): Promise<void> {
    warn('Git pull operation is not supported in browser environment');
    throw new Error('Git pull operation is not supported in browser environment');
  }

  // Fetch from remote - not supported in browser
  async fetch(remote: string = 'origin'): Promise<void> {
    warn('Git fetch operation is not supported in browser environment');
    throw new Error('Git fetch operation is not supported in browser environment');
  }

  // File-level Git operations
  async getFileBlame(filepath: string): Promise<Array<{
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
  }>> {
    try {
      // Get the file content
      const content = await this.fs.promises.readFile(filepath, { encoding: 'utf8' });
      const lines = content.split('\n');

      // Find the latest commit that modified this file
      let latestCommit = null;
      for (let i = this.commits.length - 1; i >= 0; i--) {
        const commit = this.commits[i];
        if (commit.files.has(filepath)) {
          latestCommit = commit;
          break;
        }
      }

      if (!latestCommit) {
        // If no commit found, return placeholder data
        return lines.map((content, index) => ({
          commit: {
            oid: '',
            message: 'Not committed yet',
            author: {
              name: '',
              email: '',
              timestamp: Date.now(),
            },
          },
          line: index + 1,
          content,
        }));
      }

      // Return blame information
      return lines.map((content, index) => ({
        commit: {
          oid: latestCommit.oid,
          message: latestCommit.message,
          author: {
            name: latestCommit.author.name,
            email: latestCommit.author.email,
            timestamp: latestCommit.author.timestamp,
          },
        },
        line: index + 1,
        content,
      }));
    } catch (err) {
      error(`Failed to get blame for ${filepath}:`, err);
      throw err;
    }
  }

  // Get file history
  async getFileHistory(filepath: string): Promise<Array<{
    oid: string;
    message: string;
    author: {
      name: string;
      email: string;
      timestamp: number;
    };
    date: Date;
  }>> {
    try {
      // Find all commits that modified this file
      const fileCommits = this.commits
        .filter(commit => commit.files.has(filepath))
        .map(commit => ({
          oid: commit.oid,
          message: commit.message,
          author: {
            name: commit.author.name,
            email: commit.author.email,
            timestamp: commit.author.timestamp,
          },
          date: new Date(commit.author.timestamp * 1000),
        }));

      return fileCommits.reverse(); // Return in chronological order
    } catch (err) {
      error(`Failed to get history for ${filepath}:`, err);
      throw err;
    }
  }

  // Get file diff between two commits
  async getFileDiff(filepath: string, oldOid?: string, newOid?: string): Promise<{
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
  }> {
    try {
      let oldContent = '';
      let newContent = '';

      // Get the current content
      try {
        newContent = await this.fs.promises.readFile(filepath, { encoding: 'utf8' });
      } catch (err) {
        // File might not exist in the current state
        newContent = '';
      }

      // Find the old content
      if (oldOid) {
        const oldCommit = this.commits.find(commit => commit.oid === oldOid);
        if (oldCommit && oldCommit.files.has(filepath)) {
          oldContent = oldCommit.files.get(filepath) || '';
        }
      } else if (this.commits.length > 0) {
        // Use the latest commit if no oldOid specified
        for (let i = this.commits.length - 1; i >= 0; i--) {
          const commit = this.commits[i];
          if (commit.files.has(filepath)) {
            oldContent = commit.files.get(filepath) || '';
            break;
          }
        }
      }

      // Generate a simple diff
      const oldLines = oldContent.split('\n');
      const newLines = newContent.split('\n');
      const diff: Array<{
        type: 'added' | 'removed' | 'unchanged';
        content: string;
        lineNumber: {
          old: number | null;
          new: number | null;
        };
      }> = [];

      // This is a very simple diff algorithm
      let oldLineNumber = 1;
      let newLineNumber = 1;

      // Find common prefix
      let i = 0;
      while (i < oldLines.length && i < newLines.length && oldLines[i] === newLines[i]) {
        diff.push({
          type: 'unchanged',
          content: oldLines[i],
          lineNumber: {
            old: oldLineNumber++,
            new: newLineNumber++,
          },
        });
        i++;
      }

      // Add removed lines
      for (let j = i; j < oldLines.length; j++) {
        diff.push({
          type: 'removed',
          content: oldLines[j],
          lineNumber: {
            old: oldLineNumber++,
            new: null,
          },
        });
      }

      // Add added lines
      for (let j = i; j < newLines.length; j++) {
        diff.push({
          type: 'added',
          content: newLines[j],
          lineNumber: {
            old: null,
            new: newLineNumber++,
          },
        });
      }

      return {
        oldContent,
        newContent,
        diff,
      };
    } catch (err) {
      error(`Failed to get diff for ${filepath}:`, err);
      throw err;
    }
  }

  // Stash operations
  async createStash(message: string): Promise<string> {
    try {
      const stashId = this.generateOid();
      info(`Stash created: ${stashId} (browser-compatible mock)`);
      return stashId;
    } catch (err) {
      error('Failed to create stash:', err);
      throw err;
    }
  }

  async listStashes(): Promise<Array<{
    id: string;
    message: string;
    date: Date;
  }>> {
    // In our mock implementation, we don't actually store stashes
    return [];
  }

  async applyStash(stashId: string): Promise<void> {
    info(`Stash applied: ${stashId} (browser-compatible mock)`);
  }

  async dropStash(stashId: string): Promise<void> {
    info(`Stash dropped: ${stashId} (browser-compatible mock)`);
  }

  // Helper method to generate a random OID (commit hash)
  private generateOid(): string {
    const chars = '0123456789abcdef';
    let oid = '';
    for (let i = 0; i < 40; i++) {
      oid += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return oid;
  }
}

// Export a default git service instance
export const gitService = new GitService('/');
