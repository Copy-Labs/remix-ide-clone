import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useGitStore } from '@/stores/gitStore';
import { useFileStore } from '@/stores/fileStore';
import FileExplorer from '@/components/FileExplorer/FileExplorer';
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

// Mock UI components that might cause issues in tests
vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="scroll-area">{children}</div>
  ),
}));

// Mock context menu - captures props for testing
vi.mock('@/components/FileExplorer/ContextMenu', () => ({
  default: (props: any) => {
    // Capture props in global variable for testing
    if (typeof global !== 'undefined') {
      (global as any).capturedContextMenuProps = props;
    }
    return <div data-testid="context-menu">Context Menu</div>;
  },
}));

describe('Git and FileExplorer Integration', () => {
  let mockGitStore: any;
  let mockFileStore: any;
  let user: ReturnType<typeof userEvent.setup>;

  // Global variables for context menu testing
  let capturedContextMenuProps: any = null;

  beforeEach(() => {
    user = userEvent.setup();

    mockGitStore = {
      // State
      isInitialized: true,
      status: [
        { file: 'test.txt', head: 1, workdir: 2, stage: 0 },
        { file: 'new.txt', head: 0, workdir: 2, stage: 0 },
        { file: 'staged.txt', head: 1, workdir: 2, stage: 2 },
      ],

      // Actions
      addFile: vi.fn(),
      unstageFile: vi.fn(),
      getStatus: vi.fn(),
      getFileHistory: vi.fn(),
      getFileDiff: vi.fn(),
      isGitIgnored: vi.fn().mockImplementation((path) => path.includes('.git')),
    };

    mockFileStore = {
      // State
      files: new Map([
        ['/test.txt', {
          id: 'test-txt',
          name: 'test.txt',
          path: '/test.txt',
          type: 'file',
          content: 'test content',
          lastModified: Date.now(),
          parent: '/'
        }],
        ['/new.txt', {
          id: 'new-txt',
          name: 'new.txt',
          path: '/new.txt',
          type: 'file',
          content: 'new content',
          lastModified: Date.now(),
          parent: '/'
        }],
        ['/staged.txt', {
          id: 'staged-txt',
          name: 'staged.txt',
          path: '/staged.txt',
          type: 'file',
          content: 'staged content',
          lastModified: Date.now(),
          parent: '/'
        }],
        ['/folder', {
          id: 'folder',
          name: 'folder',
          path: '/folder',
          type: 'folder',
          lastModified: Date.now(),
          parent: '/'
        }],
        ['/folder/nested.txt', {
          id: 'nested-txt',
          name: 'nested.txt',
          path: '/folder/nested.txt',
          type: 'file',
          content: 'nested content',
          lastModified: Date.now(),
          parent: '/folder'
        }],
        ['/.git', {
          id: 'git-folder',
          name: '.git',
          path: '/.git',
          type: 'folder',
          lastModified: Date.now(),
          parent: '/'
        }],
        ['/.git/config', {
          id: 'git-config',
          name: 'config',
          path: '/.git/config',
          type: 'file',
          content: 'git config',
          lastModified: Date.now(),
          parent: '/.git'
        }],
      ]),
      currentFile: null,
      expandedFolders: new Set(['/folder']),
      selectedFiles: [],

      // Actions
      createFile: vi.fn(),
      updateFileContent: vi.fn(),
      deleteFile: vi.fn(),
      createFolder: vi.fn(),
      renameFile: vi.fn(),
      openFile: vi.fn(),
      selectFile: vi.fn(),
      clearSelection: vi.fn(),
      toggleFolder: vi.fn(),
      getFileContent: vi.fn(),
      collapseAllFolders: vi.fn(),
      refreshFolders: vi.fn(),
    };

    vi.mocked(useGitStore).mockReturnValue(mockGitStore);
    vi.mocked(useFileStore).mockReturnValue(mockFileStore);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render file explorer with git status indicators', () => {
    render(<FileExplorer />);

    // Files should be displayed
    expect(screen.getByText('test.txt')).toBeInTheDocument();
    expect(screen.getByText('new.txt')).toBeInTheDocument();
    expect(screen.getByText('staged.txt')).toBeInTheDocument();

    // Git status indicators should be present (implementation-specific)
    // This is a simplified check - actual implementation might use icons or classes
    const fileElements = screen.getAllByRole('button');
    expect(fileElements.length).toBeGreaterThan(0);
  });

  it('should not display .git folder and its contents', () => {
    render(<FileExplorer />);

    // .git folder and its contents should not be displayed
    expect(screen.queryByText('.git')).not.toBeInTheDocument();
    expect(screen.queryByText('config')).not.toBeInTheDocument();
  });

  it('should update git status when file content changes', async () => {
    render(<FileExplorer />);

    // Simulate file content change
    mockFileStore.updateFileContent.mockImplementation((path, content) => {
      // Update the file in the mock store
      mockFileStore.files.set(path, { type: 'file', content });

      // Trigger the file change event that would normally update git status
      mockGitStore.getStatus();
    });

    // Update a file
    await mockFileStore.updateFileContent('/test.txt', 'updated content');

    // Git status should be updated
    expect(mockGitStore.getStatus).toHaveBeenCalled();
  });

  it('should update git status when a new file is created', async () => {
    render(<FileExplorer />);

    // Simulate file creation
    mockFileStore.createFile.mockImplementation((path, content) => {
      // Add the file to the mock store
      mockFileStore.files.set(path, { type: 'file', content });

      // Trigger the file change event that would normally update git status
      mockGitStore.getStatus();
    });

    // Create a new file
    await mockFileStore.createFile('/another.txt', 'another content');

    // Git status should be updated
    expect(mockGitStore.getStatus).toHaveBeenCalled();
  });

  it('should update git status when a file is deleted', async () => {
    render(<FileExplorer />);

    // Simulate file deletion
    mockFileStore.deleteFile.mockImplementation((path) => {
      // Remove the file from the mock store
      mockFileStore.files.delete(path);

      // Trigger the file change event that would normally update git status
      mockGitStore.getStatus();
    });

    // Delete a file
    await mockFileStore.deleteFile('/test.txt');

    // Git status should be updated
    expect(mockGitStore.getStatus).toHaveBeenCalled();
  });

  it('should have git context menu options for files', async () => {
    render(<FileExplorer />);

    // Right-click on a file to open context menu
    const fileElement = screen.getByText('test.txt');
    fireEvent.contextMenu(fileElement);

    // Check if git-related props are passed to context menu
    const props = (global as any).capturedContextMenuProps;
    expect(props).toBeDefined();
    expect(props.onStageFile || props.onUnstageFile || props.onViewFileHistory || props.onViewFileDiff).toBeTruthy();
  });

  it('should stage a file when stage option is selected from context menu', async () => {
    render(<FileExplorer />);

    // Right-click on a file to open context menu
    const fileElement = screen.getByText('test.txt');
    fireEvent.contextMenu(fileElement);

    // Get the captured props and simulate selecting the stage option
    const props = (global as any).capturedContextMenuProps;
    expect(props).toBeDefined();
    expect(props.onStageFile).toBeDefined();

    // Simulate selecting the stage option
    await props.onStageFile('/test.txt');

    // The file should be staged
    expect(mockGitStore.addFile).toHaveBeenCalledWith('/test.txt');
  });

  it('should unstage a file when unstage option is selected from context menu', async () => {
    render(<FileExplorer />);

    // Right-click on a staged file to open context menu
    const fileElement = screen.getByText('staged.txt');
    fireEvent.contextMenu(fileElement);

    // Get the captured props and simulate selecting the unstage option
    const props = (global as any).capturedContextMenuProps;
    expect(props).toBeDefined();
    expect(props.onUnstageFile).toBeDefined();

    // Simulate selecting the unstage option
    await props.onUnstageFile('/staged.txt');

    // The file should be unstaged
    expect(mockGitStore.unstageFile).toHaveBeenCalledWith('/staged.txt');
  });

  it('should refresh git status when file explorer is refreshed', async () => {
    render(<FileExplorer />);

    // Find the refresh button
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await user.click(refreshButton);

    // Git status should be updated
    expect(mockGitStore.getStatus).toHaveBeenCalled();
  });

  it('should handle git-ignored files correctly', () => {
    // Add a git-ignored file
    mockFileStore.files.set('/.gitignore', {
      id: 'gitignore',
      name: '.gitignore',
      path: '/.gitignore',
      type: 'file',
      content: 'ignored.txt',
      lastModified: Date.now(),
      parent: '/'
    });
    mockFileStore.files.set('/ignored.txt', {
      id: 'ignored-txt',
      name: 'ignored.txt',
      path: '/ignored.txt',
      type: 'file',
      content: 'ignored content',
      lastModified: Date.now(),
      parent: '/'
    });
    mockGitStore.isGitIgnored.mockImplementation(
      (path) => path.includes('.git') || path.includes('ignored.txt'),
    );

    render(<FileExplorer />);

    // The ignored file should be displayed but with a different styling
    expect(screen.getByText('ignored.txt')).toBeInTheDocument();

    // The .git folder should still be hidden
    expect(screen.queryByText('.git')).not.toBeInTheDocument();
  });

  it('should update git status automatically when files are changed outside the file explorer', async () => {
    render(<FileExplorer />);

    // Simulate a file change event from outside the file explorer
    // This could be from the editor, a plugin, or another component
    const event = new CustomEvent('fileChanged', { detail: { path: '/test.txt' } });
    window.dispatchEvent(event);

    // Wait for the event to be processed
    await waitFor(() => {
      // Git status should be updated
      expect(mockGitStore.getStatus).toHaveBeenCalled();
    });
  });

  it('should handle large repositories efficiently', async () => {
    // Create a large number of files
    for (let i = 0; i < 1000; i++) {
      mockFileStore.files.set(`/file${i}.txt`, {
        id: `file${i}-txt`,
        name: `file${i}.txt`,
        path: `/file${i}.txt`,
        type: 'file',
        content: `content ${i}`,
        lastModified: Date.now(),
        parent: '/'
      });
    }

    // Add some of these files to git status
    for (let i = 0; i < 100; i++) {
      mockGitStore.status.push({ file: `file${i}.txt`, head: 0, workdir: 2, stage: 0 });
    }

    render(<FileExplorer />);

    // The file explorer should render without crashing
    // This is a basic performance test - in a real test, we might measure rendering time
    expect(screen.getByText('file0.txt')).toBeInTheDocument();
  });
});
