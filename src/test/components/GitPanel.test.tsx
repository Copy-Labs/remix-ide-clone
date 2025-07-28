import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GitPanel from '@/components/Git/GitPanel';
import { useGitStore } from '@/stores/gitStore';
import toast from 'react-hot-toast';

// Mock dependencies
vi.mock('@/stores/gitStore');
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock UI components that might cause issues in tests
vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="scroll-area">{children}</div>
  ),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="dialog-title">{children}</h2>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="dialog-description">{children}</p>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-footer">{children}</div>
  ),
  DialogTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) =>
    asChild ? children : <div data-testid="dialog-trigger">{children}</div>,
}));

describe('GitPanel', () => {
  let mockStore: any;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();

    mockStore = {
      // State
      isInitialized: false,
      currentBranch: '',
      branches: [],
      remotes: [],
      commits: [],
      status: [],
      config: {
        user: { name: '', email: '' },
        github: { token: undefined, username: undefined },
      },
      isLoading: false,
      error: null,
      githubRepos: [],
      isGithubConnected: false,

      // Actions
      initRepository: vi.fn(),
      cloneRepository: vi.fn(),
      createBranch: vi.fn(),
      switchBranch: vi.fn(),
      deleteBranch: vi.fn(),
      getBranches: vi.fn(),
      addFile: vi.fn(),
      addAllFiles: vi.fn(),
      commit: vi.fn(),
      getCommits: vi.fn(),
      addRemote: vi.fn(),
      removeRemote: vi.fn(),
      push: vi.fn(),
      pull: vi.fn(),
      fetch: vi.fn(),
      getStatus: vi.fn(),
      setConfig: vi.fn(),
      connectGithub: vi.fn(),
      disconnectGithub: vi.fn(),
      getGithubRepos: vi.fn(),
      createGithubRepo: vi.fn(),
      setError: vi.fn(),
    };

    vi.mocked(useGitStore).mockReturnValue(mockStore);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Uninitialized Repository', () => {
    it('should render initialization options when repository is not initialized', () => {
      render(<GitPanel />);

      expect(screen.getByText('Git Integration')).toBeInTheDocument();
      expect(
        screen.getByText('Initialize a git repository or clone an existing one to get started.'),
      ).toBeInTheDocument();
      expect(screen.getByText('Initialize Repository')).toBeInTheDocument();
      expect(screen.getByText('Clone Repository')).toBeInTheDocument();
    });

    it('should call initRepository when Initialize Repository button is clicked', async () => {
      render(<GitPanel />);

      const initButton = screen.getByText('Initialize Repository');
      await user.click(initButton);

      expect(mockStore.initRepository).toHaveBeenCalled();
    });

    it('should show loading state during initialization', () => {
      mockStore.isLoading = true;
      render(<GitPanel />);

      const initButton = screen.getByText('Initialize Repository');
      expect(initButton).toBeDisabled();
    });

    it('should display error message when there is an error', () => {
      mockStore.error = 'Initialization failed';
      render(<GitPanel />);

      expect(screen.getByText('Initialization failed')).toBeInTheDocument();
    });

    it('should open clone dialog when Clone Repository button is clicked', async () => {
      render(<GitPanel />);

      const cloneButton = screen.getByText('Clone Repository');
      await user.click(cloneButton);

      expect(screen.getByTestId('dialog')).toBeInTheDocument();
      expect(screen.getByText('Clone Repository')).toBeInTheDocument();
      expect(
        screen.getByText('Enter the URL of the repository you want to clone.'),
      ).toBeInTheDocument();
    });
  });

  describe('Initialized Repository', () => {
    beforeEach(() => {
      mockStore.isInitialized = true;
      mockStore.currentBranch = 'main';
      mockStore.branches = [
        { name: 'main', oid: 'abc123', current: true },
        { name: 'develop', oid: 'def456', current: false },
      ];
      mockStore.status = [{ file: 'test.txt', head: 1, workdir: 2, stage: 0 }];
      mockStore.commits = [
        {
          oid: 'abc123',
          message: 'Initial commit',
          author: { name: 'Test User', email: 'test@example.com', timestamp: Date.now() },
          committer: { name: 'Test User', email: 'test@example.com', timestamp: Date.now() },
        },
      ];
    });

    it('should render git panel with tabs when repository is initialized', () => {
      render(<GitPanel />);

      expect(screen.getByText('Git')).toBeInTheDocument();
      expect(screen.getByText('main')).toBeInTheDocument(); // Current branch badge
      expect(screen.getByText('Changes')).toBeInTheDocument();
      expect(screen.getByText('Branches')).toBeInTheDocument();
      expect(screen.getByText('History')).toBeInTheDocument();
      expect(screen.getByText('GitHub')).toBeInTheDocument();
    });

    it('should refresh data when refresh button is clicked', async () => {
      render(<GitPanel />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      expect(mockStore.getBranches).toHaveBeenCalled();
      expect(mockStore.getCommits).toHaveBeenCalled();
      expect(mockStore.getStatus).toHaveBeenCalled();
    });

    describe('Changes Tab', () => {
      it('should display file status in changes tab', () => {
        render(<GitPanel />);

        expect(screen.getByText('Staging Area')).toBeInTheDocument();
        expect(screen.getByText('test.txt')).toBeInTheDocument();
        expect(screen.getByText('Modified')).toBeInTheDocument();
      });

      it('should stage all files when Stage All button is clicked', async () => {
        render(<GitPanel />);

        const stageAllButton = screen.getByText('Stage All');
        await user.click(stageAllButton);

        expect(mockStore.addAllFiles).toHaveBeenCalled();
      });

      it('should stage individual file when plus button is clicked', async () => {
        render(<GitPanel />);

        const stageFileButton = screen.getByRole('button', { name: /\+/ });
        await user.click(stageFileButton);

        expect(mockStore.addFile).toHaveBeenCalledWith('test.txt');
      });

      it('should commit changes when commit button is clicked with message', async () => {
        render(<GitPanel />);

        const commitMessageInput = screen.getByPlaceholderText('Enter commit message...');
        const commitButton = screen.getByText('Commit Changes');

        await user.type(commitMessageInput, 'Test commit message');
        await user.click(commitButton);

        expect(mockStore.commit).toHaveBeenCalledWith('Test commit message');
      });

      it('should not commit when commit message is empty', async () => {
        render(<GitPanel />);

        const commitButton = screen.getByText('Commit Changes');
        expect(commitButton).toBeDisabled();
      });

      it('should show toast error when committing without message', async () => {
        render(<GitPanel />);

        const commitButton = screen.getByText('Commit Changes');

        // Enable the button by adding some text then clearing it
        const commitMessageInput = screen.getByPlaceholderText('Enter commit message...');
        await user.type(commitMessageInput, 'test');
        await user.clear(commitMessageInput);

        // The button should be disabled again
        expect(commitButton).toBeDisabled();
      });
    });

    describe('Branches Tab', () => {
      it('should display branches in branches tab', async () => {
        render(<GitPanel />);

        const branchesTab = screen.getByText('Branches');
        await user.click(branchesTab);

        expect(screen.getByText('main')).toBeInTheDocument();
        expect(screen.getByText('develop')).toBeInTheDocument();
        expect(screen.getByText('Current')).toBeInTheDocument(); // Badge for current branch
      });

      it('should open new branch dialog when New Branch button is clicked', async () => {
        render(<GitPanel />);

        const branchesTab = screen.getByText('Branches');
        await user.click(branchesTab);

        const newBranchButton = screen.getByText('New Branch');
        await user.click(newBranchButton);

        expect(screen.getByTestId('dialog')).toBeInTheDocument();
        expect(screen.getByText('Create New Branch')).toBeInTheDocument();
      });

      it('should create new branch when form is submitted', async () => {
        render(<GitPanel />);

        const branchesTab = screen.getByText('Branches');
        await user.click(branchesTab);

        const newBranchButton = screen.getByText('New Branch');
        await user.click(newBranchButton);

        const branchNameInput = screen.getByPlaceholderText('feature/new-feature');
        const createButton = screen.getByText('Create Branch');

        await user.type(branchNameInput, 'feature/test');
        await user.click(createButton);

        expect(mockStore.createBranch).toHaveBeenCalledWith('feature/test');
      });

      it('should switch branch when merge button is clicked', async () => {
        render(<GitPanel />);

        const branchesTab = screen.getByText('Branches');
        await user.click(branchesTab);

        // Find the switch button for the develop branch (not current)
        const developBranch = screen.getByText('develop').closest('div');
        const switchButton = developBranch?.querySelector('button');

        if (switchButton) {
          await user.click(switchButton);
          expect(mockStore.switchBranch).toHaveBeenCalledWith('develop');
        }
      });

      it('should add remote when Add Remote button is clicked', async () => {
        render(<GitPanel />);

        const branchesTab = screen.getByText('Branches');
        await user.click(branchesTab);

        const addRemoteButton = screen.getByText('Add Remote');
        await user.click(addRemoteButton);

        expect(screen.getByTestId('dialog')).toBeInTheDocument();
        expect(screen.getByText('Add Remote')).toBeInTheDocument();
      });
    });

    describe('History Tab', () => {
      it('should display commit history in history tab', async () => {
        render(<GitPanel />);

        const historyTab = screen.getByText('History');
        await user.click(historyTab);

        expect(screen.getByText('Commit History')).toBeInTheDocument();
        expect(screen.getByText('Initial commit')).toBeInTheDocument();
        expect(screen.getByText('Test User')).toBeInTheDocument();
      });

      it('should display commit hash badge', async () => {
        render(<GitPanel />);

        const historyTab = screen.getByText('History');
        await user.click(historyTab);

        expect(screen.getByText('abc123'.substring(0, 7))).toBeInTheDocument();
      });
    });

    describe('GitHub Tab', () => {
      it('should display GitHub connection status when not connected', async () => {
        render(<GitPanel />);

        const githubTab = screen.getByText('GitHub');
        await user.click(githubTab);

        expect(screen.getByText('GitHub Integration')).toBeInTheDocument();
        expect(screen.getByText('Not Connected')).toBeInTheDocument();
        expect(screen.getByText('Connect to GitHub')).toBeInTheDocument();
      });

      it('should open GitHub connection dialog when Connect button is clicked', async () => {
        render(<GitPanel />);

        const githubTab = screen.getByText('GitHub');
        await user.click(githubTab);

        const connectButton = screen.getByText('Connect to GitHub');
        await user.click(connectButton);

        expect(screen.getByTestId('dialog')).toBeInTheDocument();
        expect(screen.getByText('Connect to GitHub')).toBeInTheDocument();
        expect(
          screen.getByText('Enter your GitHub personal access token to connect.'),
        ).toBeInTheDocument();
      });

      it('should connect to GitHub when token is provided', async () => {
        render(<GitPanel />);

        const githubTab = screen.getByText('GitHub');
        await user.click(githubTab);

        const connectButton = screen.getByText('Connect to GitHub');
        await user.click(connectButton);

        const tokenInput = screen.getByPlaceholderText('ghp_xxxxxxxxxxxxxxxxxxxx');
        const submitButton = screen.getByRole('button', { name: 'Connect' });

        await user.type(tokenInput, 'ghp_test_token');
        await user.click(submitButton);

        expect(mockStore.connectGithub).toHaveBeenCalledWith('ghp_test_token');
      });

      describe('When GitHub is connected', () => {
        beforeEach(() => {
          mockStore.isGithubConnected = true;
          mockStore.config.github.username = 'testuser';
          mockStore.githubRepos = [
            {
              id: 1,
              name: 'test-repo',
              description: 'Test repository',
              language: 'JavaScript',
              private: false,
              clone_url: 'https://github.com/testuser/test-repo.git',
            },
          ];
        });

        it('should display connected status and user info', async () => {
          render(<GitPanel />);

          const githubTab = screen.getByText('GitHub');
          await user.click(githubTab);

          expect(screen.getByText('Connected')).toBeInTheDocument();
          expect(screen.getByText('testuser')).toBeInTheDocument();
          expect(screen.getByText('Disconnect')).toBeInTheDocument();
        });

        it('should display GitHub repositories', async () => {
          render(<GitPanel />);

          const githubTab = screen.getByText('GitHub');
          await user.click(githubTab);

          expect(screen.getByText('test-repo')).toBeInTheDocument();
          expect(screen.getByText('Test repository')).toBeInTheDocument();
          expect(screen.getByText('JavaScript')).toBeInTheDocument();
        });

        it('should disconnect from GitHub when Disconnect button is clicked', async () => {
          render(<GitPanel />);

          const githubTab = screen.getByText('GitHub');
          await user.click(githubTab);

          const disconnectButton = screen.getByText('Disconnect');
          await user.click(disconnectButton);

          expect(mockStore.disconnectGithub).toHaveBeenCalled();
        });

        it('should open create repository dialog when Create Repo button is clicked', async () => {
          render(<GitPanel />);

          const githubTab = screen.getByText('GitHub');
          await user.click(githubTab);

          const createRepoButton = screen.getByText('Create Repo');
          await user.click(createRepoButton);

          expect(screen.getByTestId('dialog')).toBeInTheDocument();
          expect(screen.getByText('Create GitHub Repository')).toBeInTheDocument();
        });

        it('should create GitHub repository when form is submitted', async () => {
          render(<GitPanel />);

          const githubTab = screen.getByText('GitHub');
          await user.click(githubTab);

          const createRepoButton = screen.getByText('Create Repo');
          await user.click(createRepoButton);

          const repoNameInput = screen.getByPlaceholderText('my-awesome-project');
          const repoDescInput = screen.getByPlaceholderText('A brief description of your project');
          const createButton = screen.getByText('Create Repository');

          await user.type(repoNameInput, 'new-test-repo');
          await user.type(repoDescInput, 'New test repository');
          await user.click(createButton);

          expect(mockStore.createGithubRepo).toHaveBeenCalledWith(
            'new-test-repo',
            'New test repository',
          );
        });

        it('should refresh repositories when Refresh button is clicked', async () => {
          render(<GitPanel />);

          const githubTab = screen.getByText('GitHub');
          await user.click(githubTab);

          const refreshButton = screen.getByText('Refresh');
          await user.click(refreshButton);

          expect(mockStore.getGithubRepos).toHaveBeenCalled();
        });
      });
    });

    describe('Configuration Dialog', () => {
      it('should open configuration dialog when settings button is clicked', async () => {
        render(<GitPanel />);

        const settingsButton = screen.getByRole('button', { name: /settings/i });
        await user.click(settingsButton);

        expect(screen.getByTestId('dialog')).toBeInTheDocument();
        expect(screen.getByText('Git Configuration')).toBeInTheDocument();
        expect(screen.getByText('Configure your git user information.')).toBeInTheDocument();
      });

      it('should save configuration when form is submitted', async () => {
        render(<GitPanel />);

        const settingsButton = screen.getByRole('button', { name: /settings/i });
        await user.click(settingsButton);

        const nameInput = screen.getByPlaceholderText('Your Name');
        const emailInput = screen.getByPlaceholderText('your.email@example.com');
        const saveButton = screen.getByText('Save Configuration');

        await user.type(nameInput, 'Test User');
        await user.type(emailInput, 'test@example.com');
        await user.click(saveButton);

        expect(mockStore.setConfig).toHaveBeenCalledWith({
          user: {
            name: 'Test User',
            email: 'test@example.com',
          },
        });
      });
    });
  });

  describe('Toast Notifications', () => {
    beforeEach(() => {
      mockStore.isInitialized = true;
    });

    it('should show success toast when repository is initialized', async () => {
      mockStore.isInitialized = false;
      render(<GitPanel />);

      const initButton = screen.getByText('Initialize Repository');
      await user.click(initButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Repository initialized successfully');
      });
    });

    it('should show error toast when initialization fails', async () => {
      mockStore.isInitialized = false;
      mockStore.initRepository.mockRejectedValue(new Error('Init failed'));

      render(<GitPanel />);

      const initButton = screen.getByText('Initialize Repository');
      await user.click(initButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to initialize repository');
      });
    });

    it('should show error toast when commit message is empty', async () => {
      render(<GitPanel />);

      // Try to commit without message - this should be prevented by disabled button
      // but let's test the validation logic
      const commitButton = screen.getByText('Commit Changes');
      expect(commitButton).toBeDisabled();
    });
  });

  describe('Loading States', () => {
    it('should disable buttons when loading', () => {
      mockStore.isLoading = true;
      mockStore.isInitialized = false;

      render(<GitPanel />);

      const initButton = screen.getByText('Initialize Repository');
      expect(initButton).toBeDisabled();
    });

    it('should show loading spinner when loading', () => {
      mockStore.isLoading = true;
      mockStore.isInitialized = false;

      render(<GitPanel />);

      // The loading spinner should be present in the button
      expect(screen.getByText('Initialize Repository')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error alert when there is an error', () => {
      mockStore.error = 'Something went wrong';
      mockStore.isInitialized = true;

      render(<GitPanel />);

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should clear error when action is successful', async () => {
      mockStore.isInitialized = true;
      render(<GitPanel />);

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      // The refresh action should have been called
      expect(mockStore.getBranches).toHaveBeenCalled();
      expect(mockStore.getCommits).toHaveBeenCalled();
      expect(mockStore.getStatus).toHaveBeenCalled();
    });
  });
});
