import type { GitServiceInterface } from './gitServiceInterface';
import { useFileStore } from '@/stores/fileStore';
import { debug, error, info, warn } from '@/services/loggerService';
import { databaseService } from '@/services/databaseService';
import { GitError, GitErrorType, retryGitOperation } from './gitError';
import { gitLFSService } from './gitLFSService';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/web';

/**
 * GitFileSystemAdapter provides file system operations for Git in browser environments
 * using the application's file store.
 */
class GitFileSystemAdapter {
  async readFile(filepath: string, options?: { encoding?: string }): Promise<string | Uint8Array> {
    try {
      const fileStore = this.getFileStore();
      const normalizedPath = filepath.startsWith('/') ? filepath.slice(1) : filepath;

      debug(`Reading file: ${normalizedPath}`);

      const content = fileStore.files[normalizedPath]?.content || '';

      if (options?.encoding === 'utf8' || !options?.encoding) {
        return content;
      }

      // Convert string to Uint8Array if binary encoding is requested
      const encoder = new TextEncoder();
      return encoder.encode(content);
    } catch (e) {
      error(`Error reading file ${filepath}:`, e);
      throw e;
    }
  }

  async writeFile(
    filepath: string,
    data: string | Uint8Array,
    options?: { encoding?: string },
  ): Promise<void> {
    try {
      const fileStore = this.getFileStore();
      const normalizedPath = filepath.startsWith('/') ? filepath.slice(1) : filepath;

      debug(`Writing file: ${normalizedPath}`);

      let content: string;

      if (typeof data === 'string') {
        content = data;
      } else {
        // Convert Uint8Array to string
        const decoder = new TextDecoder(options?.encoding || 'utf8');
        content = decoder.decode(data);
      }

      fileStore.createFile(normalizedPath, content);
    } catch (e) {
      error(`Error writing file ${filepath}:`, e);
      throw e;
    }
  }

  async mkdir(dirpath: string, options?: { recursive?: boolean }): Promise<void> {
    try {
      const fileStore = this.getFileStore();
      const normalizedPath = dirpath.startsWith('/') ? dirpath.slice(1) : dirpath;

      debug(`Creating directory: ${normalizedPath}`);

      if (options?.recursive) {
        // Create parent directories if they don't exist
        const parts = normalizedPath.split('/');
        let currentPath = '';

        for (let i = 0; i < parts.length; i++) {
          currentPath += (i > 0 ? '/' : '') + parts[i];

          if (!fileStore.directories[currentPath]) {
            fileStore.createDirectory(currentPath);
          }
        }
      } else {
        fileStore.createDirectory(normalizedPath);
      }
    } catch (e) {
      error(`Error creating directory ${dirpath}:`, e);
      throw e;
    }
  }

  async readdir(dirpath: string): Promise<string[]> {
    try {
      const fileStore = this.getFileStore();
      const normalizedPath =
        dirpath === '/' ? '' : dirpath.startsWith('/') ? dirpath.slice(1) : dirpath;

      debug(`Reading directory: ${normalizedPath}`);

      const files: string[] = [];
      const prefix = normalizedPath ? `${normalizedPath}/` : '';

      // Add files in this directory
      for (const filepath in fileStore.files) {
        if (filepath.startsWith(prefix) && !filepath.slice(prefix.length).includes('/')) {
          files.push(filepath.slice(prefix.length));
        }
      }

      // Add directories in this directory
      for (const dirpath in fileStore.directories) {
        if (dirpath.startsWith(prefix) && !dirpath.slice(prefix.length).includes('/')) {
          files.push(dirpath.slice(prefix.length));
        }
      }

      return files;
    } catch (e) {
      error(`Error reading directory ${dirpath}:`, e);
      throw e;
    }
  }

  async stat(filepath: string): Promise<any> {
    try {
      const fileStore = this.getFileStore();
      const normalizedPath =
        filepath === '/' ? '' : filepath.startsWith('/') ? filepath.slice(1) : filepath;

      debug(`Stat: ${normalizedPath}`);

      // Check if it's a file
      if (fileStore.files[normalizedPath]) {
        const file = fileStore.files[normalizedPath];

        return {
          isFile: () => true,
          isDirectory: () => false,
          isSymbolicLink: () => false,
          size: file.content.length,
          mtime: new Date(file.lastModified || Date.now()),
        };
      }

      // Check if it's a directory
      if (fileStore.directories[normalizedPath] || normalizedPath === '') {
        return {
          isFile: () => false,
          isDirectory: () => true,
          isSymbolicLink: () => false,
          size: 0,
          mtime: new Date(),
        };
      }

      // Check if it's a file in a subdirectory
      const potentialFiles = Object.keys(fileStore.files).filter((path) =>
        path.startsWith(normalizedPath + '/'),
      );

      if (potentialFiles.length > 0) {
        return {
          isFile: () => false,
          isDirectory: () => true,
          isSymbolicLink: () => false,
          size: 0,
          mtime: new Date(),
        };
      }

      throw new Error(`ENOENT: no such file or directory, stat '${filepath}'`);
    } catch (e) {
      error(`Error stat ${filepath}:`, e);
      throw e;
    }
  }

