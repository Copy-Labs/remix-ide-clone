import type { Plugin, PluginConfig } from '@/types';
import { useGitStore } from '@/stores/gitStore';

/**
 * Git integration plugin for Remix IDE Clone
 * Provides basic Git functionality like initializing a repository,
 * committing changes, and pushing to remote repositories.
 */
export const gitPlugin: Omit<Plugin, 'api'> = {
  id: 'git-integration',
  name: 'Git Integration',
  version: '1.0.0',
  description: 'Provides Git integration for managing your smart contract versions',
  author: 'Remix IDE Clone Team',
  enabled: false,
  config: {
    defaultBranch: 'main',
    autoCommit: false,
    remoteUrl: '',
    username: '',
    email: '',
    authToken: '',
  },
};

/**
 * Git plugin functionality
 * This would be implemented with a real Git library in a production environment
 */
export class GitPluginImplementation {
  private config: PluginConfig;

  constructor(config: PluginConfig) {
    this.config = config;
  }

  /**
   * Initialize a Git repository
   */
  async initRepository(): Promise<boolean> {
    try {
      console.log('Initializing Git repository with default branch:', this.config.defaultBranch);

      // Use the gitService to initialize the repository
      const gitStore = useGitStore.getState();
      await gitStore.initRepository(this.config.defaultBranch);

      return true;
    } catch (error) {
      console.error('Failed to initialize repository:', error);
      return false;
    }
  }

  /**
   * Add files to Git staging
   * @param files Array of file paths to add
   */
  async addFiles(files: string[]): Promise<boolean> {
    try {
      console.log('Adding files to Git staging:', files);
      const gitStore = useGitStore.getState();

      for (const file of files) {
        await gitStore.addFile(file);
      }

      return true;
    } catch (error) {
      console.error('Failed to add files:', error);
      return false;
    }
  }

  /**
   * Commit changes to the repository
   * @param message Commit message
   */
  async commit(message: string): Promise<boolean> {
    try {
      console.log('Committing changes with message:', message);
      const gitStore = useGitStore.getState();
      await gitStore.commit(message);
      return true;
    } catch (error) {
      console.error('Failed to commit changes:', error);
      return false;
    }
  }

  /**
   * Push changes to a remote repository
   * @param remote Remote name (default: origin)
   * @param branch Branch name (default: from config)
   */
  async push(remote: string = 'origin', branch?: string): Promise<boolean> {
    try {
      const targetBranch = branch || this.config.defaultBranch;
      console.log(`Pushing changes to ${remote}/${targetBranch}`);

      // Use the gitStore to push changes
      const gitStore = useGitStore.getState();
      return await gitStore.push(remote, targetBranch);
    } catch (error) {
      console.error('Failed to push changes:', error);
      return false;
    }
  }

  /**
   * Pull changes from a remote repository
   * @param remote Remote name (default: origin)
   * @param branch Branch name (default: from config)
   */
  async pull(remote: string = 'origin', branch?: string): Promise<boolean> {
    try {
      const targetBranch = branch || this.config.defaultBranch;
      console.log(`Pulling changes from ${remote}/${targetBranch}`);

      // Use the gitStore to pull changes
      const gitStore = useGitStore.getState();
      return await gitStore.pull(remote, targetBranch);
    } catch (error) {
      console.error('Failed to pull changes:', error);
      return false;
    }
  }

  /**
   * Create a new branch
   * @param name Branch name
   */
  async createBranch(name: string): Promise<boolean> {
    try {
      console.log('Creating new branch:', name);
      const gitStore = useGitStore.getState();
      await gitStore.createBranch(name);
      return true;
    } catch (error) {
      console.error('Failed to create branch:', error);
      return false;
    }
  }

  /**
   * Switch to a different branch
   * @param name Branch name
   */
  async switchBranch(name: string): Promise<boolean> {
    try {
      console.log('Switching to branch:', name);
      const gitStore = useGitStore.getState();
      await gitStore.switchBranch(name);
      return true;
    } catch (error) {
      console.error('Failed to switch branch:', error);
      return false;
    }
  }

  /**
   * Get the current branch name
   */
  async getCurrentBranch(): Promise<string> {
    try {
      const gitStore = useGitStore.getState();
      return gitStore.currentBranch || this.config.defaultBranch;
    } catch (error) {
      console.error('Failed to get current branch:', error);
      return this.config.defaultBranch;
    }
  }

  /**
   * Get the repository status (modified files, etc.)
   */
  async getStatus(): Promise<any> {
    try {
      console.log('Getting repository status');
      const gitStore = useGitStore.getState();
      await gitStore.getStatus();

      return {
        branch: gitStore.currentBranch,
        modified: gitStore.status.filter((item) => item.status === 'modified'),
        staged: gitStore.status.filter((item) => item.status === 'staged'),
        untracked: gitStore.status.filter((item) => item.status === 'untracked'),
      };
    } catch (error) {
      console.error('Failed to get status:', error);
      return {
        branch: this.config.defaultBranch,
        modified: [],
        staged: [],
        untracked: [],
      };
    }
  }

  /**
   * Configure the Git user
   * @param username Git username
   * @param email Git email
   */
  async configureUser(username: string, email: string): Promise<boolean> {
    try {
      console.log(`Configuring Git user: ${username} <${email}>`);
      const gitStore = useGitStore.getState();

      gitStore.setConfig({
        ...gitStore.config,
        username,
        email,
      });

      this.config.username = username;
      this.config.email = email;
      return true;
    } catch (error) {
      console.error('Failed to configure user:', error);
      return false;
    }
  }

  /**
   * Configure the remote repository
   * @param url Remote repository URL
   * @param name Remote name (default: origin)
   */
  async configureRemote(url: string, name: string = 'origin'): Promise<boolean> {
    try {
      console.log(`Configuring remote ${name}: ${url}`);
      const gitStore = useGitStore.getState();

      gitStore.setConfig({
        ...gitStore.config,
        remoteUrl: url,
        remoteName: name,
      });

      this.config.remoteUrl = url;
      return true;
    } catch (error) {
      console.error('Failed to configure remote:', error);
      return false;
    }
  }
}
