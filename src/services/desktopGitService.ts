import type { GitServiceInterface } from './gitServiceInterface';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { debug, error, info, warn } from '@/services/loggerService';
import { GitError, GitErrorType, retryGitOperation } from './gitError';

const execAsync = promisify(exec);
const fsPromises = fs.promises;

/**
 * DesktopGitService implements the GitServiceInterface for desktop environments
 * using native Git commands via child_process.
 */
export class DesktopGitService implements GitServiceInterface {
  private workingDirectory: string;
  private branches: string[] = [];
  private _currentBranch: string = '';

  constructor(workingDirectory: string) {
    this.workingDirectory = workingDirectory || process.cwd();
  }

  async init(defaultBranch: string): Promise<void> {
    return retryGitOperation(async () => {
      try {
        info(`Initializing Git repository with default branch: ${defaultBranch}`);

        // Check if repository already exists
        try {
          const { stdout } = await this.execGit('rev-parse --is-inside-work-tree');
          if (stdout.trim() === 'true') {
            throw new GitError(
              GitErrorType.REPOSITORY_ALREADY_EXISTS,
              'Git repository already exists in this directory',
              undefined,
              false,
            );
          }
        } catch (e) {
          // If the command fails, it's not a git repository, which is what we want
          if (!(e instanceof GitError) && !e.message.includes('not a git repository')) {
            throw e;
          }
        }

        // Initialize repository with specified default branch
        await this.execGit(`init -b ${defaultBranch}`);

        // Initialize branches
        this.branches = [defaultBranch];
        this._currentBranch = defaultBranch;

        // Configure Git to not require user.name and user.email for operations
        // This is useful for automated testing and initial setup
        await this.execGit('config --local user.name "Remix IDE Clone"');
        await this.execGit('config --local user.email "remix@example.com"');
      } catch (e) {
        error('Failed to initialize repository:', e);

        // Convert to GitError if it's not already
        if (!(e instanceof GitError)) {
          // Check for common error patterns
          if (e.message.includes('Permission denied')) {
            throw new GitError(
              GitErrorType.FILE_PERMISSION_DENIED,
              'Permission denied when initializing Git repository',
              e,
              false,
            );
          } else {
            throw GitError.fromError(
              e instanceof Error ? e : new Error(String(e)),
              GitErrorType.REPOSITORY_NOT_INITIALIZED,
              `Failed to initialize Git repository: ${e.message}`,
            );
          }
        }

        throw e;
      }
    });
  }

  async createInitialCommit(author: { name: string; email: string }): Promise<string> {
    try {
      info('Creating initial commit');

      // Create an empty README.md file if it doesn't exist
      const readmePath = path.join(this.workingDirectory, 'README.md');
      if (!fs.existsSync(readmePath)) {
        await fsPromises.writeFile(
          readmePath,
          '# Git Repository\n\nInitialized with Remix IDE Clone',
        );
      }

      // Set author configuration
      await this.execGit(`config user.name "${author.name}"`);
      await this.execGit(`config user.email "${author.email}"`);

      // Add and commit
      await this.execGit('add README.md');
      const { stdout } = await this.execGit('commit -m "Initial commit"');

      // Extract commit hash
      const match = stdout.match(/\[.+\s+([a-f0-9]+)\]/);
      const commitId = match ? match[1] : '';

      return commitId;
    } catch (e) {
      error('Failed to create initial commit:', e);
      throw e;
    }
  }

