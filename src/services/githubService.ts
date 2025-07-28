import { Octokit } from '@octokit/rest';
import { debug, error, info } from '@/services/loggerService';
import { gitService } from '@/services/gitService';
import { githubAuthService } from '@/services/githubAuthService';

/**
 * GitHub service for interacting with the GitHub API
 */
export class GitHubService {
  private octokit: Octokit | null = null;
  private token: string | null = null;
  private username: string | null = null;
  private currentRepo: { owner: string; repo: string } | null = null;

  /**
   * Authenticate with GitHub using OAuth flow
   * This method starts the OAuth flow by redirecting to GitHub's authorization page
   */
  async authenticateWithOAuth(): Promise<void> {
    try {
      await githubAuthService.startOAuthFlow();
      // This will redirect the user to GitHub's authorization page
      // The callback will be handled by the application's OAuth callback route
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start OAuth flow';
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Handle the OAuth callback from GitHub
   * This method should be called by the application's OAuth callback route
   * @param code Authorization code from GitHub
   * @param state State parameter for security validation
   */
  async handleOAuthCallback(code: string, state: string): Promise<{ username: string }> {
    try {
      const authState = await githubAuthService.handleOAuthCallback(code, state);

      // Get the Octokit instance from the auth service
      this.octokit = githubAuthService.getOctokit();
      this.username = authState.username;

      info('GitHubService', `Authenticated as ${this.username} using OAuth`);
      return { username: this.username };
    } catch (err) {
      this.octokit = null;
      this.username = null;

      const errorMessage = err instanceof Error ? err.message : 'Failed to handle OAuth callback';
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Authenticate with GitHub using a personal access token (legacy method)
   * @param token GitHub personal access token
   * @deprecated Use authenticateWithOAuth instead
   */
  async authenticate(token: string): Promise<{ username: string }> {
    try {
      this.token = token;
      this.octokit = new Octokit({ auth: token });

      // Get authenticated user
      const { data } = await this.octokit.rest.users.getAuthenticated();
      this.username = data.login;

      info('GitHubService', `Authenticated as ${this.username} using personal access token`);
      warn(
        'GitHubService',
        'Using personal access tokens is deprecated. Please use OAuth authentication instead.',
      );
      return { username: this.username };
    } catch (err) {
      this.token = null;
      this.octokit = null;
      this.username = null;

      const errorMessage =
        err instanceof Error ? err.message : 'Failed to authenticate with GitHub';
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
  async listRepositories(
    page: number = 1,
    perPage: number = 30,
  ): Promise<{ repositories: any[]; hasNextPage: boolean; totalCount: number }> {
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
      const totalCount = parseInt((headers['x-total-count'] as string) || '0', 10) || data.length;

      debug(
        'GitHubService',
        `Found ${data.length} repositories (page ${page}, total: ${totalCount})`,
      );
      return {
        repositories: data,
        hasNextPage,
        totalCount,
      };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to list GitHub repositories';
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Create a new repository for the authenticated user
   * @param name Repository name
   * @param options Repository options
   */
  async createRepository(
    name: string,
    options: {
      description?: string;
      private?: boolean;
      isTemplate?: boolean;
    } = {},
  ): Promise<any> {
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
      const errorMessage =
        err instanceof Error ? err.message : `Failed to create repository ${name}`;
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
      const errorMessage =
        err instanceof Error ? err.message : `Failed to clone repository ${repoUrl}`;
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
      const errorMessage =
        err instanceof Error ? err.message : `Failed to push to ${remote}/${branch}`;
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
      const errorMessage =
        err instanceof Error ? err.message : `Failed to pull from ${remote}/${branch}`;
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Set the current repository for operations
   * @param owner Repository owner (username or organization)
   * @param repo Repository name
   */
  setCurrentRepository(owner: string, repo: string): void {
    this.currentRepo = { owner, repo };
    info('GitHubService', `Set current repository to ${owner}/${repo}`);
  }

  /**
   * Get the current repository
   */
  getCurrentRepository(): { owner: string; repo: string } | null {
    return this.currentRepo;
  }

  /**
   * List pull requests for the current repository
   * @param options Options for listing pull requests
   */
  async listPullRequests(
    options: {
      state?: 'open' | 'closed' | 'all';
      sort?: 'created' | 'updated' | 'popularity' | 'long-running';
      direction?: 'asc' | 'desc';
      page?: number;
      perPage?: number;
    } = {},
  ): Promise<{
    pullRequests: any[];
    hasNextPage: boolean;
    totalCount: number;
  }> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub');
    }

    if (!this.currentRepo) {
      throw new Error('No repository selected');
    }

    try {
      const { data, headers } = await this.octokit!.rest.pulls.list({
        owner: this.currentRepo.owner,
        repo: this.currentRepo.repo,
        state: options.state || 'open',
        sort: options.sort || 'created',
        direction: options.direction || 'desc',
        page: options.page || 1,
        per_page: options.perPage || 30,
      });

      // Check if there's a next page using the Link header
      const linkHeader = headers.link || '';
      const hasNextPage = linkHeader.includes('rel="next"');

      // Get total count from response headers if available
      const totalCount = parseInt((headers['x-total-count'] as string) || '0', 10) || data.length;

      debug(
        'GitHubService',
        `Found ${data.length} pull requests (page ${options.page || 1}, total: ${totalCount})`,
      );
      return {
        pullRequests: data,
        hasNextPage,
        totalCount,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to list pull requests';
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Get a specific pull request
   * @param pullNumber Pull request number
   */
  async getPullRequest(pullNumber: number): Promise<any> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub');
    }

    if (!this.currentRepo) {
      throw new Error('No repository selected');
    }

    try {
      const { data } = await this.octokit!.rest.pulls.get({
        owner: this.currentRepo.owner,
        repo: this.currentRepo.repo,
        pull_number: pullNumber,
      });

      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : `Failed to get pull request #${pullNumber}`;
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Create a new pull request
   * @param options Pull request options
   */
  async createPullRequest(options: {
    title: string;
    body?: string;
    head: string;
    base: string;
    draft?: boolean;
  }): Promise<any> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub');
    }

    if (!this.currentRepo) {
      throw new Error('No repository selected');
    }

    try {
      const { data } = await this.octokit!.rest.pulls.create({
        owner: this.currentRepo.owner,
        repo: this.currentRepo.repo,
        title: options.title,
        body: options.body,
        head: options.head,
        base: options.base,
        draft: options.draft,
      });

      info('GitHubService', `Created pull request #${data.number}: ${options.title}`);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create pull request';
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * List issues for the current repository
   * @param options Options for listing issues
   */
  async listIssues(
    options: {
      state?: 'open' | 'closed' | 'all';
      sort?: 'created' | 'updated' | 'comments';
      direction?: 'asc' | 'desc';
      labels?: string[];
      page?: number;
      perPage?: number;
    } = {},
  ): Promise<{
    issues: any[];
    hasNextPage: boolean;
    totalCount: number;
  }> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub');
    }

    if (!this.currentRepo) {
      throw new Error('No repository selected');
    }

    try {
      const { data, headers } = await this.octokit!.rest.issues.listForRepo({
        owner: this.currentRepo.owner,
        repo: this.currentRepo.repo,
        state: options.state || 'open',
        sort: options.sort || 'created',
        direction: options.direction || 'desc',
        labels: options.labels ? options.labels.join(',') : undefined,
        page: options.page || 1,
        per_page: options.perPage || 30,
      });

      // Filter out pull requests (GitHub API returns PRs as issues with a pull_request property)
      const issues = data.filter((issue) => !issue.pull_request);

      // Check if there's a next page using the Link header
      const linkHeader = headers.link || '';
      const hasNextPage = linkHeader.includes('rel="next"');

      // Get total count from response headers if available
      const totalCount = parseInt((headers['x-total-count'] as string) || '0', 10) || issues.length;

      debug(
        'GitHubService',
        `Found ${issues.length} issues (page ${options.page || 1}, total: ${totalCount})`,
      );
      return {
        issues,
        hasNextPage,
        totalCount,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to list issues';
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Get a specific issue
   * @param issueNumber Issue number
   */
  async getIssue(issueNumber: number): Promise<any> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub');
    }

    if (!this.currentRepo) {
      throw new Error('No repository selected');
    }

    try {
      const { data } = await this.octokit!.rest.issues.get({
        owner: this.currentRepo.owner,
        repo: this.currentRepo.repo,
        issue_number: issueNumber,
      });

      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : `Failed to get issue #${issueNumber}`;
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Create a new issue
   * @param options Issue options
   */
  async createIssue(options: {
    title: string;
    body?: string;
    labels?: string[];
    assignees?: string[];
  }): Promise<any> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub');
    }

    if (!this.currentRepo) {
      throw new Error('No repository selected');
    }

    try {
      const { data } = await this.octokit!.rest.issues.create({
        owner: this.currentRepo.owner,
        repo: this.currentRepo.repo,
        title: options.title,
        body: options.body,
        labels: options.labels,
        assignees: options.assignees,
      });

      info('GitHubService', `Created issue #${data.number}: ${options.title}`);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create issue';
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * List review comments on a pull request
   * @param pullNumber Pull request number
   * @param options Options for listing comments
   */
  async listReviewComments(
    pullNumber: number,
    options: {
      page?: number;
      perPage?: number;
    } = {},
  ): Promise<{
    comments: any[];
    hasNextPage: boolean;
    totalCount: number;
  }> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub');
    }

    if (!this.currentRepo) {
      throw new Error('No repository selected');
    }

    try {
      const { data, headers } = await this.octokit!.rest.pulls.listReviewComments({
        owner: this.currentRepo.owner,
        repo: this.currentRepo.repo,
        pull_number: pullNumber,
        page: options.page || 1,
        per_page: options.perPage || 30,
      });

      // Check if there's a next page using the Link header
      const linkHeader = headers.link || '';
      const hasNextPage = linkHeader.includes('rel="next"');

      // Get total count from response headers if available
      const totalCount = parseInt((headers['x-total-count'] as string) || '0', 10) || data.length;

      debug(
        'GitHubService',
        `Found ${data.length} review comments (page ${options.page || 1}, total: ${totalCount})`,
      );
      return {
        comments: data,
        hasNextPage,
        totalCount,
      };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : `Failed to list review comments for PR #${pullNumber}`;
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Create a review for a pull request
   * @param pullNumber Pull request number
   * @param options Review options
   */
  async createReview(
    pullNumber: number,
    options: {
      body?: string;
      event?: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
      comments?: Array<{
        path: string;
        position: number;
        body: string;
      }>;
    },
  ): Promise<any> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub');
    }

    if (!this.currentRepo) {
      throw new Error('No repository selected');
    }

    try {
      const { data } = await this.octokit!.rest.pulls.createReview({
        owner: this.currentRepo.owner,
        repo: this.currentRepo.repo,
        pull_number: pullNumber,
        body: options.body,
        event: options.event,
        comments: options.comments,
      });

      info('GitHubService', `Created review for PR #${pullNumber}`);
      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : `Failed to create review for PR #${pullNumber}`;
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * List workflow runs for the current repository
   * @param options Options for listing workflow runs
   */
  async listWorkflowRuns(
    options: {
      workflow_id?: number;
      actor?: string;
      branch?: string;
      event?: string;
      status?:
        | 'completed'
        | 'action_required'
        | 'cancelled'
        | 'failure'
        | 'neutral'
        | 'skipped'
        | 'stale'
        | 'success'
        | 'timed_out'
        | 'in_progress'
        | 'queued'
        | 'requested'
        | 'waiting';
      page?: number;
      perPage?: number;
    } = {},
  ): Promise<{
    workflowRuns: any[];
    hasNextPage: boolean;
    totalCount: number;
  }> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub');
    }

    if (!this.currentRepo) {
      throw new Error('No repository selected');
    }

    try {
      const { data, headers } = await this.octokit!.rest.actions.listWorkflowRunsForRepo({
        owner: this.currentRepo.owner,
        repo: this.currentRepo.repo,
        actor: options.actor,
        branch: options.branch,
        event: options.event,
        status: options.status,
        page: options.page || 1,
        per_page: options.perPage || 30,
      });

      // Check if there's a next page using the Link header
      const linkHeader = headers.link || '';
      const hasNextPage = linkHeader.includes('rel="next"');

      // Get total count from response
      const totalCount = data.total_count || data.workflow_runs.length;

      debug(
        'GitHubService',
        `Found ${data.workflow_runs.length} workflow runs (page ${options.page || 1}, total: ${totalCount})`,
      );
      return {
        workflowRuns: data.workflow_runs,
        hasNextPage,
        totalCount,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to list workflow runs';
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Get a specific workflow run
   * @param runId Workflow run ID
   */
  async getWorkflowRun(runId: number): Promise<any> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub');
    }

    if (!this.currentRepo) {
      throw new Error('No repository selected');
    }

    try {
      const { data } = await this.octokit!.rest.actions.getWorkflowRun({
        owner: this.currentRepo.owner,
        repo: this.currentRepo.repo,
        run_id: runId,
      });

      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : `Failed to get workflow run #${runId}`;
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * List jobs for a specific workflow run
   * @param runId Workflow run ID
   * @param options Options for listing jobs
   */
  async listJobsForWorkflowRun(
    runId: number,
    options: {
      filter?: 'latest' | 'all';
      page?: number;
      perPage?: number;
    } = {},
  ): Promise<{
    jobs: any[];
    hasNextPage: boolean;
    totalCount: number;
  }> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub');
    }

    if (!this.currentRepo) {
      throw new Error('No repository selected');
    }

    try {
      const { data, headers } = await this.octokit!.rest.actions.listJobsForWorkflowRun({
        owner: this.currentRepo.owner,
        repo: this.currentRepo.repo,
        run_id: runId,
        filter: options.filter,
        page: options.page || 1,
        per_page: options.perPage || 30,
      });

      // Check if there's a next page using the Link header
      const linkHeader = headers.link || '';
      const hasNextPage = linkHeader.includes('rel="next"');

      // Get total count from response
      const totalCount = data.total_count || data.jobs.length;

      debug(
        'GitHubService',
        `Found ${data.jobs.length} jobs for workflow run #${runId} (page ${options.page || 1}, total: ${totalCount})`,
      );
      return {
        jobs: data.jobs,
        hasNextPage,
        totalCount,
      };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : `Failed to list jobs for workflow run #${runId}`;
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Get the logs for a specific job
   * @param jobId Job ID
   */
  async getJobLogs(jobId: number): Promise<string> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub');
    }

    if (!this.currentRepo) {
      throw new Error('No repository selected');
    }

    try {
      // This endpoint returns a redirect to the logs
      const response = await this.octokit!.rest.actions.downloadJobLogsForWorkflowRun({
        owner: this.currentRepo.owner,
        repo: this.currentRepo.repo,
        job_id: jobId,
      });

      // Get the redirect URL
      const logsUrl = response.url;

      // Fetch the logs
      const logsResponse = await fetch(logsUrl);
      const logs = await logsResponse.text();

      return logs;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : `Failed to get logs for job #${jobId}`;
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Get the status of a commit (CI/CD checks)
   * @param sha Commit SHA
   */
  async getCommitStatus(sha: string): Promise<any> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub');
    }

    if (!this.currentRepo) {
      throw new Error('No repository selected');
    }

    try {
      const { data } = await this.octokit!.rest.repos.getCombinedStatusForRef({
        owner: this.currentRepo.owner,
        repo: this.currentRepo.repo,
        ref: sha,
      });

      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : `Failed to get status for commit ${sha}`;
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * List Gists for the authenticated user
   * @param options Options for listing Gists
   */
  async listGists(
    options: {
      since?: string; // ISO 8601 timestamp
      perPage?: number;
      page?: number;
    } = {},
  ): Promise<{
    gists: any[];
    hasNextPage: boolean;
  }> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub');
    }

    try {
      const { data, headers } = await this.octokit!.rest.gists.list({
        since: options.since,
        per_page: options.perPage || 30,
        page: options.page || 1,
      });

      // Check if there's a next page using the Link header
      const linkHeader = headers.link || '';
      const hasNextPage = linkHeader.includes('rel="next"');

      debug('GitHubService', `Found ${data.length} Gists (page ${options.page || 1})`);
      return {
        gists: data,
        hasNextPage,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to list Gists';
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Get a specific Gist
   * @param gistId Gist ID
   */
  async getGist(gistId: string): Promise<any> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub');
    }

    try {
      const { data } = await this.octokit!.rest.gists.get({
        gist_id: gistId,
      });

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to get Gist ${gistId}`;
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Create a new Gist
   * @param options Gist options
   */
  async createGist(options: {
    description?: string;
    public?: boolean;
    files: Record<
      string,
      {
        content: string;
      }
    >;
  }): Promise<any> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub');
    }

    try {
      const { data } = await this.octokit!.rest.gists.create({
        description: options.description,
        public: options.public !== false, // Default to public if not specified
        files: options.files,
      });

      info('GitHubService', `Created Gist ${data.id}`);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create Gist';
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Update an existing Gist
   * @param gistId Gist ID
   * @param options Gist update options
   */
  async updateGist(
    gistId: string,
    options: {
      description?: string;
      files?: Record<
        string,
        {
          content?: string;
          filename?: string;
        } | null
      >;
    },
  ): Promise<any> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub');
    }

    try {
      const { data } = await this.octokit!.rest.gists.update({
        gist_id: gistId,
        description: options.description,
        files: options.files,
      });

      info('GitHubService', `Updated Gist ${gistId}`);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to update Gist ${gistId}`;
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Delete a Gist
   * @param gistId Gist ID
   */
  async deleteGist(gistId: string): Promise<void> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub');
    }

    try {
      await this.octokit!.rest.gists.delete({
        gist_id: gistId,
      });

      info('GitHubService', `Deleted Gist ${gistId}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to delete Gist ${gistId}`;
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Create a code snippet as a Gist and return the URL
   * @param filename Filename for the snippet
   * @param content Content of the snippet
   * @param description Optional description
   * @param isPublic Whether the Gist should be public (default: true)
   */
  async createCodeSnippet(
    filename: string,
    content: string,
    description?: string,
    isPublic: boolean = true,
  ): Promise<string> {
    try {
      const gist = await this.createGist({
        description,
        public: isPublic,
        files: {
          [filename]: {
            content,
          },
        },
      });

      info('GitHubService', `Created code snippet as Gist ${gist.id}`);
      return gist.html_url;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create code snippet';
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * List projects for the current repository
   * @param options Options for listing projects
   */
  async listProjects(
    options: {
      state?: 'open' | 'closed' | 'all';
      page?: number;
      perPage?: number;
    } = {},
  ): Promise<{
    projects: any[];
    hasNextPage: boolean;
    totalCount: number;
  }> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub');
    }

    if (!this.currentRepo) {
      throw new Error('No repository selected');
    }

    try {
      const { data, headers } = await this.octokit!.rest.projects.listForRepo({
        owner: this.currentRepo.owner,
        repo: this.currentRepo.repo,
        state: options.state || 'open',
        page: options.page || 1,
        per_page: options.perPage || 30,
      });

      // Check if there's a next page using the Link header
      const linkHeader = headers.link || '';
      const hasNextPage = linkHeader.includes('rel="next"');

      // Get total count from response headers if available
      const totalCount = parseInt((headers['x-total-count'] as string) || '0', 10) || data.length;

      debug(
        'GitHubService',
        `Found ${data.length} projects (page ${options.page || 1}, total: ${totalCount})`,
      );
      return {
        projects: data,
        hasNextPage,
        totalCount,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to list projects';
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Get a specific project
   * @param projectId Project ID
   */
  async getProject(projectId: number): Promise<any> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub');
    }

    try {
      const { data } = await this.octokit!.rest.projects.get({
        project_id: projectId,
      });

      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : `Failed to get project #${projectId}`;
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Create a new project for the current repository
   * @param options Project options
   */
  async createProject(options: { name: string; body?: string }): Promise<any> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub');
    }

    if (!this.currentRepo) {
      throw new Error('No repository selected');
    }

    try {
      const { data } = await this.octokit!.rest.projects.createForRepo({
        owner: this.currentRepo.owner,
        repo: this.currentRepo.repo,
        name: options.name,
        body: options.body,
      });

      info('GitHubService', `Created project #${data.id}: ${options.name}`);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create project';
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Update a project
   * @param projectId Project ID
   * @param options Project update options
   */
  async updateProject(
    projectId: number,
    options: {
      name?: string;
      body?: string;
      state?: 'open' | 'closed';
      organization_permission?: 'read' | 'write' | 'admin' | 'none';
      private?: boolean;
    },
  ): Promise<any> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub');
    }

    try {
      const { data } = await this.octokit!.rest.projects.update({
        project_id: projectId,
        name: options.name,
        body: options.body,
        state: options.state,
        organization_permission: options.organization_permission,
        private: options.private,
      });

      info('GitHubService', `Updated project #${projectId}`);
      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : `Failed to update project #${projectId}`;
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Delete a project
   * @param projectId Project ID
   */
  async deleteProject(projectId: number): Promise<void> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub');
    }

    try {
      await this.octokit!.rest.projects.delete({
        project_id: projectId,
      });

      info('GitHubService', `Deleted project #${projectId}`);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : `Failed to delete project #${projectId}`;
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * List columns for a project
   * @param projectId Project ID
   */
  async listProjectColumns(projectId: number): Promise<any[]> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub');
    }

    try {
      const { data } = await this.octokit!.rest.projects.listColumns({
        project_id: projectId,
      });

      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : `Failed to list columns for project #${projectId}`;
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Create a column in a project
   * @param projectId Project ID
   * @param name Column name
   */
  async createProjectColumn(projectId: number, name: string): Promise<any> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub');
    }

    try {
      const { data } = await this.octokit!.rest.projects.createColumn({
        project_id: projectId,
        name,
      });

      info('GitHubService', `Created column in project #${projectId}: ${name}`);
      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : `Failed to create column in project #${projectId}`;
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * List cards in a project column
   * @param columnId Column ID
   */
  async listProjectCards(columnId: number): Promise<any[]> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub');
    }

    try {
      const { data } = await this.octokit!.rest.projects.listCards({
        column_id: columnId,
      });

      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : `Failed to list cards in column #${columnId}`;
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Create a card in a project column
   * @param columnId Column ID
   * @param options Card options
   */
  async createProjectCard(
    columnId: number,
    options: {
      note?: string;
      content_id?: number;
      content_type?: 'Issue' | 'PullRequest';
    },
  ): Promise<any> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub');
    }

    try {
      const { data } = await this.octokit!.rest.projects.createCard({
        column_id: columnId,
        note: options.note,
        content_id: options.content_id,
        content_type: options.content_type,
      });

      info('GitHubService', `Created card in column #${columnId}`);
      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : `Failed to create card in column #${columnId}`;
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * List notifications for the authenticated user
   * @param options Options for listing notifications
   */
  async listNotifications(
    options: {
      all?: boolean;
      participating?: boolean;
      since?: string; // ISO 8601 timestamp
      before?: string; // ISO 8601 timestamp
      page?: number;
      perPage?: number;
    } = {},
  ): Promise<{
    notifications: any[];
    hasNextPage: boolean;
    totalCount: number;
  }> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub');
    }

    try {
      const { data, headers } =
        await this.octokit!.rest.activity.listNotificationsForAuthenticatedUser({
          all: options.all,
          participating: options.participating,
          since: options.since,
          before: options.before,
          page: options.page || 1,
          per_page: options.perPage || 30,
        });

      // Check if there's a next page using the Link header
      const linkHeader = headers.link || '';
      const hasNextPage = linkHeader.includes('rel="next"');

      // Get total count from response headers if available
      const totalCount = parseInt((headers['x-total-count'] as string) || '0', 10) || data.length;

      debug(
        'GitHubService',
        `Found ${data.length} notifications (page ${options.page || 1}, total: ${totalCount})`,
      );
      return {
        notifications: data,
        hasNextPage,
        totalCount,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to list notifications';
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * List notifications for the current repository
   * @param options Options for listing notifications
   */
  async listRepositoryNotifications(
    options: {
      all?: boolean;
      participating?: boolean;
      since?: string; // ISO 8601 timestamp
      before?: string; // ISO 8601 timestamp
      page?: number;
      perPage?: number;
    } = {},
  ): Promise<{
    notifications: any[];
    hasNextPage: boolean;
    totalCount: number;
  }> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub');
    }

    if (!this.currentRepo) {
      throw new Error('No repository selected');
    }

    try {
      const { data, headers } =
        await this.octokit!.rest.activity.listRepoNotificationsForAuthenticatedUser({
          owner: this.currentRepo.owner,
          repo: this.currentRepo.repo,
          all: options.all,
          participating: options.participating,
          since: options.since,
          before: options.before,
          page: options.page || 1,
          per_page: options.perPage || 30,
        });

      // Check if there's a next page using the Link header
      const linkHeader = headers.link || '';
      const hasNextPage = linkHeader.includes('rel="next"');

      // Get total count from response headers if available
      const totalCount = parseInt((headers['x-total-count'] as string) || '0', 10) || data.length;

      debug(
        'GitHubService',
        `Found ${data.length} repository notifications (page ${options.page || 1}, total: ${totalCount})`,
      );
      return {
        notifications: data,
        hasNextPage,
        totalCount,
      };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to list repository notifications';
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Get a specific thread
   * @param threadId Thread ID
   */
  async getThread(threadId: number): Promise<any> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub');
    }

    try {
      const { data } = await this.octokit!.rest.activity.getThread({
        thread_id: threadId,
      });

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to get thread #${threadId}`;
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Mark a notification as read
   * @param threadId Thread ID
   */
  async markThreadAsRead(threadId: number): Promise<void> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub');
    }

    try {
      await this.octokit!.rest.activity.markThreadAsRead({
        thread_id: threadId,
      });

      info('GitHubService', `Marked thread #${threadId} as read`);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : `Failed to mark thread #${threadId} as read`;
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Mark all notifications as read
   * @param options Options for marking notifications as read
   */
  async markAllNotificationsAsRead(
    options: {
      last_read_at?: string; // ISO 8601 timestamp
    } = {},
  ): Promise<void> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub');
    }

    try {
      await this.octokit!.rest.activity.markNotificationsAsRead({
        last_read_at: options.last_read_at,
      });

      info('GitHubService', 'Marked all notifications as read');
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to mark all notifications as read';
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Mark all repository notifications as read
   * @param options Options for marking notifications as read
   */
  async markRepositoryNotificationsAsRead(
    options: {
      last_read_at?: string; // ISO 8601 timestamp
    } = {},
  ): Promise<void> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub');
    }

    if (!this.currentRepo) {
      throw new Error('No repository selected');
    }

    try {
      await this.octokit!.rest.activity.markRepoNotificationsAsRead({
        owner: this.currentRepo.owner,
        repo: this.currentRepo.repo,
        last_read_at: options.last_read_at,
      });

      info(
        'GitHubService',
        `Marked all notifications for ${this.currentRepo.owner}/${this.currentRepo.repo} as read`,
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to mark repository notifications as read';
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Check if the user is subscribed to a thread
   * @param threadId Thread ID
   */
  async checkThreadSubscription(threadId: number): Promise<boolean> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub');
    }

    try {
      const { data } = await this.octokit!.rest.activity.getThreadSubscriptionForAuthenticatedUser({
        thread_id: threadId,
      });

      return data.subscribed || false;
    } catch (err) {
      // If the user is not subscribed, the API returns a 404
      if (err.status === 404) {
        return false;
      }

      const errorMessage =
        err instanceof Error ? err.message : `Failed to check subscription for thread #${threadId}`;
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Set thread subscription
   * @param threadId Thread ID
   * @param subscribed Whether to subscribe to the thread
   * @param ignored Whether to ignore the thread
   */
  async setThreadSubscription(
    threadId: number,
    subscribed: boolean,
    ignored: boolean = false,
  ): Promise<void> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub');
    }

    try {
      await this.octokit!.rest.activity.setThreadSubscription({
        thread_id: threadId,
        subscribed,
        ignored,
      });

      info(
        'GitHubService',
        `Set subscription for thread #${threadId}: subscribed=${subscribed}, ignored=${ignored}`,
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : `Failed to set subscription for thread #${threadId}`;
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Get repository settings
   */
  async getRepositorySettings(): Promise<any> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub');
    }

    if (!this.currentRepo) {
      throw new Error('No repository selected');
    }

    try {
      const { data } = await this.octokit!.rest.repos.get({
        owner: this.currentRepo.owner,
        repo: this.currentRepo.repo,
      });

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get repository settings';
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Update repository settings
   * @param options Repository update options
   */
  async updateRepositorySettings(options: {
    name?: string;
    description?: string;
    homepage?: string;
    private?: boolean;
    has_issues?: boolean;
    has_projects?: boolean;
    has_wiki?: boolean;
    is_template?: boolean;
    default_branch?: string;
    allow_squash_merge?: boolean;
    allow_merge_commit?: boolean;
    allow_rebase_merge?: boolean;
    allow_auto_merge?: boolean;
    delete_branch_on_merge?: boolean;
    archived?: boolean;
  }): Promise<any> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub');
    }

    if (!this.currentRepo) {
      throw new Error('No repository selected');
    }

    try {
      const { data } = await this.octokit!.rest.repos.update({
        owner: this.currentRepo.owner,
        repo: this.currentRepo.repo,
        ...options,
      });

      info(
        'GitHubService',
        `Updated repository settings for ${this.currentRepo.owner}/${this.currentRepo.repo}`,
      );
      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update repository settings';
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * List repository branches
   * @param options Options for listing branches
   */
  async listRepositoryBranches(
    options: {
      protected?: boolean;
      page?: number;
      perPage?: number;
    } = {},
  ): Promise<{
    branches: any[];
    hasNextPage: boolean;
    totalCount: number;
  }> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub');
    }

    if (!this.currentRepo) {
      throw new Error('No repository selected');
    }

    try {
      const { data, headers } = await this.octokit!.rest.repos.listBranches({
        owner: this.currentRepo.owner,
        repo: this.currentRepo.repo,
        protected: options.protected,
        page: options.page || 1,
        per_page: options.perPage || 30,
      });

      // Check if there's a next page using the Link header
      const linkHeader = headers.link || '';
      const hasNextPage = linkHeader.includes('rel="next"');

      // Get total count from response headers if available
      const totalCount = parseInt((headers['x-total-count'] as string) || '0', 10) || data.length;

      debug(
        'GitHubService',
        `Found ${data.length} branches (page ${options.page || 1}, total: ${totalCount})`,
      );
      return {
        branches: data,
        hasNextPage,
        totalCount,
      };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to list repository branches';
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Get branch protection settings
   * @param branch Branch name
   */
  async getBranchProtection(branch: string): Promise<any> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub');
    }

    if (!this.currentRepo) {
      throw new Error('No repository selected');
    }

    try {
      const { data } = await this.octokit!.rest.repos.getBranchProtection({
        owner: this.currentRepo.owner,
        repo: this.currentRepo.repo,
        branch,
      });

      return data;
    } catch (err) {
      // If the branch is not protected, the API returns a 404
      if (err.status === 404) {
        return null;
      }

      const errorMessage =
        err instanceof Error ? err.message : `Failed to get branch protection for ${branch}`;
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Update branch protection settings
   * @param branch Branch name
   * @param options Branch protection options
   */
  async updateBranchProtection(
    branch: string,
    options: {
      required_status_checks?: {
        strict?: boolean;
        contexts?: string[];
      } | null;
      enforce_admins?: boolean | null;
      required_pull_request_reviews?: {
        dismissal_restrictions?: {
          users?: string[];
          teams?: string[];
        };
        dismiss_stale_reviews?: boolean;
        require_code_owner_reviews?: boolean;
        required_approving_review_count?: number;
      } | null;
      restrictions?: {
        users?: string[];
        teams?: string[];
        apps?: string[];
      } | null;
      required_linear_history?: boolean;
      allow_force_pushes?: boolean;
      allow_deletions?: boolean;
      block_creations?: boolean;
      required_conversation_resolution?: boolean;
    },
  ): Promise<any> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub');
    }

    if (!this.currentRepo) {
      throw new Error('No repository selected');
    }

    try {
      const { data } = await this.octokit!.rest.repos.updateBranchProtection({
        owner: this.currentRepo.owner,
        repo: this.currentRepo.repo,
        branch,
        ...options,
      });

      info('GitHubService', `Updated branch protection for ${branch}`);
      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : `Failed to update branch protection for ${branch}`;
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * List repository collaborators
   * @param options Options for listing collaborators
   */
  async listCollaborators(
    options: {
      affiliation?: 'outside' | 'direct' | 'all';
      permission?: 'pull' | 'push' | 'admin' | 'maintain' | 'triage';
      page?: number;
      perPage?: number;
    } = {},
  ): Promise<{
    collaborators: any[];
    hasNextPage: boolean;
    totalCount: number;
  }> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub');
    }

    if (!this.currentRepo) {
      throw new Error('No repository selected');
    }

    try {
      const { data, headers } = await this.octokit!.rest.repos.listCollaborators({
        owner: this.currentRepo.owner,
        repo: this.currentRepo.repo,
        affiliation: options.affiliation,
        permission: options.permission,
        page: options.page || 1,
        per_page: options.perPage || 30,
      });

      // Check if there's a next page using the Link header
      const linkHeader = headers.link || '';
      const hasNextPage = linkHeader.includes('rel="next"');

      // Get total count from response headers if available
      const totalCount = parseInt((headers['x-total-count'] as string) || '0', 10) || data.length;

      debug(
        'GitHubService',
        `Found ${data.length} collaborators (page ${options.page || 1}, total: ${totalCount})`,
      );
      return {
        collaborators: data,
        hasNextPage,
        totalCount,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to list collaborators';
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Add a collaborator to the repository
   * @param username Username of the collaborator
   * @param permission Permission level
   */
  async addCollaborator(
    username: string,
    permission: 'pull' | 'push' | 'admin' | 'maintain' | 'triage',
  ): Promise<any> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub');
    }

    if (!this.currentRepo) {
      throw new Error('No repository selected');
    }

    try {
      const { data } = await this.octokit!.rest.repos.addCollaborator({
        owner: this.currentRepo.owner,
        repo: this.currentRepo.repo,
        username,
        permission,
      });

      info('GitHubService', `Added collaborator ${username} with permission ${permission}`);
      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : `Failed to add collaborator ${username}`;
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Remove a collaborator from the repository
   * @param username Username of the collaborator
   */
  async removeCollaborator(username: string): Promise<void> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub');
    }

    if (!this.currentRepo) {
      throw new Error('No repository selected');
    }

    try {
      await this.octokit!.rest.repos.removeCollaborator({
        owner: this.currentRepo.owner,
        repo: this.currentRepo.repo,
        username,
      });

      info('GitHubService', `Removed collaborator ${username}`);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : `Failed to remove collaborator ${username}`;
      error('GitHubService', errorMessage);
      throw new Error(errorMessage);
    }
  }
}

export const githubService = new GitHubService();
