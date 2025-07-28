import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UnifiedGitPanel from '@/components/Git/UnifiedGitPanel';
import { useGitStore } from '@/stores/gitStore';
import { useFileStore } from '@/stores/fileStore';
import { usePluginStore } from '@/stores/pluginStore';
import { toast } from 'sonner';
import { databaseService } from '@/services/databaseService';

// Mock dependencies
vi.mock('@/stores/gitStore');
vi.mock('@/stores/fileStore');
vi.mock('@/stores/pluginStore');
vi.mock('@/stores/compilerStore', () => ({
  useCompilerStore: vi.fn(() => ({
    isCompiling: false,
    compile: vi.fn(),
    setAutoCommitEnabled: vi.fn(),
    isAutoCommitEnabled: true,
    loadAvailableVersions: vi.fn(),
  })),
}));

// Mock the GitPluginImplementation class
vi.mock('@/plugins/gitPlugin', () => {
  const mockAddFiles = vi.fn().mockImplementation(() => {
    return Promise.resolve(true);
  });

  return {
    GitPluginImplementation: vi.fn().mockImplementation(() => ({
      addFiles: mockAddFiles,
      createBranch: vi.fn().mockResolvedValue(true),
      switchBranch: vi.fn().mockResolvedValue(true),
      configureRemote: vi.fn(),
      initRepository: vi.fn().mockResolvedValue(true),
      commit: vi.fn().mockResolvedValue(true),
      push: vi.fn().mockResolvedValue(true),
      pull: vi.fn().mockResolvedValue(true),
      getCurrentBranch: vi.fn().mockResolvedValue('main'),
      getStatus: vi.fn().mockResolvedValue([]),
      configureUser: vi.fn(),
    })),
  };
});

