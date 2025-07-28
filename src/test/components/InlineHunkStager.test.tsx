import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InlineHunkStager from '@/components/Git/InlineHunkStager';
import { useGitStore } from '@/stores/gitStore';
import { useFileStore } from '@/stores/fileStore';
import { toast } from 'sonner';
import { databaseService } from '@/services/databaseService';

// Mock dependencies
vi.mock('@/stores/gitStore');
vi.mock('@/stores/fileStore');
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
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('InlineHunkStager', () => {
  let mockGitStore: any;
  let mockFileStore: any;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();

    mockGitStore = {
      // State
      status: {
        files: [],
      },
      isLoading: false,

      // Actions
      addHunk: vi.fn().mockResolvedValue(undefined),
      unstageHunk: vi.fn().mockResolvedValue(undefined),
      getStatus: vi.fn().mockResolvedValue(undefined),
    };

    mockFileStore = {
      readFile: vi.fn().mockResolvedValue('Line 1\nLine 2\nLine 3'),
    };

    vi.mocked(useGitStore).mockReturnValue(mockGitStore);
    vi.mocked(useFileStore).mockReturnValue(mockFileStore);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', async () => {
    render(<InlineHunkStager filepath="test.txt" />);
    // Wait for the file content to load
    await screen.findByText('Line 1');
    // Basic rendering test - component should not throw errors
  });

  it('should display file content with line numbers', async () => {
    mockFileStore.readFile.mockResolvedValue('Line 1\nLine 2\nLine 3');
    render(<InlineHunkStager filepath="test.txt" />);

    // Wait for the file content to load
    await screen.findByText('Line 1');
    expect(screen.getByText('Line 2')).toBeInTheDocument();
    expect(screen.getByText('Line 3')).toBeInTheDocument();

    // Check for line numbers
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should allow selecting lines', async () => {
    mockFileStore.readFile.mockResolvedValue('Line 1\nLine 2\nLine 3');
    render(<InlineHunkStager filepath="test.txt" />);

    // Wait for the file content to load
    await screen.findByText('Line 1');

    // Click on line 1 to select it
    const line1 = screen.getByText('Line 1');
    await user.click(line1);

    // The line should be highlighted (have a specific class)
    const line1Row = line1.closest('tr');
    expect(line1Row).toHaveClass('bg-blue-100');
  });

  it('should allow staging a hunk', async () => {
    mockFileStore.readFile.mockResolvedValue('Line 1\nLine 2\nLine 3');

    // Set up the file status to show it's not staged
    mockGitStore.status = {
      files: [{ file: 'test.txt', head: 0, workdir: 2, stage: 0 }],
    };

    render(<InlineHunkStager filepath="test.txt" />);

    // Wait for the file content to load
    await screen.findByText('Line 1');

    // Select line 1
    const line1 = screen.getByText('Line 1');
    await user.click(line1);

    // Find the stage selection button
    const stageButton = screen.getByRole('button', { name: /Stage Selection/i });
    await user.click(stageButton);

    expect(mockGitStore.addHunk).toHaveBeenCalledWith('test.txt', {
      startLine: 1,
      endLine: 1,
      content: 'Line 1',
    });
    expect(toast.success).toHaveBeenCalledWith('Hunk staged successfully');
    expect(mockGitStore.getStatus).toHaveBeenCalled();
  });

  it('should allow unstaging a hunk', async () => {
    mockFileStore.readFile.mockResolvedValue('Line 1\nLine 2\nLine 3');

    // Set up the file status to show it's staged
    mockGitStore.status = {
      files: [{ file: 'test.txt', head: 0, workdir: 2, stage: 2 }],
    };

    render(<InlineHunkStager filepath="test.txt" />);

    // Wait for the file content to load
    await screen.findByText('Line 1');

    // Select line 1
    const line1 = screen.getByText('Line 1');
    await user.click(line1);

    // Find the unstage selection button
    const unstageButton = screen.getByRole('button', { name: /Unstage Selection/i });
    await user.click(unstageButton);

    expect(mockGitStore.unstageHunk).toHaveBeenCalledWith('test.txt', {
      startLine: 1,
      endLine: 1,
      content: 'Line 1',
    });
    expect(toast.success).toHaveBeenCalledWith('Hunk unstaged successfully');
    expect(mockGitStore.getStatus).toHaveBeenCalled();
  });

  it('should select multiple lines when clicking and dragging', async () => {
    mockFileStore.readFile.mockResolvedValue('Line 1\nLine 2\nLine 3\nLine 4\nLine 5');
    render(<InlineHunkStager filepath="test.txt" />);

    // Wait for the file content to load
    await screen.findByText('Line 1');

    // Click on line 2 to start selection
    const line2 = screen.getByText('Line 2');
    await user.click(line2);

    // Click on line 4 to extend selection
    const line4 = screen.getByText('Line 4');
    await user.click(line4);

    // Lines 2, 3, and 4 should be selected
    const line2Row = line2.closest('tr');
    const line3Row = screen.getByText('Line 3').closest('tr');
    const line4Row = line4.closest('tr');

    expect(line2Row).toHaveClass('bg-blue-100');
    expect(line3Row).toHaveClass('bg-blue-100');
    expect(line4Row).toHaveClass('bg-blue-100');
  });

  it('should show loading state when staging/unstaging', async () => {
    mockFileStore.readFile.mockResolvedValue('Line 1\nLine 2\nLine 3');
    mockGitStore.isLoading = true;

    render(<InlineHunkStager filepath="test.txt" />);

    // Wait for the file content to load
    await screen.findByText('Line 1');

    // The stage button should be disabled when loading
    const stageButton = screen.getByRole('button', { name: /Stage Selection/i });
    expect(stageButton).toBeDisabled();
  });

  it('should handle errors when staging a hunk', async () => {
    mockFileStore.readFile.mockResolvedValue('Line 1\nLine 2\nLine 3');
    mockGitStore.addHunk.mockRejectedValue(new Error('Failed to stage hunk'));

    // Set up the file status to show it's not staged
    mockGitStore.status = {
      files: [{ file: 'test.txt', head: 0, workdir: 2, stage: 0 }],
    };

    render(<InlineHunkStager filepath="test.txt" />);

    // Wait for the file content to load
    await screen.findByText('Line 1');

    // Select line 1
    const line1 = screen.getByText('Line 1');
    await user.click(line1);

    // Find the stage selection button
    const stageButton = screen.getByRole('button', { name: /Stage Selection/i });
    await user.click(stageButton);

    // Wait for the error toast to be called
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to stage hunk: Failed to stage hunk');
    });
  });

  it('should handle errors when unstaging a hunk', async () => {
    mockFileStore.readFile.mockResolvedValue('Line 1\nLine 2\nLine 3');
    mockGitStore.unstageHunk.mockRejectedValue(new Error('Failed to unstage hunk'));

    // Set up the file status to show it's staged
    mockGitStore.status = {
      files: [{ file: 'test.txt', head: 0, workdir: 2, stage: 2 }],
    };

    render(<InlineHunkStager filepath="test.txt" />);

    // Wait for the file content to load
    await screen.findByText('Line 1');

    // Select line 1
    const line1 = screen.getByText('Line 1');
    await user.click(line1);

    // Find the unstage selection button
    const unstageButton = screen.getByRole('button', { name: /Unstage Selection/i });
    await user.click(unstageButton);

    // Wait for the error toast to be called
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to unstage hunk: Failed to unstage hunk');
    });
  });

  it('should handle file loading errors', async () => {
    mockFileStore.readFile.mockRejectedValue(new Error('Failed to load file'));
    render(<InlineHunkStager filepath="test.txt" />);

    // Wait for the error toast to be called
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to load file: test.txt');
    });
  });

  it('should call onClose when close button is clicked', async () => {
    mockFileStore.readFile.mockResolvedValue('Line 1\nLine 2\nLine 3');
    const onClose = vi.fn();

    render(<InlineHunkStager filepath="test.txt" onClose={onClose} />);

    // Wait for the file content to load
    await screen.findByText('Line 1');

    // Find and click the close button
    const closeButton = screen.getByRole('button', { name: /Close/i });
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });
});
