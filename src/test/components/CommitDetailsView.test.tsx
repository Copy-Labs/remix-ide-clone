import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CommitDetailsView from '@/components/Git/CommitDetailsView';
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

// Mock UI components that might cause issues in tests
vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="scroll-area">{children}</div>
  ),
}));

describe('CommitDetailsView', () => {
  let mockGitStore: any;
  let user: ReturnType<typeof userEvent.setup>;
  let mockCommit: any;

  beforeEach(() => {
    user = userEvent.setup();

    // Create a mock commit object
    mockCommit = {
      oid: 'abc123',
      message: 'Test commit message',
      author: {
        name: 'Test User',
        email: 'test@example.com',
        timestamp: Date.now() / 1000,
      },
      committer: {
        name: 'Test User',
        email: 'test@example.com',
        timestamp: Date.now() / 1000,
      },
      parents: ['def456'],
      files: [
        { path: 'test.txt', status: 'modified', additions: 5, deletions: 2 },
        { path: 'new.txt', status: 'added', additions: 10, deletions: 0 },
        { path: 'deleted.txt', status: 'deleted', additions: 0, deletions: 8 },
      ],
    };

    mockGitStore = {
      // State
      isLoading: false,

      // Actions
      getCommitDetails: vi.fn().mockResolvedValue(mockCommit),
      getFileDiff: vi.fn().mockResolvedValue('+ Added line\n- Removed line'),
    };

    vi.mocked(useGitStore).mockReturnValue(mockGitStore);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(<CommitDetailsView commitId="abc123" onClose={() => {}} />);
    // Basic rendering test - component should not throw errors
  });

  it('should load commit details on mount', () => {
    render(<CommitDetailsView commitId="abc123" onClose={() => {}} />);

    expect(mockGitStore.getCommitDetails).toHaveBeenCalledWith('abc123');
  });

  it('should display commit details', async () => {
    render(<CommitDetailsView commitId="abc123" onClose={() => {}} />);

    // Wait for the commit details to load
    expect(await screen.findByText('Test commit message')).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();

    // Should display the commit hash
    expect(screen.getByText('abc123')).toBeInTheDocument();
  });

  it('should display file changes', async () => {
    render(<CommitDetailsView commitId="abc123" onClose={() => {}} />);

    // Wait for the file changes to load
    expect(await screen.findByText('test.txt')).toBeInTheDocument();
    expect(screen.getByText('new.txt')).toBeInTheDocument();
    expect(screen.getByText('deleted.txt')).toBeInTheDocument();

    // Should display the file status
    expect(screen.getByText('modified')).toBeInTheDocument();
    expect(screen.getByText('added')).toBeInTheDocument();
    expect(screen.getByText('deleted')).toBeInTheDocument();

    // Should display the number of additions and deletions
    expect(screen.getByText('+5')).toBeInTheDocument();
    expect(screen.getByText('-2')).toBeInTheDocument();
    expect(screen.getByText('+10')).toBeInTheDocument();
    expect(screen.getByText('-8')).toBeInTheDocument();
  });

  it('should load file diff when a file is clicked', async () => {
    render(<CommitDetailsView commitId="abc123" onClose={() => {}} />);

    // Wait for the file changes to load
    const fileItem = await screen.findByText('test.txt');
    await user.click(fileItem);

    expect(mockGitStore.getFileDiff).toHaveBeenCalledWith('abc123', 'test.txt');

    // Should display the diff content
    expect(await screen.findByText('+ Added line')).toBeInTheDocument();
    expect(screen.getByText('- Removed line')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', async () => {
    const onCloseMock = vi.fn();
    render(<CommitDetailsView commitId="abc123" onClose={onCloseMock} />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    expect(onCloseMock).toHaveBeenCalled();
  });

  it('should show loading state when fetching commit details', () => {
    mockGitStore.isLoading = true;
    render(<CommitDetailsView commitId="abc123" onClose={() => {}} />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should handle error when commit details cannot be loaded', async () => {
    mockGitStore.getCommitDetails.mockRejectedValue(new Error('Failed to load commit details'));
    render(<CommitDetailsView commitId="abc123" onClose={() => {}} />);

    expect(await screen.findByText(/failed to load commit details/i)).toBeInTheDocument();
  });

  it('should handle error when file diff cannot be loaded', async () => {
    mockGitStore.getFileDiff.mockRejectedValue(new Error('Failed to load file diff'));
    render(<CommitDetailsView commitId="abc123" onClose={() => {}} />);

    // Wait for the file changes to load
    const fileItem = await screen.findByText('test.txt');
    await user.click(fileItem);

    expect(await screen.findByText(/failed to load file diff/i)).toBeInTheDocument();
  });

  it('should display parent commit information', async () => {
    render(<CommitDetailsView commitId="abc123" onClose={() => {}} />);

    // Wait for the commit details to load
    await screen.findByText('Test commit message');

    // Should display the parent commit hash
    expect(screen.getByText('Parent: def456')).toBeInTheDocument();
  });

  it('should handle multiple parent commits (merge commit)', async () => {
    mockCommit.parents = ['def456', 'ghi789'];
    render(<CommitDetailsView commitId="abc123" onClose={() => {}} />);

    // Wait for the commit details to load
    await screen.findByText('Test commit message');

    // Should display both parent commit hashes
    expect(screen.getByText('Parents: def456, ghi789')).toBeInTheDocument();
  });

  it('should format the commit date correctly', async () => {
    const timestamp = new Date('2023-01-01T12:00:00Z').getTime() / 1000;
    mockCommit.author.timestamp = timestamp;

    render(<CommitDetailsView commitId="abc123" onClose={() => {}} />);

    // Wait for the commit details to load
    await screen.findByText('Test commit message');

    // Should display the formatted date (exact format depends on implementation)
    // This is a simplified check
    expect(screen.getByText(/2023/)).toBeInTheDocument();
  });

  it('should display different authors and committers if they differ', async () => {
    mockCommit.committer = {
      name: 'Another User',
      email: 'another@example.com',
      timestamp: Date.now() / 1000,
    };

    render(<CommitDetailsView commitId="abc123" onClose={() => {}} />);

    // Wait for the commit details to load
    await screen.findByText('Test commit message');

    // Should display both author and committer
    expect(screen.getByText('Author: Test User')).toBeInTheDocument();
    expect(screen.getByText('Committer: Another User')).toBeInTheDocument();
  });

  it('should handle commit with no file changes', async () => {
    mockCommit.files = [];
    render(<CommitDetailsView commitId="abc123" onClose={() => {}} />);

    // Wait for the commit details to load
    await screen.findByText('Test commit message');

    // Should display a message indicating no file changes
    expect(screen.getByText('No file changes in this commit')).toBeInTheDocument();
  });
});