// Mock the database service methods
vi.mock('@/services/databaseService', () => ({
  databaseService: {
    isIndexedDBSupported: vi.fn(() => true),
    initialize: vi.fn(),
    saveFile: vi.fn(),
    getFile: vi.fn(),
    deleteFile: vi.fn(),
    clearDatabase: vi.fn(),
    saveFileContent: vi.fn(),
    getFileContent: vi.fn(),
    deleteFileContent: vi.fn(),
    saveEditorHistory: vi.fn(),
    getEditorHistory: vi.fn(),
    clearEditorHistory: vi.fn(),
    saveStateMigration: vi.fn(),
    getStateMigration: vi.fn(),
    clearAllData: vi.fn(),
    getDatabaseSize: vi.fn(),
    set: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
}));
vi.mock('sonner', () => ({
  toast: {
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

// Mock GitBranchVisualizer component
vi.mock('@/components/Git/GitBranchVisualizer', () => ({
  default: () => <div data-testid="git-branch-visualizer">Branch Visualizer Mock</div>,
}));

// Mock GitErrorBanner component
vi.mock('@/components/Git/GitErrorBanner', () => ({
  GitErrorBanner: ({ error }: { error: string | null }) =>
    error ? <div data-testid="git-error-banner">{error}</div> : null,
}));

describe('UnifiedGitPanel', () => {
  let mockGitStore: any;
  let mockFileStore: any;
  let mockPluginStore: any;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();

    mockGitStore = {
      // State
      isInitialized: false,
      currentBranch: '',
      branches: [],
      commits: [],
      status: [],
      config: {
        user: { name: '', email: '' },
      },
      isLoading: false,
      error: null,

      // Actions
      initRepository: vi.fn(),
      createInitialCommit: vi.fn(),
      createBranch: vi.fn(),
      switchBranch: vi.fn(),
      deleteBranch: vi.fn(),
      getBranches: vi.fn(),
      addFile: vi.fn(),
      unstageFile: vi.fn(),
      addAllFiles: vi.fn(),
      commit: vi.fn(),
      getCommits: vi.fn(),
      getStatus: vi.fn(),
      setConfig: vi.fn(),
      setError: vi.fn(),
      resetGitIndex: vi.fn(),
    };

    mockFileStore = {
      files: new Map(),
    };

    // Mock the plugin store to return a plugin with the necessary configuration
    mockPluginStore = {
      getPlugin: vi.fn().mockReturnValue({
        config: {
          remoteUrl: 'https://github.com/user/repo.git',
          username: 'Test User',
          email: 'test@example.com',
        },
      }),
      updatePluginConfig: vi.fn(),
    };

    vi.mocked(useGitStore).mockReturnValue(mockGitStore);
    vi.mocked(useFileStore).mockReturnValue(mockFileStore);
    vi.mocked(usePluginStore).mockReturnValue(mockPluginStore);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Uninitialized Repository', () => {
    it('should render initialization options when repository is not initialized', () => {
      render(<UnifiedGitPanel />);

      expect(screen.getByText('Git Integration')).toBeInTheDocument();
      expect(screen.getByText('Initialize a git repository to get started.')).toBeInTheDocument();
      expect(screen.getByText('Initialize Repository')).toBeInTheDocument();
    });

    it('should call initRepository when Initialize Repository button is clicked', async () => {
      render(<UnifiedGitPanel />);

      const initButton = screen.getByText('Initialize Repository');
      await user.click(initButton);

      expect(mockGitStore.initRepository).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Repository initialized successfully');
    });

    it('should show loading state during initialization', () => {
      mockGitStore.isLoading = true;
      render(<UnifiedGitPanel />);

      const initButton = screen.getByText('Initialize Repository');
      expect(initButton).toBeDisabled();
    });

    it('should display error message when there is an error', () => {
      mockGitStore.error = 'Initialization failed';
      render(<UnifiedGitPanel />);

      // Check that the error is displayed in the alert
      const errorElements = screen.getAllByText('Initialization failed');
      expect(errorElements.length).toBeGreaterThan(0);
    });
  });

  describe('Initialized Repository', () => {
    beforeEach(() => {
      mockGitStore.isInitialized = true;
      mockGitStore.currentBranch = 'main';
      mockGitStore.branches = [
        { name: 'main', oid: 'abc123', current: true },
        { name: 'develop', oid: 'def456', current: false },
      ];
      mockGitStore.status = [{ file: 'test.txt', head: 1, workdir: 2, stage: 0 }];
      mockGitStore.commits = [
        {
          oid: 'abc123',
          message: 'Initial commit',
          author: { name: 'Test User', email: 'test@example.com', timestamp: Date.now() / 1000 },
          committer: { name: 'Test User', email: 'test@example.com', timestamp: Date.now() / 1000 },
        },
      ];
    });

    it('should render git panel with tabs when repository is initialized', () => {
      render(<UnifiedGitPanel />);

      expect(screen.getByText('Git')).toBeInTheDocument();
      expect(screen.getByText('main')).toBeInTheDocument(); // Current branch badge
      expect(screen.getByText('Changes')).toBeInTheDocument();
      expect(screen.getByText('Branches')).toBeInTheDocument();
      expect(screen.getByText('History')).toBeInTheDocument();
    });

    it('should refresh data when refresh button is clicked', async () => {
      render(<UnifiedGitPanel />);

      // Find the refresh button by its icon role
      const refreshButton = screen.getAllByRole('button')[3]; // This is the refresh button based on the component structure
      await user.click(refreshButton);

      expect(mockGitStore.getBranches).toHaveBeenCalled();
      expect(mockGitStore.getCommits).toHaveBeenCalled();
      expect(mockGitStore.getStatus).toHaveBeenCalled();
    });

    describe('Changes Tab', () => {
      it('should display file status in changes tab', () => {
        render(<UnifiedGitPanel />);

        expect(screen.getByText('Unstaged Changes')).toBeInTheDocument();
        expect(screen.getByText('test.txt')).toBeInTheDocument();
        expect(screen.getByText('Modified')).toBeInTheDocument();
      });

      it('should stage all files when Stage All button is clicked', async () => {
        render(<UnifiedGitPanel />);

        // Find the stage all button (plus icon in the unstaged changes header)
        const stageAllButton = screen.getAllByRole('button')[4]; // This is the stage all button based on the component structure
        await user.click(stageAllButton);

        expect(mockGitStore.addAllFiles).toHaveBeenCalled();
      });

      it('should stage individual file when plus button is clicked', async () => {
        render(<UnifiedGitPanel />);

        // Find the stage file button for test.txt
        const stageFileButtons = screen.getAllByRole('button');
        const stageFileButton = stageFileButtons.find(
          (button) => button.getAttribute('title') === 'Stage File',
        );

        if (stageFileButton) {
          await user.click(stageFileButton);
          expect(mockGitStore.addFile).toHaveBeenCalledWith('test.txt');
        } else {
          throw new Error('Stage file button not found');
        }
      });

      it('should commit changes when commit button is clicked with message', async () => {
        // Add a staged file to enable the commit button
        mockGitStore.status = [{ file: 'test.txt', head: 1, workdir: 2, stage: 2 }];

        render(<UnifiedGitPanel />);

        const commitMessageTextarea = screen.getByPlaceholderText('Enter commit message...');
        const commitButton = screen.getByText('Commit Changes');

        await user.type(commitMessageTextarea, 'Test commit message');
        await user.click(commitButton);

        expect(mockGitStore.commit).toHaveBeenCalledWith('Test commit message');
        expect(toast.success).toHaveBeenCalledWith('Changes committed successfully');
      });

      it('should not commit when commit message is empty', async () => {
        // Add a staged file but leave commit message empty
        mockGitStore.status = [{ file: 'test.txt', head: 1, workdir: 2, stage: 2 }];

        render(<UnifiedGitPanel />);

        const commitButton = screen.getByText('Commit Changes');
        await user.click(commitButton);

        expect(mockGitStore.commit).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith('Please enter a commit message');
      });
    });

    describe('Branches Tab', () => {
      it('should display branches in branches tab', async () => {
        render(<UnifiedGitPanel />);

        const branchesTab = screen.getByText('Branches');
        await user.click(branchesTab);

        expect(screen.getByText('Branch List')).toBeInTheDocument();
        expect(screen.getByText('main')).toBeInTheDocument();
        expect(screen.getByText('develop')).toBeInTheDocument();
        expect(screen.getByText('Current')).toBeInTheDocument(); // Badge for current branch
      });

      it('should open new branch dialog when plus button is clicked', async () => {
        render(<UnifiedGitPanel />);

        const branchesTab = screen.getByText('Branches');
        await user.click(branchesTab);

        // Find the plus button in the branches header
        const newBranchButton = screen
          .getAllByRole('button')
          .find((button) => button.textContent === '+');

        if (newBranchButton) {
          await user.click(newBranchButton);
          expect(screen.getByTestId('dialog')).toBeInTheDocument();
          expect(screen.getByText('Create New Branch')).toBeInTheDocument();
        } else {
          throw new Error('New branch button not found');
        }
      });

      it('should create new branch when form is submitted', async () => {
        render(<UnifiedGitPanel />);

        const branchesTab = screen.getByText('Branches');
        await user.click(branchesTab);

        // Find the plus button in the branches header
        const newBranchButton = screen
          .getAllByRole('button')
          .find((button) => button.textContent === '+');

        if (newBranchButton) {
          await user.click(newBranchButton);

          const branchNameInput = screen.getByPlaceholderText('feature/new-feature');
          const createButton = screen.getByText('Create');

          await user.type(branchNameInput, 'feature/test');
          await user.click(createButton);

          expect(mockGitStore.createBranch).toHaveBeenCalledWith('feature/test');
          expect(toast.success).toHaveBeenCalledWith("Branch 'feature/test' created successfully");
        } else {
          throw new Error('New branch button not found');
        }
      });

      it('should switch branch when switch button is clicked', async () => {
        render(<UnifiedGitPanel />);

        const branchesTab = screen.getByText('Branches');
        await user.click(branchesTab);

        // Find the switch button for the develop branch
        const switchButtons = screen.getAllByRole('button');
        const switchButton = switchButtons.find(
          (button) => button.getAttribute('title') === 'Switch to this branch',
        );

        if (switchButton) {
          await user.click(switchButton);
          expect(mockGitStore.switchBranch).toHaveBeenCalledWith('develop');
          expect(toast.success).toHaveBeenCalledWith("Switched to branch 'develop'");
        } else {
          throw new Error('Switch branch button not found');
        }
      });

      it('should render branch visualizer component', async () => {
        render(<UnifiedGitPanel />);

        const branchesTab = screen.getByText('Branches');
        await user.click(branchesTab);

        expect(screen.getByTestId('git-branch-visualizer')).toBeInTheDocument();
      });
    });

    describe('History Tab', () => {
      it('should display commit history in history tab', async () => {
        render(<UnifiedGitPanel />);

        const historyTab = screen.getByText('History');
        await user.click(historyTab);

        expect(screen.getByText('Commit History')).toBeInTheDocument();
        expect(screen.getByText('Initial commit')).toBeInTheDocument();
        expect(screen.getByText('Test User')).toBeInTheDocument();
      });

      it('should display commit hash badge', async () => {
        render(<UnifiedGitPanel />);

        const historyTab = screen.getByText('History');
        await user.click(historyTab);

        expect(screen.getByText('abc123'.substring(0, 7))).toBeInTheDocument();
      });
    });

    describe('Configuration Dialog', () => {
      it('should open configuration dialog when settings button is clicked', async () => {
        render(<UnifiedGitPanel />);

        // Find the settings button
        const settingsButton = screen.getAllByRole('button')[0]; // This is the settings button based on the component structure
        await user.click(settingsButton);

        expect(screen.getByTestId('dialog')).toBeInTheDocument();
        expect(screen.getByText('Git Configuration')).toBeInTheDocument();
      });

      it('should save configuration when form is submitted', async () => {
        render(<UnifiedGitPanel />);

        // Find the settings button
        const settingsButton = screen.getAllByRole('button')[0]; // This is the settings button based on the component structure
        await user.click(settingsButton);

        const nameInput = screen.getByPlaceholderText('Your Name');
        const emailInput = screen.getByPlaceholderText('your.email@example.com');
        const saveButton = screen.getByText('Save');

        await user.type(nameInput, 'Test User');
        await user.type(emailInput, 'test@example.com');
        await user.click(saveButton);

        expect(mockGitStore.setConfig).toHaveBeenCalledWith({
          user: {
            name: 'Test User',
            email: 'test@example.com',
          },
        });
        expect(toast.success).toHaveBeenCalledWith('Configuration saved');
      });
    });
  });

  describe('Plugin Mode', () => {
    beforeEach(() => {
      mockGitStore.isInitialized = true;
      mockGitStore.currentBranch = 'main';

      // Mock plugin data
      mockPluginStore.getPlugin.mockReturnValue({
        config: {
          remoteUrl: 'https://github.com/user/repo.git',
          username: 'Test User',
          email: 'test@example.com',
        },
      });
    });

    it('should render remote tab in plugin mode', () => {
      render(<UnifiedGitPanel pluginId="git-plugin" />);

      expect(screen.getByText('Remote')).toBeInTheDocument();
    });

    it('should display remote URL in remote tab', async () => {
      // Mock the Tabs component to make testing easier
      vi.mock('@/components/ui/tabs', () => ({
        Tabs: ({ children, defaultValue }: { children: React.ReactNode; defaultValue: string }) => (
          <div data-testid="tabs">{children}</div>
        ),
        TabsList: ({ children }: { children: React.ReactNode }) => (
          <div data-testid="tabs-list">{children}</div>
        ),
        TabsTrigger: ({
          children,
          value,
          onClick,
        }: {
          children: React.ReactNode;
          value: string;
          onClick?: () => void;
        }) => (
          <button data-testid={`tab-${value}`} onClick={onClick}>
            {children}
          </button>
        ),
        TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) => (
          <div data-testid={`content-${value}`}>{children}</div>
        ),
      }));

      render(<UnifiedGitPanel pluginId="git-plugin" />);

      // Since we're mocking the Tabs component, all content is rendered
      // We just need to check if the expected content is in the document
      expect(screen.getByText('Remote Repository')).toBeInTheDocument();
      expect(screen.getByText('https://github.com/user/repo.git')).toBeInTheDocument();
    });

    it('should open remote configuration dialog when Configure Remote button is clicked', async () => {
      // Mock the Tabs component to make testing easier
      vi.mock('@/components/ui/tabs', () => ({
        Tabs: ({ children, defaultValue }: { children: React.ReactNode; defaultValue: string }) => (
          <div data-testid="tabs">{children}</div>
        ),
        TabsList: ({ children }: { children: React.ReactNode }) => (
          <div data-testid="tabs-list">{children}</div>
        ),
        TabsTrigger: ({
          children,
          value,
          onClick,
        }: {
          children: React.ReactNode;
          value: string;
          onClick?: () => void;
        }) => (
          <button data-testid={`tab-${value}`} onClick={onClick}>
            {children}
          </button>
        ),
        TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) => (
          <div data-testid={`content-${value}`}>{children}</div>
        ),
      }));

      render(<UnifiedGitPanel pluginId="git-plugin" />);

      // Since we're mocking the Tabs component, all content is rendered
      // We can directly click the Configure Remote button
      const configureButton = screen.getByText('Configure Remote');
      await user.click(configureButton);

      expect(screen.getByTestId('dialog')).toBeInTheDocument();
      expect(screen.getByText('Remote Repository')).toBeInTheDocument();
    });

    it('should display file selection in remote tab', async () => {
      // Add some files to the file store
      mockFileStore.files = new Map([
        ['/test.txt', { type: 'file', content: 'test' }],
        ['/test2.txt', { type: 'file', content: 'test2' }],
      ]);

      render(<UnifiedGitPanel pluginId="git-plugin" />);

      const remoteTab = screen.getByText('Remote');
      await user.click(remoteTab);

      expect(screen.getByText('File Selection')).toBeInTheDocument();
      expect(screen.getByText('/test.txt')).toBeInTheDocument();
      expect(screen.getByText('/test2.txt')).toBeInTheDocument();
    });
  });

  describe('Integration with FileExplorer', () => {
    beforeEach(() => {
      mockGitStore.isInitialized = true;
      mockGitStore.currentBranch = 'main';

      // Add some files to the file store
      mockFileStore.files = new Map([
        ['/test.txt', { type: 'file', content: 'test' }],
        ['/test2.txt', { type: 'file', content: 'test2' }],
        ['/folder', { type: 'folder' }],
        ['/folder/nested.txt', { type: 'file', content: 'nested' }],
      ]);

      // Add git status for these files
      mockGitStore.status = [
        { file: 'test.txt', head: 1, workdir: 2, stage: 0 },
        { file: 'test2.txt', head: 0, workdir: 2, stage: 0 },
        { file: 'folder/nested.txt', head: 1, workdir: 2, stage: 2 },
      ];
    });

    it('should display files from FileExplorer in plugin mode', async () => {
      render(<UnifiedGitPanel pluginId="git-plugin" />);

      const remoteTab = screen.getByText('Remote');
      await user.click(remoteTab);

      expect(screen.getByText('/test.txt')).toBeInTheDocument();
      expect(screen.getByText('/test2.txt')).toBeInTheDocument();
      expect(screen.getByText('/folder/nested.txt')).toBeInTheDocument();
    });

    it('should allow selecting files from FileExplorer in plugin mode', async () => {
      render(<UnifiedGitPanel pluginId="git-plugin" />);

      const remoteTab = screen.getByText('Remote');
      await user.click(remoteTab);

      // Find the checkbox for test.txt
      const checkbox = screen.getByLabelText('/test.txt');
      await user.click(checkbox);

      // Click the Add Selected Files button
      const addButton = screen.getByText('Add Selected Files');
      await user.click(addButton);

      // This would call the implementation.addFiles method in the real component
      expect(toast.success).toHaveBeenCalledWith('Files added successfully');
    });
  });

  describe('Error Handling', () => {
    it('should display error alert when there is an error', () => {
      mockGitStore.error = 'Something went wrong';
      mockGitStore.isInitialized = true;

      render(<UnifiedGitPanel />);

      // Check that the error is displayed in the alert
      const errorElements = screen.getAllByText('Something went wrong');
      expect(errorElements.length).toBeGreaterThan(0);
    });

    it('should display GitErrorBanner when there is an error', () => {
      mockGitStore.error = 'Git error occurred';
      mockGitStore.isInitialized = true;

      render(<UnifiedGitPanel />);

      expect(screen.getByTestId('git-error-banner')).toBeInTheDocument();
      expect(screen.getByTestId('git-error-banner').textContent).toBe('Git error occurred');
    });
  });
});