  async unlink(filepath: string): Promise<void> {
    try {
      const fileStore = this.getFileStore();
      const normalizedPath = filepath.startsWith('/') ? filepath.slice(1) : filepath;

      debug(`Unlinking file: ${normalizedPath}`);

      fileStore.deleteFile(normalizedPath);
    } catch (e) {
      error(`Error unlinking file ${filepath}:`, e);
      throw e;
    }
  }

  async rmdir(dirpath: string): Promise<void> {
    try {
      const fileStore = this.getFileStore();
      const normalizedPath = dirpath.startsWith('/') ? dirpath.slice(1) : dirpath;

      debug(`Removing directory: ${normalizedPath}`);

      fileStore.deleteDirectory(normalizedPath);
    } catch (e) {
      error(`Error removing directory ${dirpath}:`, e);
      throw e;
    }
  }

  // These methods are stubs for compatibility with isomorphic-git
  async lstat(filepath: string): Promise<any> {
    return this.stat(filepath);
  }

  async readlink(filepath: string): Promise<string> {
    throw new Error('Symbolic links are not supported in browser environment');
  }

  async symlink(target: string, filepath: string): Promise<void> {
    throw new Error('Symbolic links are not supported in browser environment');
  }

  constructor() {
    // Initialize any required resources
  }

  private getFileStore() {
    return useFileStore.getState();
  }
}

/**
 * BrowserGitService implements the GitServiceInterface for browser environments
 * using the application's file store and database service.
 */
export class BrowserGitService implements GitServiceInterface {
  private fs: GitFileSystemAdapter;
  private workingDirectory: string;
  private branches: string[] = [];
  private _currentBranch: string = '';
  private stagedFiles: Map<string, string> = new Map(); // filepath -> content

  constructor(workingDirectory: string) {
    this.workingDirectory = workingDirectory || '/';
    this.fs = new GitFileSystemAdapter();
  }

  async init(defaultBranch: string): Promise<void> {
    // Use retryGitOperation for operations that might fail due to network or timing issues
    return retryGitOperation(async () => {
      try {
        info(`Initializing Git repository with default branch: ${defaultBranch}`);

        // Check if repository already exists
        try {
          const headExists = await this.fs.readFile('/.git/HEAD', { encoding: 'utf8' });
          if (headExists) {
            throw new GitError(
              GitErrorType.REPOSITORY_ALREADY_EXISTS,
              'Git repository already exists in this directory',
              undefined,
              false,
            );
          }
        } catch (e) {
          // If file doesn't exist, that's expected - continue with initialization
          if (!(e instanceof GitError)) {
            // Only ignore file not found errors
            if (!e.message.includes('ENOENT') && !e.message.includes('not found')) {
              throw e;
            }
          }
        }

        // Initialize repository using isomorphic-git
        await git.init({
          fs: this.fs,
          dir: this.workingDirectory,
          defaultBranch,
        });

        // Initialize branches
        this.branches = [defaultBranch];
        this._currentBranch = defaultBranch;

        // Store in database
        await databaseService.set('git:branches', this.branches);
        await databaseService.set('git:currentBranch', this._currentBranch);
      } catch (e) {
        error('Failed to initialize repository:', e);

        // Convert to GitError if it's not already
        if (!(e instanceof GitError)) {
          throw GitError.fromError(
            e instanceof Error ? e : new Error(String(e)),
            GitErrorType.REPOSITORY_NOT_INITIALIZED,
            `Failed to initialize Git repository: ${e.message}`,
          );
        }

        throw e;
      }
    });
  }