  async resetGitIndex(): Promise<void> {
    try {
      info('Resetting Git index');

      await this.execGit('reset');
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
        try {
          const { stdout } = await this.execGit('rev-parse --is-inside-work-tree');
          if (stdout.trim() !== 'true') {
            throw new GitError(
              GitErrorType.REPOSITORY_NOT_INITIALIZED,
              'Git repository is not initialized',
              undefined,
              false,
            );
          }
        } catch (e) {
          if (e.message.includes('not a git repository')) {
            throw new GitError(
              GitErrorType.REPOSITORY_NOT_INITIALIZED,
              'Git repository is not initialized',
              e,
              false,
            );
          }
          throw e;
        }

        // Check if file exists
        try {
          await fsPromises.access(path.join(this.workingDirectory, filepath), fs.constants.F_OK);
        } catch (e) {
          throw new GitError(GitErrorType.FILE_NOT_FOUND, `File not found: ${filepath}`, e, false);
        }

        // Add file to staging
        await this.execGit(`add "${filepath}"`);
      } catch (e) {
        error(`Failed to add file ${filepath}:`, e);

        // Convert to GitError if it's not already
        if (!(e instanceof GitError)) {
          // Check for common error patterns
          if (e.message.includes('Permission denied')) {
            throw new GitError(
              GitErrorType.FILE_PERMISSION_DENIED,
              `Permission denied when adding file: ${filepath}`,
              e,
              false,
            );
          } else if (e.message.includes('did not match any files')) {
            throw new GitError(
              GitErrorType.FILE_NOT_FOUND,
              `File not found: ${filepath}`,
              e,
              false,
            );
          } else {
            throw GitError.fromError(
              e instanceof Error ? e : new Error(String(e)),
              GitErrorType.UNKNOWN_ERROR,
              `Failed to add file ${filepath}: ${e.message}`,
            );
          }
        }

        throw e;
      }
    });
  }

  async unstage(filepath: string): Promise<void> {
    try {
      info(`Unstaging file: ${filepath}`);

      await this.execGit(`reset -- "${filepath}"`);
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
        try {
          const { stdout } = await this.execGit('rev-parse --is-inside-work-tree');
          if (stdout.trim() !== 'true') {
            throw new GitError(
              GitErrorType.REPOSITORY_NOT_INITIALIZED,
              'Git repository is not initialized',
              undefined,
              false,
            );
          }
        } catch (e) {
          if (e.message.includes('not a git repository')) {
            throw new GitError(
              GitErrorType.REPOSITORY_NOT_INITIALIZED,
              'Git repository is not initialized',
              e,
              false,
            );
          }
          throw e;
        }

        // Check if there are staged changes
        const { stdout: statusOutput } = await this.execGit('status --porcelain');
        if (!statusOutput.trim()) {
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

        // Build commit command
        let command = `commit -m "${message}"`;

        if (author) {
          command += ` --author="${author.name} <${author.email}>"`;
        }

        // Execute commit command
        const { stdout } = await this.execGit(command);

        // Extract commit hash
        const match = stdout.match(/\[.+\s+([a-f0-9]+)\]/);
        if (!match) {
          throw new GitError(
            GitErrorType.UNKNOWN_ERROR,
            'Failed to extract commit hash from Git output',
            undefined,
            true, // This is retryable as it might be a parsing issue
          );
        }

        const commitId = match[1];

        // Update current branch and branches list after commit
        await this.currentBranch();
        await this.listBranches();

        return commitId;
      } catch (e) {
        error('Failed to commit changes:', e);

        // Convert to GitError if it's not already
        if (!(e instanceof GitError)) {
          // Check for common error patterns
          if (e.message.includes('nothing to commit')) {
            throw new GitError(
              GitErrorType.NOTHING_TO_COMMIT,
              'Nothing to commit, working tree clean',
              e,
              false,
            );
          } else if (e.message.includes('Permission denied')) {
            throw new GitError(
              GitErrorType.FILE_PERMISSION_DENIED,
              'Permission denied when committing changes',
              e,
              false,
            );
          } else if (e.message.includes('please tell me who you are')) {
            throw new GitError(
              GitErrorType.UNKNOWN_ERROR,
              'Git user name and email not configured. Please configure them using git config.',
              e,
              false,
            );
          } else {
            throw GitError.fromError(
              e instanceof Error ? e : new Error(String(e)),
              GitErrorType.UNKNOWN_ERROR,
              `Failed to commit changes: ${e.message}`,
            );
          }
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

      const { stdout } = await this.execGit('status --porcelain');

      // Parse status output
      const statusList: Array<{ file: string; status: string }> = [];
      const lines = stdout.split('\n').filter(Boolean);

      for (const line of lines) {
        const statusCode = line.substring(0, 2).trim();
        const filepath = line.substring(3);

        if (options?.filter && !filepath.includes(options.filter)) {
          continue;
        }

        let status: string;

        if (statusCode === 'M') {
          status = 'modified';
        } else if (statusCode === 'A') {
          status = 'staged';
        } else if (statusCode === 'D') {
          status = 'deleted';
        } else if (statusCode === '??') {
          status = 'untracked';
        } else if (statusCode === 'R') {
          status = 'renamed';
        } else {
          status = 'unknown';
        }

        statusList.push({ file: filepath, status });
      }

      // Apply pagination
      const skip = options?.skip || 0;
      const limit = options?.limit || 100;
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

      const { stdout } = await this.execGit('branch');

      // Parse branch output
      this.branches = stdout
        .split('\n')
        .filter(Boolean)
        .map((branch) => branch.replace(/^\*\s+/, '').trim());

      return this.branches;
    } catch (e) {
      error('Failed to list branches:', e);
      throw e;
    }
  }

  async currentBranch(): Promise<string> {
    try {
      info('Getting current branch');

      const { stdout } = await this.execGit('branch --show-current');

      this._currentBranch = stdout.trim();

      return this._currentBranch;
    } catch (e) {
      error('Failed to get current branch:', e);
      throw e;
    }
  }

  async branch(name: string): Promise<void> {
    try {
      info(`Creating branch: ${name}`);

      await this.execGit(`branch "${name}"`);

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

      await this.execGit(`checkout "${ref}"`);

      // Update current branch
      await this.currentBranch();
    } catch (e) {
      error(`Failed to checkout ${ref}:`, e);
      throw e;
    }
  }

  async deleteBranch(name: string): Promise<void> {
    try {
      info(`Deleting branch: ${name}`);

      await this.execGit(`branch -D "${name}"`);

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

      let command = `log --pretty=format:"%H|%an|%ae|%at|%s" --skip=${skip} --max-count=${limit + 1}`;

      if (filepath) {
        command += ` -- "${filepath}"`;
      }

      const { stdout } = await this.execGit(command);

      // Parse log output
      const lines = stdout.split('\n').filter(Boolean);
      const hasMore = lines.length > limit;
      const commits = lines.slice(0, limit).map((line) => {
        const [oid, name, email, timestamp, message] = line.split('|');

        return {
          oid,
          message,
          author: {
            name,
            email,
            timestamp: parseInt(timestamp, 10),
          },
        };
      });

      return {
        commits,
        hasMore,
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

      const { stdout } = await this.execGit(`blame -p "${filepath}"`);

      // Parse blame output
      const lines = stdout.split('\n');
      const blame: Array<{
        oid: string;
        author: string;
        date: string;
        line: number;
        content: string;
      }> = [];

      let currentOid = '';
      let currentAuthor = '';
      let currentDate = '';
      let currentLine = 0;
      let currentContent = '';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.startsWith('\t')) {
          // Content line
          currentContent = line.substring(1);

          blame.push({
            oid: currentOid,
            author: currentAuthor,
            date: currentDate,
            line: currentLine,
            content: currentContent,
          });

          currentLine++;
        } else if (line.match(/^[a-f0-9]{40} /)) {
          // Header line
          const parts = line.split(' ');
          currentOid = parts[0];
          currentLine = parseInt(parts[2], 10);
        } else if (line.startsWith('author ')) {
          currentAuthor = line.substring(7);
        } else if (line.startsWith('author-time ')) {
          const timestamp = parseInt(line.substring(12), 10);
          currentDate = new Date(timestamp * 1000).toISOString();
        }
      }

      return blame;
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

      // Use log with filepath
      return (await this.log({ filepath })).commits;
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

      let command = '';

      if (newOid === 'working') {
        // Diff between commit and working copy
        command = `diff ${oldOid} -- "${filepath}"`;
      } else {
        // Diff between two commits
        command = `diff ${oldOid} ${newOid} -- "${filepath}"`;
      }

      const { stdout } = await this.execGit(command);

      if (!stdout.trim()) {
        return [];
      }

      // Parse diff output
      const diffChunks: Array<{
        type: string;
        oldStart: number;
        oldLines: number;
        newStart: number;
        newLines: number;
        content: string;
      }> = [];

      const lines = stdout.split('\n');
      let currentChunk: {
        type: string;
        oldStart: number;
        oldLines: number;
        newStart: number;
        newLines: number;
        content: string;
      } | null = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.startsWith('@@')) {
          // New chunk
          if (currentChunk) {
            diffChunks.push(currentChunk);
          }

          const match = line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);

          if (match) {
            const oldStart = parseInt(match[1], 10);
            const oldLines = match[2] ? parseInt(match[2], 10) : 1;
            const newStart = parseInt(match[3], 10);
            const newLines = match[4] ? parseInt(match[4], 10) : 1;

            currentChunk = {
              type: 'change',
              oldStart,
              oldLines,
              newStart,
              newLines,
              content: line + '\n',
            };
          }
        } else if (currentChunk) {
          // Add line to current chunk
          currentChunk.content += line + '\n';
        }
      }

      if (currentChunk) {
        diffChunks.push(currentChunk);
      }

      return diffChunks;
    } catch (e) {
      error(`Failed to get diff for file ${filepath}:`, e);
      throw e;
    }
  }

  async createStash(message: string): Promise<string> {
    try {
      info(`Creating stash: ${message}`);

      const { stdout } = await this.execGit(`stash push -m "${message}"`);

      // Extract stash ID
      const match = stdout.match(
        /Saved working directory and index state (?:On|WIP on) (.+): (.+)/,
      );
      const stashId = match ? match[2] : '';

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

      const { stdout } = await this.execGit('stash list --pretty=format:"%gd|%cr|%s"');

      // Parse stash list
      const stashes: Array<{
        id: string;
        message: string;
        date: string;
      }> = [];

      const lines = stdout.split('\n').filter(Boolean);

      for (const line of lines) {
        const [id, date, message] = line.split('|');

        stashes.push({
          id: id.replace(/^stash@{(\d+)}$/, '$1'),
          message,
          date,
        });
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

      await this.execGit(`stash apply stash@{${stashId}}`);
    } catch (e) {
      error(`Failed to apply stash ${stashId}:`, e);
      throw e;
    }
  }

  async dropStash(stashId: string): Promise<void> {
    try {
      info(`Dropping stash: ${stashId}`);

      await this.execGit(`stash drop stash@{${stashId}}`);
    } catch (e) {
      error(`Failed to drop stash ${stashId}:`, e);
      throw e;
    }
  }

  syncBranches(branches: string[], currentBranch: string): void {
    this.branches = branches;
    this._currentBranch = currentBranch;
  }

  // Helper method to execute Git commands
  private async execGit(command: string): Promise<{ stdout: string; stderr: string }> {
    try {
      debug(`Executing Git command: ${command}`);

      return await execAsync(`git ${command}`, { cwd: this.workingDirectory });
    } catch (e) {
      error(`Git command failed: ${command}`, e);
      throw e;
    }
  }
}
