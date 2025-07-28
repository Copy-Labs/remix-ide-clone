import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GitHubService, githubService } from '@/services/githubService';
import { Octokit } from '@octokit/rest';

// Mock dependencies
vi.mock('@octokit/rest');
vi.mock('@/services/loggerService', () => ({
  debug: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
}));

describe('GitHubService', () => {
  let service: GitHubService;
  let mockOctokit: any;

  beforeEach(() => {
    // Reset the service
    service = githubService;

    // Reset private properties using any type assertion
    (service as any).octokit = null;
    (service as any).token = null;
    (service as any).username = null;

    // Create mock Octokit instance
    mockOctokit = {
      rest: {
        users: {
          getAuthenticated: vi.fn(),
        },
        repos: {
          listForAuthenticatedUser: vi.fn(),
          createForAuthenticatedUser: vi.fn(),
        },
      },
    };

    // Mock Octokit constructor
    vi.mocked(Octokit).mockImplementation(() => mockOctokit);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should authenticate successfully with valid token', async () => {
      const token = 'valid_token';
      const userData = { login: 'testuser' };

      mockOctokit.rest.users.getAuthenticated.mockResolvedValue({ data: userData });

      const result = await service.authenticate(token);

      expect(Octokit).toHaveBeenCalledWith({ auth: token });
      expect(mockOctokit.rest.users.getAuthenticated).toHaveBeenCalled();
      expect(result).toEqual({ username: userData.login });
      expect(service.isAuthenticated()).toBe(true);
      expect(service.getUsername()).toBe(userData.login);
    });

    it('should handle authentication errors', async () => {
      const token = 'invalid_token';
      const errorMessage = 'Invalid token';

      mockOctokit.rest.users.getAuthenticated.mockRejectedValue(new Error(errorMessage));

      await expect(service.authenticate(token)).rejects.toThrow(errorMessage);
      expect(service.isAuthenticated()).toBe(false);
      expect(service.getUsername()).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('should return false when not authenticated', () => {
      expect(service.isAuthenticated()).toBe(false);
    });

    it('should return true when authenticated', async () => {
      // Authenticate first
      mockOctokit.rest.users.getAuthenticated.mockResolvedValue({ data: { login: 'testuser' } });
      await service.authenticate('valid_token');

      expect(service.isAuthenticated()).toBe(true);
    });
  });

  describe('getUsername', () => {
    it('should return null when not authenticated', () => {
      expect(service.getUsername()).toBeNull();
    });

    it('should return username when authenticated', async () => {
      const username = 'testuser';

      // Authenticate first
      mockOctokit.rest.users.getAuthenticated.mockResolvedValue({ data: { login: username } });
      await service.authenticate('valid_token');

      expect(service.getUsername()).toBe(username);
    });
  });

  describe('disconnect', () => {
    it('should disconnect and reset state', async () => {
      // Authenticate first
      mockOctokit.rest.users.getAuthenticated.mockResolvedValue({ data: { login: 'testuser' } });
      await service.authenticate('valid_token');

      // Verify authenticated
      expect(service.isAuthenticated()).toBe(true);

      // Disconnect
      service.disconnect();

      // Verify disconnected
      expect(service.isAuthenticated()).toBe(false);
      expect(service.getUsername()).toBeNull();
    });
  });

  describe('listRepositories', () => {
    it('should throw error when not authenticated', async () => {
      await expect(service.listRepositories()).rejects.toThrow('Not authenticated with GitHub');
    });

    it('should list repositories when authenticated', async () => {
      const repos = [
        { id: 1, name: 'repo1' },
        { id: 2, name: 'repo2' },
      ];

      // Authenticate first
      mockOctokit.rest.users.getAuthenticated.mockResolvedValue({ data: { login: 'testuser' } });
      await service.authenticate('valid_token');

      // Mock repository list with pagination headers
      mockOctokit.rest.repos.listForAuthenticatedUser.mockResolvedValue({
        data: repos,
        headers: {
          link: '<https://api.github.com/user/repos?page=2>; rel="next"',
          'x-total-count': '10',
        },
      });

      const result = await service.listRepositories();

      expect(mockOctokit.rest.repos.listForAuthenticatedUser).toHaveBeenCalledWith({
        page: 1,
        per_page: 30,
        sort: 'updated',
        direction: 'desc',
      });
      expect(result).toEqual({
        repositories: repos,
        hasNextPage: true,
        totalCount: 10,
      });
    });

    it('should handle pagination parameters', async () => {
      const repos = [
        { id: 3, name: 'repo3' },
        { id: 4, name: 'repo4' },
      ];

      // Authenticate first
      mockOctokit.rest.users.getAuthenticated.mockResolvedValue({ data: { login: 'testuser' } });
      await service.authenticate('valid_token');

      // Mock repository list with pagination headers
      mockOctokit.rest.repos.listForAuthenticatedUser.mockResolvedValue({
        data: repos,
        headers: {
          link: '', // No next page
          'x-total-count': '4',
        },
      });

      const result = await service.listRepositories(2, 2);

      expect(mockOctokit.rest.repos.listForAuthenticatedUser).toHaveBeenCalledWith({
        page: 2,
        per_page: 2,
        sort: 'updated',
        direction: 'desc',
      });
      expect(result).toEqual({
        repositories: repos,
        hasNextPage: false,
        totalCount: 4,
      });
    });

    it('should handle errors when listing repositories', async () => {
      const errorMessage = 'API rate limit exceeded';

      // Authenticate first
      mockOctokit.rest.users.getAuthenticated.mockResolvedValue({ data: { login: 'testuser' } });
      await service.authenticate('valid_token');

      // Mock error
      mockOctokit.rest.repos.listForAuthenticatedUser.mockRejectedValue(new Error(errorMessage));

      await expect(service.listRepositories()).rejects.toThrow(errorMessage);
    });
  });

  describe('createRepository', () => {
    it('should throw error when not authenticated', async () => {
      await expect(service.createRepository('new-repo')).rejects.toThrow(
        'Not authenticated with GitHub',
      );
    });

    it('should create public repository when authenticated', async () => {
      const repoName = 'new-repo';
      const repoData = { id: 1, name: repoName, private: false };

      // Authenticate first
      mockOctokit.rest.users.getAuthenticated.mockResolvedValue({ data: { login: 'testuser' } });
      await service.authenticate('valid_token');

      // Mock repository creation
      mockOctokit.rest.repos.createForAuthenticatedUser.mockResolvedValue({ data: repoData });

      const result = await service.createRepository(repoName);

      expect(mockOctokit.rest.repos.createForAuthenticatedUser).toHaveBeenCalledWith({
        name: repoName,
        description: undefined,
        private: undefined,
        is_template: undefined,
      });
      expect(result).toEqual(repoData);
    });

    it('should create private repository when authenticated', async () => {
      const repoName = 'private-repo';
      const repoDescription = 'A private repository';
      const repoData = { id: 2, name: repoName, private: true, description: repoDescription };

      // Authenticate first
      mockOctokit.rest.users.getAuthenticated.mockResolvedValue({ data: { login: 'testuser' } });
      await service.authenticate('valid_token');

      // Mock repository creation
      mockOctokit.rest.repos.createForAuthenticatedUser.mockResolvedValue({ data: repoData });

      const result = await service.createRepository(repoName, {
        description: repoDescription,
        private: true,
      });

      expect(mockOctokit.rest.repos.createForAuthenticatedUser).toHaveBeenCalledWith({
        name: repoName,
        description: repoDescription,
        private: true,
        is_template: undefined,
      });
      expect(result).toEqual(repoData);
    });

    it('should handle errors when creating repository', async () => {
      const repoName = 'existing-repo';
      const errorMessage = 'Repository already exists';

      // Authenticate first
      mockOctokit.rest.users.getAuthenticated.mockResolvedValue({ data: { login: 'testuser' } });
      await service.authenticate('valid_token');

      // Mock error
      mockOctokit.rest.repos.createForAuthenticatedUser.mockRejectedValue(new Error(errorMessage));

      await expect(service.createRepository(repoName)).rejects.toThrow(errorMessage);
    });
  });

  describe('browser environment limitations', () => {
    it('should throw error when trying to clone repository', async () => {
      await expect(
        service.cloneRepository('https://github.com/user/repo.git', '/path'),
      ).rejects.toThrow('Cloning repositories is not supported in browser environments');
    });

    it('should throw error when trying to push to repository', async () => {
      await expect(service.pushToRepository('origin', 'main')).rejects.toThrow(
        'Pushing to repositories is not supported in browser environments',
      );
    });

    it('should throw error when trying to pull from repository', async () => {
      await expect(service.pullFromRepository('origin', 'main')).rejects.toThrow(
        'Pulling from repositories is not supported in browser environments',
      );
    });
  });
});