  async createInitialCommit(author: { name: string; email: string }): Promise<string> {
    try {
      info('Creating initial commit');

      // Create a README.md file if it doesn't exist
      try {
        await this.fs.stat('README.md');
      } catch (e) {
        // File doesn't exist, create it
        await this.fs.writeFile(
          'README.md',
          '# Git Repository\n\nInitialized with Remix IDE Clone',
        );
      }

      // Add README.md to staging
      await git.add({
        fs: this.fs,
        dir: this.workingDirectory,
        filepath: 'README.md',
      });

      // Create initial commit
      const commitResult = await git.commit({
        fs: this.fs,
        dir: this.workingDirectory,
        message: 'Initial commit',
        author: {
          name: author.name,
          email: author.email,
        },
      });

      // Store commit in database for compatibility with existing code
      const timestamp = Math.floor(Date.now() / 1000);
      await databaseService.set(`git:commit:${commitResult}`, {
        oid: commitResult,
        message: 'Initial commit',
        author: {
          name: author.name,
          email: author.email,
          timestamp,
        },
        parent: null,
      });

      return commitResult;
    } catch (e) {
      error('Failed to create initial commit:', e);
      throw e;
    }
  }

  async resetGitIndex(): Promise<void> {
    try {
      info('Resetting Git index');

      // Clear staged files
      this.stagedFiles.clear();

      // Clear database staging area
      await databaseService.delete('git:staging');
    } catch (e) {
      error('Failed to reset Git index:', e);
      throw e;
    }
  }

  async add(filepath: string): Promise<void> {
    return retryGitOperation(async () => {
      try {
        info(`Adding file to Git staging: ${filepath}`);

        // Check if repository is initialized
        if (!this._currentBranch) {
          throw new GitError(
            GitErrorType.REPOSITORY_NOT_INITIALIZED,
            'Git repository is not initialized',
            undefined,
            false,
          );
        }

        const normalizedPath = filepath.startsWith('/') ? filepath.slice(1) : filepath;

        // Check if file exists
        try {
          await this.fs.stat(normalizedPath);

          // Read file content
          const content = (await this.fs.readFile(normalizedPath, { encoding: 'utf8' })) as string;

          // Check if file should be stored in LFS
          let contentToStage = content;
          if (gitLFSService.shouldUseLFS(normalizedPath, content)) {
            info(`Using LFS for large file: ${normalizedPath}`);
            contentToStage = await gitLFSService.processFileForCommit(normalizedPath, content);

            // Write the LFS pointer file to the filesystem
            await this.fs.writeFile(normalizedPath, contentToStage, { encoding: 'utf8' });
          }

          // Add file to staging using isomorphic-git
          await git.add({
            fs: this.fs,
            dir: this.workingDirectory,
            filepath: normalizedPath,
          });

          // Add to staged files (using the pointer file content if LFS was used)
          this.stagedFiles.set(normalizedPath, contentToStage);

          // Store in database
          const staging = (await databaseService.get('git:staging')) || {};
          staging[normalizedPath] = contentToStage;
          await databaseService.set('git:staging', staging);

          // If we used LFS, restore the original content in the working directory
          if (contentToStage !== content) {
            await this.fs.writeFile(normalizedPath, content, { encoding: 'utf8' });
          }
        } catch (e) {
          // If file doesn't exist, throw a specific error
          if (e.message.includes('ENOENT') || e.message.includes('not found')) {
            throw new GitError(
              GitErrorType.FILE_NOT_FOUND,
              `File not found: ${filepath}`,
              e,
              false,
            );
          }

          // For other errors, rethrow
          throw e;
        }
      } catch (e) {
        error(`Failed to add file ${filepath}:`, e);

        // Convert to GitError if it's not already
        if (!(e instanceof GitError)) {
          throw GitError.fromError(
            e instanceof Error ? e : new Error(String(e)),
            GitErrorType.UNKNOWN_ERROR,
            `Failed to add file ${filepath}: ${e.message}`,
          );
        }

        throw e;
      }
    });
  }

  async unstage(filepath: string): Promise<void> {
    try {
      info(`Unstaging file: ${filepath}`);

      const normalizedPath = filepath.startsWith('/') ? filepath.slice(1) : filepath;

      // Remove from staged files
      this.stagedFiles.delete(normalizedPath);

      // Update database
      const staging = (await databaseService.get('git:staging')) || {};
      delete staging[normalizedPath];
      await databaseService.set('git:staging', staging);
    } catch (e) {
      error(`Failed to unstage file ${filepath}:`, e);
      throw e;
    }
  }

