import { Octokit } from '@octokit/rest';
import { debug, error, info } from '@/services/loggerService';
import { gitService } from '@/services/gitService';

/**
 * GitHub service for interacting with the GitHub API
 */
export class GitHubService {
  private octokit: Octokit | null = null;
  private token: string | null = null;
  private username: string | null = null;

  /**
   * Authenticate with GitHub using a personal access token
   * @param token GitHub personal access token
   */
  async authenticate(token: string): Promise<{ username: string }> {
    try {
      this.token = token;
      this.octokit = new Octokit({ auth: token });

      // Get authenticated user
      const { data } = await this.octokit.rest.users.getAuthenticated();
      this.username = data.login;

      info('GitHubService', `Authenticated as ${this.username}`);
      return { username: this.username };
    } catch (err) {
      this.token = null;
      this.octokit = null;
      this.username = null;

      const errorMessage = err instanceof Error ? err.message : 'Failed to authenticate with GitHub';
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Check if the user is authenticated with GitHub
   */
  isAuthenticated(): boolean {
    return !!this.token && !!this.octokit && !!this.username;
  }

  /**
   * Get the authenticated user's username
   */
  getUsername(): string | null {
    return this.username;
  }

  /**
   * Disconnect from GitHub
   */
  disconnect(): void {
    this.token = null;
    this.octokit = null;
    this.username = null;
    info('GitHubService', 'Disconnected from GitHub');
  }

  /**
   * List repositories for the authenticated user
   * @param page Page number (1-based)
   * @param perPage Number of repositories per page
   */
  async listRepositories(page: number = 1, perPage: number = 30): Promise<{ repositories: any[], hasNextPage: boolean, totalCount: number }> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub');
    }

    try {
      const { data, headers } = await this.octokit!.rest.repos.listForAuthenticatedUser({
        page,
        per_page: perPage,
        sort: 'updated',
        direction: 'desc',
      });

      // Check if there's a next page using the Link header
      const linkHeader = headers.link || '';
      const hasNextPage = linkHeader.includes('rel="next"');

      // Get total count from response headers if available
      const totalCount = parseInt(headers['x-total-count'] as string || '0', 10) || data.length;

      debug('GitHubService', `Found ${data.length} repositories (page ${page}, total: ${totalCount})`);
      return {
        repositories: data,
        hasNextPage,
        totalCount
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to list GitHub repositories';
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Create a new repository for the authenticated user
   * @param name Repository name
   * @param options Repository options
   */
  async createRepository(name: string, options: {
    description?: string;
    private?: boolean;
    isTemplate?: boolean;
  } = {}): Promise<any> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub');
    }

    try {
      const { data } = await this.octokit!.rest.repos.createForAuthenticatedUser({
        name,
        description: options.description,
        private: options.private,
        is_template: options.isTemplate,
      });

      info('GitHubService', `Created repository ${name}`);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to create repository ${name}`;
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Clone a repository from GitHub
   * @param repoUrl Repository URL
   * @param directory Directory to clone into
   */
  async cloneRepository(repoUrl: string, directory: string): Promise<void> {
    try {
      // This is a placeholder for the actual implementation
      // In a browser environment, we would need to use isomorphic-git or a similar library
      // For now, we'll just log a message
      info('GitHubService', `Cloning repository ${repoUrl} into ${directory}`);
      throw new Error('Cloning repositories is not supported in browser environments');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to clone repository ${repoUrl}`;
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Push to a GitHub repository
   * @param remote Remote name
   * @param branch Branch name
   */
  async pushToRepository(remote: string, branch: string): Promise<void> {
    try {
      // This is a placeholder for the actual implementation
      // In a browser environment, we would need to use isomorphic-git or a similar library
      // For now, we'll just log a message
      info('GitHubService', `Pushing to ${remote}/${branch}`);
      throw new Error('Pushing to repositories is not supported in browser environments');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to push to ${remote}/${branch}`;
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Pull from a GitHub repository
   * @param remote Remote name
   * @param branch Branch name
   */
  async pullFromRepository(remote: string, branch: string): Promise<void> {
    try {
      // This is a placeholder for the actual implementation
      // In a browser environment, we would need to use isomorphic-git or a similar library
      // For now, we'll just log a message
      info('GitHubService', `Pulling from ${remote}/${branch}`);
      throw new Error('Pulling from repositories is not supported in browser environments');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to pull from ${remote}/${branch}`;
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }
}

export const githubService = new GitHubService();
