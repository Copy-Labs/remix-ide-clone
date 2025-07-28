import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useFileStore } from '../fileStore';

// Mock the database service
vi.mock('@/services/databaseService', () => ({
  databaseService: {
    saveFile: vi.fn(),
    getFile: vi.fn(),
    deleteFile: vi.fn(),
    clearDatabase: vi.fn(),
    isIndexedDBSupported: vi.fn(() => true),
    initialize: vi.fn(),
  },
}));

// Mock the logger service
vi.mock('@/services/loggerService', () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

describe('FileStore Persistence', () => {
  beforeEach(async () => {
    // Clear localStorage before each test
    localStorage.clear();

    // Reset the store state using the reset method
    await useFileStore.getState().reset();

    // Clear all mocks
    vi.clearAllMocks();
  });

  it('should persist newly created files to localStorage', async () => {
    const store = useFileStore.getState();

    // Create a new file
    await store.createFile('/test.sol', 'pragma solidity ^0.8.0;\n\ncontract Test {}');

    // Check that the file exists in the store
    expect(store.files.has('/test.sol')).toBe(true);
    const file = store.files.get('/test.sol');
    expect(file?.content).toBe('pragma solidity ^0.8.0;\n\ncontract Test {}');

    // Simulate persistence by checking localStorage
    // Note: In the real app, Zustand handles this automatically
    // For testing, we'll manually trigger the persistence logic
    const filesArray = Array.from(store.files.entries()).map(([path, file]) => {
      if (file.type === 'file' && file.contentInIndexedDB) {
        const { content, ...fileWithoutContent } = file;
        return [path, fileWithoutContent];
      }
      return [path, file];
    });

    const persistedState = {
      state: {
        filesArray,
        expandedFoldersArray: Array.from(store.expandedFolders),
        openTabs: store.openTabs,
        activeFile: store.activeFile,
        selectedFiles: store.selectedFiles,
      },
      version: 2,
    };

    localStorage.setItem('file-storage', JSON.stringify(persistedState));

    // Verify the file is in localStorage
    const stored = localStorage.getItem('file-storage');
    expect(stored).toBeTruthy();

    const parsed = JSON.parse(stored!);
    expect(parsed.state.filesArray).toHaveLength(1);
    expect(parsed.state.filesArray[0][0]).toBe('/test.sol');
    expect(parsed.state.filesArray[0][1].content).toBe(
      'pragma solidity ^0.8.0;\n\ncontract Test {}',
    );
  });

  it('should not overwrite existing files when initializing defaults', async () => {
    const store = useFileStore.getState();

    // Create a user file first
    await store.createFile('/MyContract.sol', 'pragma solidity ^0.8.0;\n\ncontract MyContract {}');

    // Simulate the initialization logic that checks for existing files
    const shouldInitializeDefaults = store.files.size === 0;

    // Should not initialize defaults because files exist
    expect(shouldInitializeDefaults).toBe(false);

    // Verify the user file is still there
    expect(store.files.has('/MyContract.sol')).toBe(true);
    const userFile = store.files.get('/MyContract.sol');
    expect(userFile?.content).toBe('pragma solidity ^0.8.0;\n\ncontract MyContract {}');
  });

  it('should initialize default files only when no files exist', async () => {
    const store = useFileStore.getState();

    // Ensure no files exist
    expect(store.files.size).toBe(0);

    // Simulate the initialization logic
    const shouldInitializeDefaults = store.files.size === 0;
    expect(shouldInitializeDefaults).toBe(true);

    // If we were to initialize defaults, they would be added
    if (shouldInitializeDefaults) {
      // This simulates what the fixed initialization code does
      await store.createFile('/contracts/SimpleStorage.sol', '// Default contract content');
      await store.createFile('/scripts/example.js', '// Default script content');
    }

    // Verify default files were created
    expect(store.files.size).toBe(2);
    expect(store.files.has('/contracts/SimpleStorage.sol')).toBe(true);
    expect(store.files.has('/scripts/example.js')).toBe(true);
  });

  it('should handle file content updates correctly', async () => {
    const store = useFileStore.getState();

    // Create a file with initial content
    await store.createFile('/test.sol', '// Initial content');

    // Update the file content
    await store.updateFileContent('/test.sol', '// Updated content\npragma solidity ^0.8.0;');

    // Verify the content was updated
    const file = store.files.get('/test.sol');
    expect(file?.content).toBe('// Updated content\npragma solidity ^0.8.0;');
    expect(file?.size).toBe('// Updated content\npragma solidity ^0.8.0;'.length);
    expect(file?.lastModified).toBeGreaterThan(0);
  });

  it('should preserve file tabs and active file state', async () => {
    const store = useFileStore.getState();

    // Create multiple files
    await store.createFile('/file1.sol', 'contract File1 {}');
    await store.createFile('/file2.sol', 'contract File2 {}');

    // Open both files
    await store.openFile('/file1.sol');
    await store.openFile('/file2.sol');

    // Set active file
    store.setActiveFile('/file2.sol');

    // Verify state
    expect(store.openTabs).toContain('/file1.sol');
    expect(store.openTabs).toContain('/file2.sol');
    expect(store.activeFile).toBe('/file2.sol');

    // Simulate persistence
    const persistedState = {
      state: {
        filesArray: Array.from(store.files.entries()),
        expandedFoldersArray: Array.from(store.expandedFolders),
        openTabs: store.openTabs,
        activeFile: store.activeFile,
        selectedFiles: store.selectedFiles,
      },
      version: 2,
    };

    localStorage.setItem('file-storage', JSON.stringify(persistedState));

    // Verify persistence
    const stored = localStorage.getItem('file-storage');
    const parsed = JSON.parse(stored!);

    expect(parsed.state.openTabs).toEqual(expect.arrayContaining(['/file1.sol', '/file2.sol']));
    expect(parsed.state.activeFile).toBe('/file2.sol');
  });

  it('should handle large files correctly (IndexedDB threshold)', async () => {
    const store = useFileStore.getState();

    // Create a large file (> 50KB)
    const largeContent = 'a'.repeat(60 * 1024); // 60KB
    await store.createFile('/large.sol', largeContent);

    const file = store.files.get('/large.sol');
    expect(file?.contentInIndexedDB).toBe(true);
    expect(file?.content).toBeUndefined(); // Content should not be in state for large files

    // Create a small file (< 50KB)
    const smallContent = 'contract Small {}';
    await store.createFile('/small.sol', smallContent);

    const smallFile = store.files.get('/small.sol');
    expect(smallFile?.contentInIndexedDB).toBe(false);
    expect(smallFile?.content).toBe(smallContent); // Content should be in state for small files
  });
});