  async commit(message: string, author?: { name: string; email: string }): Promise<string> {
    return retryGitOperation(async () => {
      try {
        info(`Committing changes with message: ${message}`);

        // Check if repository is initialized
        if (!this._currentBranch) {
          throw new GitError(
            GitErrorType.REPOSITORY_NOT_INITIALIZED,
            'Git repository is not initialized',
            undefined,
            false,
          );
        }

        // Check if there are staged changes
        if (this.stagedFiles.size === 0) {
          throw new GitError(
            GitErrorType.NOTHING_TO_COMMIT,
            'Nothing to commit, working tree clean',
            undefined,
            false,
          );
        }

        // Validate commit message
        if (!message || message.trim() === '') {
          throw new GitError(
            GitErrorType.UNKNOWN_ERROR,
            'Commit message cannot be empty',
            undefined,
            false,
          );
        }

        if (!author) {
          author = {
            name: 'User',
            email: 'user@example.com',
          };
        }

        try {
          // Create commit using isomorphic-git
          const commitId = await git.commit({
            fs: this.fs,
            dir: this.workingDirectory,
            message,
            author: {
              name: author.name,
              email: author.email,
            },
          });

          // Get current branch HEAD for parent reference
          const currentHead = await this.getCurrentHead();

          // Store commit in database for compatibility with existing code
          const timestamp = Math.floor(Date.now() / 1000);
          await databaseService.set(`git:commit:${commitId}`, {
            oid: commitId,
            message,
            author: {
              name: author.name,
              email: author.email,
              timestamp,
            },
            parent: currentHead,
          });

          // Store file history
          for (const [filepath, content] of this.stagedFiles.entries()) {
            const fileHistory = (await databaseService.get(`git:file:${filepath}`)) || {};
            fileHistory[commitId] = content;
            await databaseService.set(`git:file:${filepath}`, fileHistory);
          }

          // Clear staging area
          await this.resetGitIndex();

          return commitId;
        } catch (e) {
          error('Error during commit:', e);
          throw e;
        }
      } catch (e) {
        error('Failed to commit changes:', e);

        // Convert to GitError if it's not already
        if (!(e instanceof GitError)) {
          throw GitError.fromError(
            e instanceof Error ? e : new Error(String(e)),
            GitErrorType.UNKNOWN_ERROR,
            `Failed to commit changes: ${e.message}`,
          );
        }

        throw e;
      }
    });
  }

  async status(options?: { skip?: number; limit?: number; filter?: string }): Promise<{
    files: Array<{ file: string; status: string }>;
    hasMore: boolean;
    total: number;
  }> {
    try {
      info('Getting repository status');

      const skip = options?.skip || 0;
      const limit = options?.limit || 100;
      const filter = options?.filter || '';

      // Get status using isomorphic-git
      const statusMatrix = await git.statusMatrix({
        fs: this.fs,
        dir: this.workingDirectory,
        filepaths: filter ? [filter] : undefined,
      });

      // Convert status matrix to our format
      // statusMatrix returns an array of arrays, each containing:
      // [filepath, HEAD, WORKDIR, STAGE]
      // where each number is 0 (absent), 1 (unchanged), or 2 (modified)
      const statusList: Array<{ file: string; status: string }> = [];

      for (const [filepath, head, workdir, stage] of statusMatrix) {
        // Skip .git directory files
        if (filepath.startsWith('.git/')) {
          continue;
        }

        let status: string;

        if (head === 0 && workdir === 2 && stage === 0) {
          status = 'untracked';
        } else if (head === 1 && workdir === 2 && stage === 0) {
          status = 'modified';
        } else if (stage === 2) {
          status = 'staged';
        } else if (head === 1 && workdir === 0) {
          status = 'deleted';
        } else {
          status = 'unchanged';
        }

        // Only add files with changes
        if (status !== 'unchanged') {
          statusList.push({ file: filepath, status });
        }
      }

      // Apply pagination
      const total = statusList.length;
      const paginatedList = statusList.slice(skip, skip + limit);
      const hasMore = skip + limit < total;

      return {
        files: paginatedList,
        hasMore,
        total,
      };
    } catch (e) {
      error('Failed to get status:', e);
      throw e;
    }
  }

  async listBranches(): Promise<string[]> {
    try {
      info('Listing branches');

      // Get branches using isomorphic-git
      const branches = await git.listBranches({
        fs: this.fs,
        dir: this.workingDirectory,
      });

      // Update internal branches list
      this.branches = branches;

      // Store in database for compatibility with existing code
      await databaseService.set('git:branches', this.branches);

      return branches;
    } catch (e) {
      error('Failed to list branches:', e);
      throw e;
    }
  }

  async currentBranch(): Promise<string> {
    try {
      info('Getting current branch');

      // Get current branch using isomorphic-git
      const branch = await git.currentBranch({
        fs: this.fs,
        dir: this.workingDirectory,
        fullname: false,
      });

      // Update internal current branch
      this._currentBranch = branch || '';

      // Store in database for compatibility with existing code
      await databaseService.set('git:currentBranch', this._currentBranch);

      return this._currentBranch;
    } catch (e) {
      error('Failed to get current branch:', e);
      throw e;
    }
  }

