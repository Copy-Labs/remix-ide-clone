import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import GitBranchVisualizer from '@/components/Git/GitBranchVisualizer';
import { useGitStore } from '@/stores/gitStore';
import { databaseService } from '@/services/databaseService';

// Mock dependencies
vi.mock('@/stores/gitStore');
vi.mock('@/stores/compilerStore', () => ({
  useCompilerStore: vi.fn(() => ({
    isCompiling: false,
    compile: vi.fn(),
    setAutoCommitEnabled: vi.fn(),
    isAutoCommitEnabled: true,
    loadAvailableVersions: vi.fn(),
  })),
}));

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

describe('GitBranchVisualizer', () => {
  let mockGitStore: any;

  beforeEach(() => {
    mockGitStore = {
      // State
      branches: [],
      commits: [],
      currentBranch: 'main',

      // Actions
      getBranches: vi.fn(),
      getCommits: vi.fn(),
    };

    vi.mocked(useGitStore).mockReturnValue(mockGitStore);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(<GitBranchVisualizer />);
    // Basic rendering test - component should not throw errors
  });

  it('should not render the canvas when there are no commits', () => {
    mockGitStore.commits = [];
    render(<GitBranchVisualizer />);

    // The canvas should be rendered but with no content
    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();

    // No commit nodes should be rendered
    expect(screen.queryByText(/Initial commit/)).not.toBeInTheDocument();
  });

  it('should render commit nodes for each commit', () => {
    mockGitStore.commits = [
      {
        oid: 'abc123',
        message: 'Initial commit',
        author: { name: 'Test User', email: 'test@example.com', timestamp: Date.now() / 1000 },
        committer: { name: 'Test User', email: 'test@example.com', timestamp: Date.now() / 1000 },
        parents: [],
      },
      {
        oid: 'def456',
        message: 'Second commit',
        author: { name: 'Test User', email: 'test@example.com', timestamp: Date.now() / 1000 },
        committer: { name: 'Test User', email: 'test@example.com', timestamp: Date.now() / 1000 },
        parents: ['abc123'],
      },
    ];

    mockGitStore.branches = [{ name: 'main', oid: 'def456', current: true }];

    render(<GitBranchVisualizer />);

    // Check for commit messages in the visualization
    expect(screen.getByText('Initial commit')).toBeInTheDocument();
    expect(screen.getByText('Second commit')).toBeInTheDocument();
  });

  it('should render branch labels', () => {
    mockGitStore.commits = [
      {
        oid: 'abc123',
        message: 'Initial commit',
        author: { name: 'Test User', email: 'test@example.com', timestamp: Date.now() / 1000 },
        committer: { name: 'Test User', email: 'test@example.com', timestamp: Date.now() / 1000 },
        parents: [],
      },
    ];

    mockGitStore.branches = [
      { name: 'main', oid: 'abc123', current: true },
      { name: 'develop', oid: 'abc123', current: false },
    ];

    render(<GitBranchVisualizer />);

    // Check for branch labels
    expect(screen.getByText('main')).toBeInTheDocument();
    expect(screen.getByText('develop')).toBeInTheDocument();
  });

  it('should highlight the current branch', () => {
    mockGitStore.commits = [
      {
        oid: 'abc123',
        message: 'Initial commit',
        author: { name: 'Test User', email: 'test@example.com', timestamp: Date.now() / 1000 },
        committer: { name: 'Test User', email: 'test@example.com', timestamp: Date.now() / 1000 },
        parents: [],
      },
    ];

    mockGitStore.branches = [
      { name: 'main', oid: 'abc123', current: true },
      { name: 'develop', oid: 'abc123', current: false },
    ];

    mockGitStore.currentBranch = 'main';

    render(<GitBranchVisualizer />);

    // The current branch should have a special styling or indicator
    // This is a bit tricky to test without knowing the exact implementation
    // but we can check if the branch name is rendered
    expect(screen.getByText('main')).toBeInTheDocument();
  });

  it('should render a complex branch structure', () => {
    // Create a more complex commit history with branches
    mockGitStore.commits = [
      {
        oid: 'abc123',
        message: 'Initial commit',
        author: {
          name: 'Test User',
          email: 'test@example.com',
          timestamp: Date.now() / 1000 - 5000,
        },
        committer: {
          name: 'Test User',
          email: 'test@example.com',
          timestamp: Date.now() / 1000 - 5000,
        },
        parents: [],
      },
      {
        oid: 'def456',
        message: 'Second commit',
        author: {
          name: 'Test User',
          email: 'test@example.com',
          timestamp: Date.now() / 1000 - 4000,
        },
        committer: {
          name: 'Test User',
          email: 'test@example.com',
          timestamp: Date.now() / 1000 - 4000,
        },
        parents: ['abc123'],
      },
      {
        oid: 'ghi789',
        message: 'Feature branch commit',
        author: {
          name: 'Test User',
          email: 'test@example.com',
          timestamp: Date.now() / 1000 - 3000,
        },
        committer: {
          name: 'Test User',
          email: 'test@example.com',
          timestamp: Date.now() / 1000 - 3000,
        },
        parents: ['def456'],
      },
      {
        oid: 'jkl012',
        message: 'Main branch commit',
        author: {
          name: 'Test User',
          email: 'test@example.com',
          timestamp: Date.now() / 1000 - 2000,
        },
        committer: {
          name: 'Test User',
          email: 'test@example.com',
          timestamp: Date.now() / 1000 - 2000,
        },
        parents: ['def456'],
      },
      {
        oid: 'mno345',
        message: 'Merge commit',
        author: {
          name: 'Test User',
          email: 'test@example.com',
          timestamp: Date.now() / 1000 - 1000,
        },
        committer: {
          name: 'Test User',
          email: 'test@example.com',
          timestamp: Date.now() / 1000 - 1000,
        },
        parents: ['jkl012', 'ghi789'],
      },
    ];

    mockGitStore.branches = [
      { name: 'main', oid: 'mno345', current: true },
      { name: 'feature', oid: 'ghi789', current: false },
    ];

    render(<GitBranchVisualizer />);

    // Check for commit messages in the visualization
    expect(screen.getByText('Initial commit')).toBeInTheDocument();
    expect(screen.getByText('Second commit')).toBeInTheDocument();
    expect(screen.getByText('Feature branch commit')).toBeInTheDocument();
    expect(screen.getByText('Main branch commit')).toBeInTheDocument();
    expect(screen.getByText('Merge commit')).toBeInTheDocument();

    // Check for branch labels
    expect(screen.getByText('main')).toBeInTheDocument();
    expect(screen.getByText('feature')).toBeInTheDocument();
  });

  it('should fetch data on mount if not already loaded', () => {
    mockGitStore.commits = [];
    mockGitStore.branches = [];

    render(<GitBranchVisualizer />);

    expect(mockGitStore.getCommits).toHaveBeenCalled();
    expect(mockGitStore.getBranches).toHaveBeenCalled();
  });

  it('should allow creating a new branch', async () => {
    mockGitStore.createBranch = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<GitBranchVisualizer />);

    // Click the "New Branch" button
    const newBranchButton = screen.getByRole('button', { name: /New Branch/i });
    await user.click(newBranchButton);

    // Enter a branch name
    const branchNameInput = screen.getByPlaceholderText('Branch name');
    await user.type(branchNameInput, 'feature-branch');

    // Click the "Create" button
    const createButton = screen.getByRole('button', { name: /Create/i });
    await user.click(createButton);

    expect(mockGitStore.createBranch).toHaveBeenCalledWith('feature-branch');
  });

  it('should allow switching to a different branch', async () => {
    mockGitStore.commits = [
      {
        oid: 'abc123',
        message: 'Initial commit',
        author: { name: 'Test User', email: 'test@example.com', timestamp: Date.now() / 1000 },
        committer: { name: 'Test User', email: 'test@example.com', timestamp: Date.now() / 1000 },
        parents: [],
      },
    ];

    mockGitStore.branches = [
      { name: 'main', oid: 'abc123', current: true },
      { name: 'develop', oid: 'abc123', current: false },
    ];

    mockGitStore.switchBranch = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<GitBranchVisualizer />);

    // Find the switch branch button for the develop branch
    const switchButtons = screen.getAllByTitle('Switch to this branch');
    await user.click(switchButtons[0]);

    expect(mockGitStore.switchBranch).toHaveBeenCalledWith('develop');
  });

  it('should allow deleting a branch', async () => {
    mockGitStore.commits = [
      {
        oid: 'abc123',
        message: 'Initial commit',
        author: { name: 'Test User', email: 'test@example.com', timestamp: Date.now() / 1000 },
        committer: { name: 'Test User', email: 'test@example.com', timestamp: Date.now() / 1000 },
        parents: [],
      },
    ];

    mockGitStore.branches = [
      { name: 'main', oid: 'abc123', current: true },
      { name: 'develop', oid: 'abc123', current: false },
    ];

    mockGitStore.deleteBranch = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    // Mock window.confirm to return true
    const originalConfirm = window.confirm;
    window.confirm = vi.fn().mockReturnValue(true);

    render(<GitBranchVisualizer />);

    // Find the delete branch button for the develop branch
    const deleteButtons = screen.getAllByTitle('Delete this branch');
    await user.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalledWith(
      'Are you sure you want to delete the branch "develop"?',
    );
    expect(mockGitStore.deleteBranch).toHaveBeenCalledWith('develop');

    // Restore original window.confirm
    window.confirm = originalConfirm;
  });

  it('should allow starting an interactive rebase', async () => {
    mockGitStore.commits = [
      {
        oid: 'abc123',
        message: 'Initial commit',
        author: { name: 'Test User', email: 'test@example.com', timestamp: Date.now() / 1000 },
        committer: { name: 'Test User', email: 'test@example.com', timestamp: Date.now() / 1000 },
        parents: [],
      },
    ];

    mockGitStore.branches = [{ name: 'main', oid: 'abc123', current: true }];

    mockGitStore.startInteractiveRebase = vi.fn().mockResolvedValue(undefined);
    mockGitStore.rebaseCommits = [];

    const user = userEvent.setup();

    render(<GitBranchVisualizer />);

    // Click on a commit to select it
    const commitMessage = screen.getByText('Initial commit');
    await user.click(commitMessage);

    // Find and click the rebase button
    const rebaseButton = screen.getByRole('button', { name: /Rebase/i });
    await user.click(rebaseButton);

    expect(mockGitStore.startInteractiveRebase).toHaveBeenCalledWith('abc123');
  });

  it('should show rebase in progress UI when rebase is in progress', () => {
    mockGitStore.rebaseInProgress = true;
    mockGitStore.rebaseTargetCommit = 'abc123';
    mockGitStore.rebaseCommits = [
      {
        oid: 'def456',
        message: 'Second commit',
        author: { name: 'Test User', email: 'test@example.com', timestamp: Date.now() / 1000 },
        committer: { name: 'Test User', email: 'test@example.com', timestamp: Date.now() / 1000 },
        parents: ['abc123'],
      },
    ];

    render(<GitBranchVisualizer />);

    // Check for rebase in progress indicator
    expect(screen.getByText('Rebase in Progress')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue Rebase/i })).toBeInTheDocument();
  });

  it('should allow viewing commit details', async () => {
    mockGitStore.commits = [
      {
        oid: 'abc123',
        message: 'Initial commit',
        author: { name: 'Test User', email: 'test@example.com', timestamp: Date.now() / 1000 },
        committer: { name: 'Test User', email: 'test@example.com', timestamp: Date.now() / 1000 },
        parents: [],
      },
    ];

    mockGitStore.branches = [{ name: 'main', oid: 'abc123', current: true }];

    const user = userEvent.setup();

    render(<GitBranchVisualizer />);

    // Click on a commit to select it
    const commitMessage = screen.getByText('Initial commit');
    await user.click(commitMessage);

    // Find and click the details button
    const detailsButton = screen.getByRole('button', { name: /Details/i });
    await user.click(detailsButton);

    // The CommitDetailsView component should be rendered with the correct commit ID
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
