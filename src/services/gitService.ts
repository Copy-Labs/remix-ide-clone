import git from 'isomorphic-git';
import { useFileStore } from '@/stores/fileStore';
import { debug, info, warn, error } from '@/services/loggerService';

// File system adapter for isomorphic-git that works with our file store
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
    readFile: async (filepath: string, options?: any): Promise<Buffer | string> => {
      try {
        const store = this.getFileStore();
        const content = await store.getFileContent(filepath);

        if (content === undefined) {
          throw new Error(`ENOENT: no such file or directory, open '${filepath}'`);
        }

        // Handle encoding options
        if (options?.encoding === 'utf8' || options?.encoding === 'utf-8') {
          return content;
        }

        // Return as Buffer for binary operations
        return Buffer.from(content, 'utf8');
      } catch (err) {
        error(`Failed to read file ${filepath}:`, err);
        throw err;
      }
    },

    writeFile: async (filepath: string, data: Buffer | string, options?: any): Promise<void> => {
      try {
        const store = this.getFileStore();
        const content = typeof data === 'string' ? data : data.toString('utf8');

        // Check if file exists
        const existingFile = await store.getFile(filepath);

        if (existingFile) {
          // Update existing file
          await store.updateFileContent(filepath, content);
        } else {
          // Create new file
          await store.createFile(filepath, content);
        }

        debug(`File written: ${filepath}`);
      } catch (err) {
        error(`Failed to write file ${filepath}:`, err);
        throw err;
      }
    },

    mkdir: async (dirpath: string, options?: any): Promise<void> => {
      try {
        const store = this.getFileStore();
        await store.createFolder(dirpath);
        debug(`Directory created: ${dirpath}`);
      } catch (err) {
        error(`Failed to create directory ${dirpath}:`, err);
        throw err;
      }
    },

    readdir: async (dirpath: string): Promise<string[]> => {
      try {
        const store = this.getFileStore();
        const files = store.files;
        const entries: string[] = [];

        // Find all files and folders in the specified directory
        for (const [path, file] of files) {
          const parentPath = store.getParentPath(path);
          if (parentPath === dirpath) {
            entries.push(file.name);
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
        const store = this.getFileStore();
        const file = await store.getFile(filepath);

        if (!file) {
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
      // For our purposes, lstat is the same as stat
      return this.stat(filepath);
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

// Git service class that provides high-level git operations
export class GitService {
  private fs: GitFileSystemAdapter;
  private dir: string;

  constructor(workingDirectory: string = '/') {
    this.fs = gitFS;
    this.dir = workingDirectory;
  }

  // Initialize a new git repository
  async init(defaultBranch: string = 'main'): Promise<void> {
    try {
      await git.init({
        fs: this.fs,
        dir: this.dir,
        defaultBranch,
      });
      info('Git repository initialized');
    } catch (err) {
      error('Failed to initialize git repository:', err);
      throw err;
    }
  }

  // Clone a repository
  async clone(url: string, dir?: string): Promise<void> {
    try {
      await git.clone({
        fs: this.fs,
        http: fetch,
        dir: dir || this.dir,
        url,
        singleBranch: true,
        depth: 1,
      });
      info(`Repository cloned from ${url}`);
    } catch (err) {
      error('Failed to clone repository:', err);
      throw err;
    }
  }

  // Add files to staging area
  async add(filepath: string): Promise<void> {
    try {
      await git.add({
        fs: this.fs,
        dir: this.dir,
        filepath,
      });
      debug(`File added to staging: ${filepath}`);
    } catch (err) {
      error(`Failed to add file ${filepath}:`, err);
      throw err;
    }
  }

  // Commit changes
  async commit(message: string, author: { name: string; email: string }): Promise<string> {
    try {
      const oid = await git.commit({
        fs: this.fs,
        dir: this.dir,
        message,
        author,
      });
      info(`Commit created: ${oid}`);
      return oid;
    } catch (err) {
      error('Failed to commit:', err);
      throw err;
    }
  }

  // Get repository status
  async status(): Promise<Array<{ file: string; head: number; workdir: number; stage: number }>> {
    try {
      const statusMatrix = await git.statusMatrix({
        fs: this.fs,
        dir: this.dir,
      });

      return statusMatrix.map(([file, head, workdir, stage]) => ({
        file,
        head,
        workdir,
        stage,
      }));
    } catch (err) {
      error('Failed to get status:', err);
      throw err;
    }
  }

  // List branches
  async listBranches(): Promise<string[]> {
    try {
      const branches = await git.listBranches({
        fs: this.fs,
        dir: this.dir,
      });
      return branches;
    } catch (err) {
      error('Failed to list branches:', err);
      throw err;
    }
  }

  // Get current branch
  async currentBranch(): Promise<string | undefined> {
    try {
      const branch = await git.currentBranch({
        fs: this.fs,
        dir: this.dir,
      });
      return branch;
    } catch (err) {
      error('Failed to get current branch:', err);
      throw err;
    }
  }

  // Create a new branch
  async branch(name: string): Promise<void> {
    try {
      await git.branch({
        fs: this.fs,
        dir: this.dir,
        ref: name,
      });
      info(`Branch created: ${name}`);
    } catch (err) {
      error(`Failed to create branch ${name}:`, err);
      throw err;
    }
  }

  // Switch to a branch
  async checkout(ref: string): Promise<void> {
    try {
      await git.checkout({
        fs: this.fs,
        dir: this.dir,
        ref,
      });
      info(`Switched to branch: ${ref}`);
    } catch (err) {
      error(`Failed to checkout ${ref}:`, err);
      throw err;
    }
  }

  // Delete a branch
  async deleteBranch(name: string): Promise<void> {
    try {
      await git.deleteBranch({
        fs: this.fs,
        dir: this.dir,
        ref: name,
      });
      info(`Branch deleted: ${name}`);
    } catch (err) {
      error(`Failed to delete branch ${name}:`, err);
      throw err;
    }
  }

  // Get commit log
  async log(depth: number = 10): Promise<any[]> {
    try {
      const commits = await git.log({
        fs: this.fs,
        dir: this.dir,
        depth,
      });
      return commits;
    } catch (err) {
      error('Failed to get commit log:', err);
      throw err;
    }
  }

  // Add remote
  async addRemote(remote: string, url: string): Promise<void> {
    try {
      await git.addRemote({
        fs: this.fs,
        dir: this.dir,
        remote,
        url,
      });
      info(`Remote added: ${remote} -> ${url}`);
    } catch (err) {
      error(`Failed to add remote ${remote}:`, err);
      throw err;
    }
  }

  // Remove remote
  async deleteRemote(remote: string): Promise<void> {
    try {
      await git.deleteRemote({
        fs: this.fs,
        dir: this.dir,
        remote,
      });
      info(`Remote deleted: ${remote}`);
    } catch (err) {
      error(`Failed to delete remote ${remote}:`, err);
      throw err;
    }
  }

  // List remotes
  async listRemotes(): Promise<Array<{ remote: string; url: string }>> {
    try {
      const remotes = await git.listRemotes({
        fs: this.fs,
        dir: this.dir,
      });
      return remotes;
    } catch (err) {
      error('Failed to list remotes:', err);
      throw err;
    }
  }

  // Push to remote
  async push(remote: string = 'origin', ref?: string): Promise<void> {
    try {
      await git.push({
        fs: this.fs,
        http: fetch,
        dir: this.dir,
        remote,
        ref,
      });
      info(`Pushed to ${remote}${ref ? `/${ref}` : ''}`);
    } catch (err) {
      error('Failed to push:', err);
      throw err;
    }
  }

  // Pull from remote
  async pull(remote: string = 'origin', ref?: string): Promise<void> {
    try {
      await git.pull({
        fs: this.fs,
        http: fetch,
        dir: this.dir,
        ref,
        singleBranch: true,
      });
      info(`Pulled from ${remote}${ref ? `/${ref}` : ''}`);
    } catch (err) {
      error('Failed to pull:', err);
      throw err;
    }
  }

  // Fetch from remote
  async fetch(remote: string = 'origin'): Promise<void> {
    try {
      await git.fetch({
        fs: this.fs,
        http: fetch,
        dir: this.dir,
        remote,
      });
      info(`Fetched from ${remote}`);
    } catch (err) {
      error('Failed to fetch:', err);
      throw err;
    }
  }
}

// Export a default git service instance
export const gitService = new GitService();