  async branch(name: string): Promise<void> {
    try {
      info(`Creating branch: ${name}`);

      if (this.branches.includes(name)) {
        throw new Error(`Branch ${name} already exists`);
      }

      // Create branch using isomorphic-git
      await git.branch({
        fs: this.fs,
        dir: this.workingDirectory,
        ref: name,
        checkout: false,
      });

      // Update branches list
      await this.listBranches();
    } catch (e) {
      error(`Failed to create branch ${name}:`, e);
      throw e;
    }
  }

  async checkout(ref: string): Promise<void> {
    try {
      info(`Checking out: ${ref}`);

      if (!this.branches.includes(ref)) {
        throw new Error(`Branch ${ref} does not exist`);
      }

      // Get the list of files before checkout to compare later
      const filesBeforeCheckout = new Set<string>();
      try {
        const { files } = await this.status();
        for (const file of files) {
          filesBeforeCheckout.add(file.file);
        }
      } catch (statusErr) {
        warn(`Failed to get status before checkout: ${statusErr.message}`);
      }

      // Checkout branch using isomorphic-git
      await git.checkout({
        fs: this.fs,
        dir: this.workingDirectory,
        ref,
      });

      // Update current branch
      await this.currentBranch();

      // Process LFS files after checkout
      try {
        // Get all files in the working directory
        const { files } = await this.status();

        for (const file of files) {
          const filepath = file.file;

          try {
            // Read the file content
            const content = (await this.fs.readFile(filepath, { encoding: 'utf8' })) as string;

            // Check if it's an LFS pointer file
            if (gitLFSService.isLFSPointer(content)) {
              info(`Found LFS pointer file: ${filepath}`);

              // Retrieve the actual content from LFS
              const actualContent = await gitLFSService.processFileAfterCheckout(filepath, content);

              if (actualContent && actualContent !== content) {
                // Write the actual content back to the file
                await this.fs.writeFile(filepath, actualContent, { encoding: 'utf8' });
                info(`Restored LFS file content for: ${filepath}`);
              } else {
                warn(`Could not retrieve LFS content for: ${filepath}`);
              }
            }
          } catch (fileErr) {
            warn(`Failed to process potential LFS file ${filepath}: ${fileErr.message}`);
          }
        }
      } catch (lfsErr) {
        warn(`Failed to process LFS files after checkout: ${lfsErr.message}`);
      }
    } catch (e) {
      error(`Failed to checkout ${ref}:`, e);
      throw e;
    }
  }

  async deleteBranch(name: string): Promise<void> {
    try {
      info(`Deleting branch: ${name}`);

      if (!this.branches.includes(name)) {
        throw new Error(`Branch ${name} does not exist`);
      }

      if (name === this._currentBranch) {
        throw new Error('Cannot delete the current branch');
      }

      // Delete branch using isomorphic-git
      await git.deleteBranch({
        fs: this.fs,
        dir: this.workingDirectory,
        ref: name,
      });

      // Update branches list
      await this.listBranches();
    } catch (e) {
      error(`Failed to delete branch ${name}:`, e);
      throw e;
    }
  }

  async log(options?: { skip?: number; limit?: number; filepath?: string }): Promise<{
    commits: Array<{
      oid: string;
      message: string;
      author: { name: string; email: string; timestamp: number };
    }>;
    hasMore: boolean;
  }> {
    try {
      info('Getting commit history');

      const skip = options?.skip || 0;
      const limit = options?.limit || 100;
      const filepath = options?.filepath;

      // Get log using isomorphic-git
      const logOptions: any = {
        fs: this.fs,
        dir: this.workingDirectory,
        depth: skip + limit + 1, // +1 to check if there are more commits
      };

      if (filepath) {
        logOptions.filepath = filepath;
      }

      const commits = await git.log(logOptions);

      // Format commits to match our expected format
      const formattedCommits = commits.slice(skip, skip + limit).map((commit) => ({
        oid: commit.oid,
        message: commit.commit.message,
        author: {
          name: commit.commit.author.name,
          email: commit.commit.author.email,
          timestamp: commit.commit.author.timestamp,
        },
      }));

      // Store commits in database for compatibility with existing code
      for (const commit of formattedCommits) {
        await databaseService.set(`git:commit:${commit.oid}`, {
          oid: commit.oid,
          message: commit.message,
          author: commit.author,
          parent: null, // We don't have parent information from isomorphic-git's log
        });
      }

      return {
        commits: formattedCommits,
        hasMore: commits.length > skip + limit,
      };
    } catch (e) {
      error('Failed to get commit history:', e);
      throw e;
    }
  }

