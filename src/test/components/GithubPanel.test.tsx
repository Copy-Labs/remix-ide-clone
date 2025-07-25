import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GithubPanel from '@/components/Git/GithubPanel';
import { useGitStore } from '@/stores/gitStore';
import { toast } from 'sonner';

// Mock dependencies
vi.mock('@/stores/gitStore');
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock UI components that might cause issues in tests
vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div data-testid="scroll-area">{children}</div>,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2 data-testid="dialog-title">{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p data-testid="dialog-description">{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-footer">{children}</div>,
  DialogTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) =>
    asChild ? children : <div data-testid="dialog-trigger">{children}</div>,
}));

describe('GithubPanel', () => {
  let mockStore: any;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();

    mockStore = {
      // State
      config: {
        user: { name: 'Test User', email: 'test@example.com' },
        github: { token: undefined, username: undefined },
      },
      isGithubConnected: false,
      githubRepos: [],
      isLoading: false,
      error: null,
      githubRepoPagination: {
        page: 1,
        perPage: 30,
        hasNextPage: false,
        totalCount: 0,
      },

      // Actions
      connectGithub: vi.fn(),
      disconnectGithub: vi.fn(),
      getGithubRepos: vi.fn(),
      loadMoreGithubRepos: vi.fn(),
      createGithubRepo: vi.fn(),
      setError: vi.fn(),
    };

    vi.mocked(useGitStore).mockReturnValue(mockStore);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Not Connected State', () => {
    it('should render connection form when not connected to GitHub', () => {
      render(<GithubPanel />);

      expect(screen.getByText('GitHub Integration')).toBeInTheDocument();
      expect(screen.getByText('Connect to GitHub to access your repositories.')).toBeInTheDocument();
      expect(screen.getByText('Personal Access Token')).toBeInTheDocument();
      expect(screen.getByText('Connect to GitHub')).toBeInTheDocument();
    });

    it('should disable connect button when token is empty', () => {
      render(<GithubPanel />);

      const connectButton = screen.getByText('Connect to GitHub');
      expect(connectButton).toBeDisabled();
    });

    it('should enable connect button when token is provided', async () => {
      render(<GithubPanel />);

      const tokenInput = screen.getByPlaceholderText('ghp_...');
      await user.type(tokenInput, 'test_token');

      const connectButton = screen.getByText('Connect to GitHub');
      expect(connectButton).not.toBeDisabled();
    });

    it('should call connectGithub when connect button is clicked', async () => {
      render(<GithubPanel />);

      const tokenInput = screen.getByPlaceholderText('ghp_...');
      await user.type(tokenInput, 'test_token');

      const connectButton = screen.getByText('Connect to GitHub');
      await user.click(connectButton);

      expect(mockStore.connectGithub).toHaveBeenCalledWith('test_token');
    });

    it('should show success toast when connection is successful', async () => {
      mockStore.connectGithub.mockResolvedValue(undefined);

      render(<GithubPanel />);

      const tokenInput = screen.getByPlaceholderText('ghp_...');
      await user.type(tokenInput, 'test_token');

      const connectButton = screen.getByText('Connect to GitHub');
      await user.click(connectButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Connected to GitHub successfully');
      });
    });

    it('should show error toast when connection fails', async () => {
      mockStore.connectGithub.mockRejectedValue(new Error('Connection failed'));

      render(<GithubPanel />);

      const tokenInput = screen.getByPlaceholderText('ghp_...');
      await user.type(tokenInput, 'test_token');

      const connectButton = screen.getByText('Connect to GitHub');
      await user.click(connectButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to connect to GitHub');
      });
    });

    it('should show loading state during connection', async () => {
      mockStore.isLoading = true;

      render(<GithubPanel />);

      const tokenInput = screen.getByPlaceholderText('ghp_...');
      await user.type(tokenInput, 'test_token');

      const connectButton = screen.getByText('Connect to GitHub');
      expect(connectButton).toBeDisabled();
    });

    it('should display error message when there is an error', () => {
      mockStore.error = 'Invalid token';

      render(<GithubPanel />);

      expect(screen.getByText('Invalid token')).toBeInTheDocument();
    });
  });

  describe('Connected State', () => {
    beforeEach(() => {
      mockStore.isGithubConnected = true;
      mockStore.config.github.username = 'testuser';
    });

    it('should render repositories section when connected to GitHub', () => {
      render(<GithubPanel />);

      expect(screen.getByText('GitHub')).toBeInTheDocument();
      expect(screen.getByText('testuser')).toBeInTheDocument();
      expect(screen.getByText('Repositories')).toBeInTheDocument();
    });

    it('should call disconnectGithub when disconnect button is clicked', async () => {
      render(<GithubPanel />);

      // Find the logout button (it has a title or aria-label)
      const disconnectButton = screen.getByRole('button', { name: /logout/i });
      await user.click(disconnectButton);

      expect(mockStore.disconnectGithub).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Disconnected from GitHub');
    });

    it('should call getGithubRepos when refresh button is clicked', async () => {
      render(<GithubPanel />);

      // Find the refresh button (it has a title or aria-label)
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      expect(mockStore.getGithubRepos).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Repositories refreshed');
    });

    it('should show message when no repositories are found', () => {
      mockStore.githubRepos = [];

      render(<GithubPanel />);

      expect(screen.getByText('No repositories found')).toBeInTheDocument();
    });

    it('should render repository list when repositories exist', () => {
      mockStore.githubRepos = [
        { id: 1, name: 'repo1', private: false, language: 'JavaScript', forks_count: 0 },
        { id: 2, name: 'repo2', private: true, language: 'TypeScript', forks_count: 2 },
      ];
      mockStore.githubRepoPagination = {
        page: 1,
        perPage: 30,
        hasNextPage: false,
        totalCount: 2,
      };

      render(<GithubPanel />);

      expect(screen.getByText('repo1')).toBeInTheDocument();
      expect(screen.getByText('repo2')).toBeInTheDocument();
      expect(screen.getByText('Private')).toBeInTheDocument();
      expect(screen.getByText('Public')).toBeInTheDocument();
      expect(screen.getByText('Showing 2 of 2 repositories')).toBeInTheDocument();
    });

    it('should show load more button when there are more repositories', () => {
      mockStore.githubRepos = [
        { id: 1, name: 'repo1', private: false, language: 'JavaScript', forks_count: 0 },
        { id: 2, name: 'repo2', private: true, language: 'TypeScript', forks_count: 2 },
      ];
      mockStore.githubRepoPagination = {
        page: 1,
        perPage: 2,
        hasNextPage: true,
        totalCount: 5,
      };

      render(<GithubPanel />);

      expect(screen.getByText('Load More Repositories')).toBeInTheDocument();
      expect(screen.getByText('Showing 2 of 5 repositories')).toBeInTheDocument();
    });

    it('should call loadMoreGithubRepos when load more button is clicked', async () => {
      mockStore.githubRepos = [
        { id: 1, name: 'repo1', private: false, language: 'JavaScript', forks_count: 0 },
        { id: 2, name: 'repo2', private: true, language: 'TypeScript', forks_count: 2 },
      ];
      mockStore.githubRepoPagination = {
        page: 1,
        perPage: 2,
        hasNextPage: true,
        totalCount: 5,
      };
      mockStore.loadMoreGithubRepos = vi.fn().mockResolvedValue(undefined);

      render(<GithubPanel />);

      const loadMoreButton = screen.getByText('Load More Repositories');
      await user.click(loadMoreButton);

      expect(mockStore.loadMoreGithubRepos).toHaveBeenCalled();
    });

    it('should disable load more button when loading', () => {
      mockStore.githubRepos = [
        { id: 1, name: 'repo1', private: false, language: 'JavaScript', forks_count: 0 },
        { id: 2, name: 'repo2', private: true, language: 'TypeScript', forks_count: 2 },
      ];
      mockStore.githubRepoPagination = {
        page: 1,
        perPage: 2,
        hasNextPage: true,
        totalCount: 5,
      };
      mockStore.isLoading = true;

      render(<GithubPanel />);

      const loadMoreButton = screen.getByText('Load More Repositories');
      expect(loadMoreButton).toBeDisabled();
    });

    it('should open create repository dialog when create button is clicked', async () => {
      render(<GithubPanel />);

      // Find the create button (it's near the "Repositories" text)
      const createButton = screen.getByRole('button', { name: /plus/i });
      await user.click(createButton);

      expect(screen.getByText('Create New Repository')).toBeInTheDocument();
    });

    it('should call createGithubRepo when create form is submitted', async () => {
      mockStore.createGithubRepo.mockResolvedValue(undefined);

      render(<GithubPanel />);

      // Open the create dialog
      const createButton = screen.getByRole('button', { name: /plus/i });
      await user.click(createButton);

      // Fill the form
      const nameInput = screen.getByLabelText('Repository Name');
      await user.type(nameInput, 'new-repo');

      const descriptionInput = screen.getByLabelText('Description (optional)');
      await user.type(descriptionInput, 'A new repository');

      // Submit the form
      const submitButton = screen.getByRole('button', { name: 'Create' });
      await user.click(submitButton);

      expect(mockStore.createGithubRepo).toHaveBeenCalledWith('new-repo', {
        description: 'A new repository',
        private: false,
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Repository 'new-repo' created successfully");
      });
    });

    it('should create private repository when private option is selected', async () => {
      mockStore.createGithubRepo.mockResolvedValue(undefined);

      render(<GithubPanel />);

      // Open the create dialog
      const createButton = screen.getByRole('button', { name: /plus/i });
      await user.click(createButton);

      // Fill the form
      const nameInput = screen.getByLabelText('Repository Name');
      await user.type(nameInput, 'private-repo');

      // Toggle private switch
      const privateSwitch = screen.getByRole('switch', { name: 'Private Repository' });
      await user.click(privateSwitch);

      // Submit the form
      const submitButton = screen.getByRole('button', { name: 'Create' });
      await user.click(submitButton);

      expect(mockStore.createGithubRepo).toHaveBeenCalledWith('private-repo', {
        description: '',
        private: true,
      });
    });

    it('should show error toast when repository creation fails', async () => {
      mockStore.createGithubRepo.mockRejectedValue(new Error('Creation failed'));

      render(<GithubPanel />);

      // Open the create dialog
      const createButton = screen.getByRole('button', { name: /plus/i });
      await user.click(createButton);

      // Fill the form
      const nameInput = screen.getByLabelText('Repository Name');
      await user.type(nameInput, 'new-repo');

      // Submit the form
      const submitButton = screen.getByRole('button', { name: 'Create' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to create repository');
      });
    });

    it('should disable create button when repository name is empty', async () => {
      render(<GithubPanel />);

      // Open the create dialog
      const createButton = screen.getByRole('button', { name: /plus/i });
      await user.click(createButton);

      // Submit button should be disabled
      const submitButton = screen.getByRole('button', { name: 'Create' });
      expect(submitButton).toBeDisabled();

      // Type a name
      const nameInput = screen.getByLabelText('Repository Name');
      await user.type(nameInput, 'new-repo');

      // Submit button should be enabled
      expect(submitButton).not.toBeDisabled();
    });
  });
});