  async getFileBlame(filepath: string): Promise<
    Array<{
      oid: string;
      author: string;
      date: string;
      line: number;
      content: string;
    }>
  > {
    try {
      info(`Getting blame for file: ${filepath}`);

      const normalizedPath = filepath.startsWith('/') ? filepath.slice(1) : filepath;

      // Get file content
      const content = (await this.fs.readFile(normalizedPath, { encoding: 'utf8' })) as string;
      const lines = content.split('\n');

      try {
        // Get blame using isomorphic-git
        const blame = await git.blame({
          fs: this.fs,
          dir: this.workingDirectory,
          filepath: normalizedPath,
        });

        // Format blame to match our expected format
        return blame.map((blameInfo, index) => ({
          oid: blameInfo.oid,
          author: `${blameInfo.author.name} <${blameInfo.author.email}>`,
          date: new Date(blameInfo.author.timestamp * 1000).toISOString(),
          line: index + 1,
          content: lines[index] || '',
        }));
      } catch (blameError) {
        // If blame fails (e.g., for new files), fall back to simple implementation
        warn(`Blame failed for ${filepath}, using fallback:`, blameError);

        // Get file history
        const history = await this.getFileHistory(normalizedPath);

        if (history.length === 0) {
          // No history, blame everything on the current state
          return lines.map((line, index) => ({
            oid: 'working',
            author: 'Unknown',
            date: new Date().toISOString(),
            line: index + 1,
            content: line,
          }));
        }

        // Start with the most recent commit
        const latestCommit = history[0];

        // Simple implementation: blame everything on the latest commit
        return lines.map((line, index) => ({
          oid: latestCommit.oid,
          author: `${latestCommit.author.name} <${latestCommit.author.email}>`,
          date: new Date(latestCommit.author.timestamp * 1000).toISOString(),
          line: index + 1,
          content: line,
        }));
      }
    } catch (e) {
      error(`Failed to get blame for file ${filepath}:`, e);
      throw e;
    }
  }

  async getFileHistory(filepath: string): Promise<
    Array<{
      oid: string;
      message: string;
      author: { name: string; email: string; timestamp: number };
    }>
  > {
    try {
      info(`Getting history for file: ${filepath}`);

      const normalizedPath = filepath.startsWith('/') ? filepath.slice(1) : filepath;

      // Use log with filepath to get file history
      const commits = await git.log({
        fs: this.fs,
        dir: this.workingDirectory,
        filepath: normalizedPath,
      });

      // Format commits to match our expected format
      const formattedCommits = commits.map((commit) => ({
        oid: commit.oid,
        message: commit.commit.message,
        author: {
          name: commit.commit.author.name,
          email: commit.commit.author.email,
          timestamp: commit.commit.author.timestamp,
        },
      }));

      // Store file history in database for compatibility with existing code
      const fileHistory: Record<string, string> = {};
      for (const commit of formattedCommits) {
        try {
          // Get file content at this commit
          const { blob } = await git.readBlob({
            fs: this.fs,
            dir: this.workingDirectory,
            oid: commit.oid,
            filepath: normalizedPath,
          });

          // Convert blob to string
          const content = new TextDecoder().decode(blob);
          fileHistory[commit.oid] = content;
        } catch (readError) {
          // If we can't read the file at this commit, skip it
          warn(`Could not read file ${normalizedPath} at commit ${commit.oid}:`, readError);
        }
      }

      // Store file history in database
      await databaseService.set(`git:file:${normalizedPath}`, fileHistory);

      return formattedCommits;
    } catch (e) {
      error(`Failed to get history for file ${filepath}:`, e);
      throw e;
    }
  }

  async getFileDiff(
    filepath: string,
    oldOid: string,
    newOid: string,
  ): Promise<
    Array<{
      type: string;
      oldStart: number;
      oldLines: number;
      newStart: number;
      newLines: number;
      content: string;
    }>
  > {
    try {
      info(`Getting diff for file: ${filepath} between ${oldOid} and ${newOid}`);

      const normalizedPath = filepath.startsWith('/') ? filepath.slice(1) : filepath;

      // Get old content
      let oldContent = '';
      if (oldOid !== '0000000000000000000000000000000000000000') {
        try {
          // Get file content from the old commit using isomorphic-git
          const { blob } = await git.readBlob({
            fs: this.fs,
            dir: this.workingDirectory,
            oid: oldOid,
            filepath: normalizedPath,
          });
          oldContent = new TextDecoder().decode(blob);
        } catch (readError) {
          warn(`Could not read file ${normalizedPath} at commit ${oldOid}:`, readError);
          // Fall back to database
          const fileHistory = (await databaseService.get(`git:file:${normalizedPath}`)) || {};
          oldContent = fileHistory[oldOid] || '';
        }
      }

      // Get new content
      let newContent = '';
      if (newOid === 'working') {
        // Get current working copy
        newContent = (await this.fs.readFile(normalizedPath, { encoding: 'utf8' })) as string;
      } else if (newOid !== '0000000000000000000000000000000000000000') {
        try {
          // Get file content from the new commit using isomorphic-git
          const { blob } = await git.readBlob({
            fs: this.fs,
            dir: this.workingDirectory,
            oid: newOid,
            filepath: normalizedPath,
          });
          newContent = new TextDecoder().decode(blob);
        } catch (readError) {
          warn(`Could not read file ${normalizedPath} at commit ${newOid}:`, readError);
          // Fall back to database
          const fileHistory = (await databaseService.get(`git:file:${normalizedPath}`)) || {};
          newContent = fileHistory[newOid] || '';
        }
      }

      // Split into lines
      const oldLines = oldContent.split('\n');
      const newLines = newContent.split('\n');

      // Use isomorphic-git's diff algorithm if available
      try {
        // Get diff using isomorphic-git
        const patches = await git.diff({
          fs: this.fs,
          dir: this.workingDirectory,
          filepaths: [normalizedPath],
          oldRef: oldOid,
          newRef: newOid === 'working' ? undefined : newOid,
        });

        if (patches.length === 0) {
          return [];
        }

        // Convert patches to our format
        return patches.flatMap((patch) => {
          return patch.hunks.map((hunk) => ({
            type: 'change',
            oldStart: hunk.oldStart,
            oldLines: hunk.oldLines,
            newStart: hunk.newStart,
            newLines: hunk.newLines,
            content: `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@\n${hunk.lines.join('\n')}`,
          }));
        });
      } catch (diffError) {
        warn(`Could not get diff using isomorphic-git, falling back to simple diff:`, diffError);

        // Simple diff implementation as fallback
        if (oldContent === newContent) {
          return [];
        }

        // If one side is empty, show the entire other side as added/removed
        if (!oldContent) {
          return [
            {
              type: 'add',
              oldStart: 0,
              oldLines: 0,
              newStart: 1,
              newLines: newLines.length,
              content: newContent,
            },
          ];
        }

        if (!newContent) {
          return [
            {
              type: 'remove',
              oldStart: 1,
              oldLines: oldLines.length,
              newStart: 0,
              newLines: 0,
              content: oldContent,
            },
          ];
        }

        // Simple full file diff
        return [
          {
            type: 'change',
            oldStart: 1,
            oldLines: oldLines.length,
            newStart: 1,
            newLines: newLines.length,
            content: `--- a/${normalizedPath}\n+++ b/${normalizedPath}\n@@ -1,${oldLines.length} +1,${newLines.length} @@\n${this.generateUnifiedDiff(oldLines, newLines)}`,
          },
        ];
      }
    } catch (e) {
      error(`Failed to get diff for file ${filepath}:`, e);
      throw e;
    }
  }

  async createStash(message: string): Promise<string> {
    try {
      info(`Creating stash: ${message}`);

      try {
        // Try to use isomorphic-git's stash functionality if available
        await git.stash({
          fs: this.fs,
          dir: this.workingDirectory,
          message,
        });

        // Get the stash ID from the reflog
        const reflog = await git.log({
          fs: this.fs,
          dir: this.workingDirectory,
          ref: 'refs/stash',
        });

        if (reflog.length > 0) {
          return reflog[0].oid;
        }
      } catch (stashError) {
        warn(
          'Failed to use isomorphic-git stash, falling back to custom implementation:',
          stashError,
        );
      }

      // Fall back to custom implementation
      // Generate stash ID
      const stashId = this.generateOid();

      // Get staged files
      const staged = Array.from(this.stagedFiles.entries());

      // Store stash in database
      await databaseService.set(`git:stash:${stashId}`, {
        id: stashId,
        message,
        date: new Date().toISOString(),
        files: Object.fromEntries(staged),
      });

      // Add to stash list
      const stashes = (await databaseService.get('git:stashes')) || [];
      stashes.unshift(stashId);
      await databaseService.set('git:stashes', stashes);

      // Clear staging area
      await this.resetGitIndex();

      return stashId;
    } catch (e) {
      error(`Failed to create stash: ${e}`);
      throw e;
    }
  }

  async listStashes(): Promise<
    Array<{
      id: string;
      message: string;
      date: string;
    }>
  > {
    try {
      info('Listing stashes');

      try {
        // Try to use isomorphic-git's stash functionality if available
        const reflog = await git.log({
          fs: this.fs,
          dir: this.workingDirectory,
          ref: 'refs/stash',
        });

        if (reflog.length > 0) {
          return reflog.map((entry) => ({
            id: entry.oid,
            message: entry.commit.message.replace(/^WIP on .+: /, ''),
            date: new Date(entry.commit.author.timestamp * 1000).toISOString(),
          }));
        }
      } catch (stashError) {
        warn(
          'Failed to use isomorphic-git stash list, falling back to custom implementation:',
          stashError,
        );
      }

      // Fall back to custom implementation
      // Get stash list
      const stashIds = (await databaseService.get('git:stashes')) || [];

      // Get stash details
      const stashes: Array<{
        id: string;
        message: string;
        date: string;
      }> = [];

      for (const stashId of stashIds) {
        const stash = await databaseService.get(`git:stash:${stashId}`);

        if (stash) {
          stashes.push({
            id: stash.id,
            message: stash.message,
            date: stash.date,
          });
        }
      }

      return stashes;
    } catch (e) {
      error('Failed to list stashes:', e);
      throw e;
    }
  }

  async applyStash(stashId: string): Promise<void> {
    try {
      info(`Applying stash: ${stashId}`);

      try {
        // Try to use isomorphic-git's stash functionality if available
        await git.stashApply({
          fs: this.fs,
          dir: this.workingDirectory,
          stashRef: stashId,
        });
        return;
      } catch (stashError) {
        warn(
          'Failed to use isomorphic-git stash apply, falling back to custom implementation:',
          stashError,
        );
      }

      // Fall back to custom implementation
      const stash = await databaseService.get(`git:stash:${stashId}`);
      if (!stash) {
        throw new Error(`Stash ${stashId} not found`);
      }

      // Apply each file in the stash
      for (const [filepath, content] of Object.entries(stash.files)) {
        await this.fs.writeFile(filepath, content, { encoding: 'utf8' });
      }
    } catch (e) {
      error(`Failed to apply stash ${stashId}:`, e);
      throw e;
    }
  }

  async dropStash(stashId: string): Promise<void> {
    try {
      info(`Dropping stash: ${stashId}`);

      try {
        // Try to use isomorphic-git's stash functionality if available
        await git.stashDrop({
          fs: this.fs,
          dir: this.workingDirectory,
          stashRef: stashId,
        });
        return;
      } catch (stashError) {
        warn(
          'Failed to use isomorphic-git stash drop, falling back to custom implementation:',
          stashError,
        );
      }

      // Fall back to custom implementation
      // Remove from stash list
      const stashes = (await databaseService.get('git:stashes')) || [];
      const index = stashes.indexOf(stashId);
      if (index !== -1) {
        stashes.splice(index, 1);
        await databaseService.set('git:stashes', stashes);
      }

      // Remove stash from database
      await databaseService.delete(`git:stash:${stashId}`);
    } catch (e) {
      error(`Failed to drop stash ${stashId}:`, e);
      throw e;
    }
  }

  syncBranches(branches: string[], currentBranch: string): void {
    this.branches = branches;
    this._currentBranch = currentBranch;
  }

  // Helper methods
  private async getAllFiles(): Promise<string[]> {
    const fileStore = useFileStore.getState();
    return Object.keys(fileStore.files);
  }

  private async isFileModified(filepath: string): Promise<boolean> {
    // This is a simplified implementation
    // In a real implementation, this would compare with the file in the last commit
    return true;
  }

  private async getCurrentHead(): Promise<string | null> {
    try {
      // Read HEAD file
      const head = (await this.fs.readFile('/.git/HEAD', { encoding: 'utf8' })) as string;

      // Parse reference
      const match = head.match(/^ref: refs\/heads\/(.+)$/);

      if (match) {
        const branch = match[1];

        try {
          // Read branch reference
          const ref = (await this.fs.readFile(`/.git/refs/heads/${branch}`, {
            encoding: 'utf8',
          })) as string;
          return ref.trim();
        } catch (e) {
          // Branch reference doesn't exist yet
          return null;
        }
      }

      // Direct commit reference
      return head.trim() || null;
    } catch (e) {
      // HEAD doesn't exist yet
      return null;
    }
  }

  private generateOid(): string {
    // Generate a random SHA-1-like hash
    const chars = '0123456789abcdef';
    let oid = '';

    for (let i = 0; i < 40; i++) {
      oid += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return oid;
  }

  private generateUnifiedDiff(oldLines: string[], newLines: string[]): string {
    let result = '';

    // Very simple diff: just show old lines with - and new lines with +
    for (const line of oldLines) {
      result += `-${line}\n`;
    }

    for (const line of newLines) {
      result += `+${line}\n`;
    }

    return result;
  }
}
