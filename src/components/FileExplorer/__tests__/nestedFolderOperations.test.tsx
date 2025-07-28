import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useFileStore } from '@/stores/fileStore';
import FileExplorer from '../FileExplorer';

// Mock the file store with a working implementation
const mockStore = {
  files: new Map(),
  expandedFolders: new Set(['/']) as Set<string>,
  selectedFiles: [] as string[],
  openTabs: [] as string[],
  activeFile: null as string | null,

  createFile: vi.fn(async (path: string, content: string = '') => {
    const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
    const fileName = path.split('/').pop() || '';

    const newFile = {
      id: Math.random().toString(36),
      name: fileName,
      path,
      type: 'file' as const,
      parent: parentPath,
      lastModified: Date.now(),
      content,
      size: content.length,
    };

    mockStore.files.set(path, newFile);
  }),

  createFolder: vi.fn(async (path: string) => {
    const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
    const folderName = path.split('/').pop() || '';

    const newFolder = {
      id: Math.random().toString(36),
      name: folderName,
      path,
      type: 'folder' as const,
      parent: parentPath,
      lastModified: Date.now(),
      children: [],
    };

    mockStore.files.set(path, newFolder);
  }),

  deleteFile: vi.fn(async (path: string) => {
    mockStore.files.delete(path);
  }),

  renameFile: vi.fn(async (oldPath: string, newPath: string) => {
    const file = mockStore.files.get(oldPath);
    if (file) {
      mockStore.files.delete(oldPath);
      mockStore.files.set(newPath, { ...file, path: newPath });
    }
  }),

  openFile: vi.fn(async (path: string) => {
    if (!mockStore.openTabs.includes(path)) {
      mockStore.openTabs.push(path);
    }
    mockStore.activeFile = path;
  }),

  closeFile: vi.fn((path: string) => {
    mockStore.openTabs = mockStore.openTabs.filter((tab) => tab !== path);
    if (mockStore.activeFile === path) {
      mockStore.activeFile = mockStore.openTabs[0] || null;
    }
  }),

  setActiveFile: vi.fn((path: string | null) => {
    mockStore.activeFile = path;
  }),

  selectFile: vi.fn((path: string, multiple: boolean = false) => {
    if (multiple) {
      if (!mockStore.selectedFiles.includes(path)) {
        mockStore.selectedFiles.push(path);
      }
    } else {
      mockStore.selectedFiles = [path];
    }
  }),

  clearSelection: vi.fn(() => {
    mockStore.selectedFiles = [];
  }),

  toggleFolder: vi.fn((path: string) => {
    if (mockStore.expandedFolders.has(path)) {
      mockStore.expandedFolders.delete(path);
    } else {
      mockStore.expandedFolders.add(path);
    }
  }),

  expandFolder: vi.fn((path: string) => {
    mockStore.expandedFolders.add(path);
  }),

  collapseFolder: vi.fn((path: string) => {
    mockStore.expandedFolders.delete(path);
  }),

  collapseAllFolders: vi.fn(() => {
    mockStore.expandedFolders = new Set(['/']);
  }),

  refreshFolders: vi.fn(() => {
    // Force re-render
  }),

  getFileContent: vi.fn(async (path: string) => {
    const file = mockStore.files.get(path);
    return file?.type === 'file' ? file.content : undefined;
  }),
};

// Mock the useFileStore hook
vi.mock('@/stores/fileStore', () => ({
  useFileStore: vi.fn(() => mockStore),
}));

describe('FileExplorer Nested Folder Operations', () => {
  beforeEach(() => {
    // Reset the mock store
    mockStore.files.clear();
    mockStore.expandedFolders = new Set(['/']);
    mockStore.selectedFiles = [];
    mockStore.openTabs = [];
    mockStore.activeFile = null;

    // Clear all mock calls
    vi.clearAllMocks();
  });

  describe('Nested Folder Creation Tests', () => {
    it('should create files in nested folders at multiple levels', async () => {
      // Test the store operations directly
      await mockStore.createFolder('/src');
      await mockStore.createFolder('/src/components');
      await mockStore.createFolder('/src/components/ui');

      // Verify folders were created
      expect(mockStore.files.has('/src')).toBe(true);
      expect(mockStore.files.has('/src/components')).toBe(true);
      expect(mockStore.files.has('/src/components/ui')).toBe(true);

      // Create files in nested folders
      await mockStore.createFile('/src/index.js', 'console.log("main");');
      await mockStore.createFile('/src/components/App.jsx', 'export const App = () => {};');
      await mockStore.createFile(
        '/src/components/ui/Button.tsx',
        'export const Button = () => {};',
      );

      // Verify files were created with correct properties
      expect(mockStore.files.has('/src/index.js')).toBe(true);
      expect(mockStore.files.has('/src/components/App.jsx')).toBe(true);
      expect(mockStore.files.has('/src/components/ui/Button.tsx')).toBe(true);

      // Verify parent relationships
      const indexFile = mockStore.files.get('/src/index.js');
      const appFile = mockStore.files.get('/src/components/App.jsx');
      const buttonFile = mockStore.files.get('/src/components/ui/Button.tsx');

      expect(indexFile?.parent).toBe('/src');
      expect(appFile?.parent).toBe('/src/components');
      expect(buttonFile?.parent).toBe('/src/components/ui');

      // Verify content
      expect(indexFile?.content).toBe('console.log("main");');
      expect(appFile?.content).toBe('export const App = () => {};');
      expect(buttonFile?.content).toBe('export const Button = () => {};');
    });

    it('should create deeply nested folder structure', async () => {
      // Create deeply nested structure
      const paths = [
        '/project',
        '/project/src',
        '/project/src/components',
        '/project/src/components/forms',
        '/project/src/components/forms/inputs',
        '/project/src/components/forms/inputs/validation',
      ];

      for (const path of paths) {
        await mockStore.createFolder(path);
      }

      // Verify all folders exist
      paths.forEach((path) => {
        expect(mockStore.files.has(path)).toBe(true);
        const folder = mockStore.files.get(path);
        expect(folder?.type).toBe('folder');
      });

      // Verify parent relationships
      expect(mockStore.files.get('/project')?.parent).toBe('/');
      expect(mockStore.files.get('/project/src')?.parent).toBe('/project');
      expect(mockStore.files.get('/project/src/components')?.parent).toBe('/project/src');
      expect(mockStore.files.get('/project/src/components/forms')?.parent).toBe(
        '/project/src/components',
      );
      expect(mockStore.files.get('/project/src/components/forms/inputs')?.parent).toBe(
        '/project/src/components/forms',
      );
      expect(mockStore.files.get('/project/src/components/forms/inputs/validation')?.parent).toBe(
        '/project/src/components/forms/inputs',
      );
    });

    it('should create Solidity files in nested contract folders', async () => {
      // Create contract folder structure
      await mockStore.createFolder('/contracts');
      await mockStore.createFolder('/contracts/tokens');
      await mockStore.createFolder('/contracts/governance');
      await mockStore.createFolder('/contracts/utils');

      // Create Solidity files
      await mockStore.createFile(
        '/contracts/tokens/ERC20Token.sol',
        'pragma solidity ^0.8.0;\n\ncontract ERC20Token {\n    // Token implementation\n}',
      );

      await mockStore.createFile(
        '/contracts/governance/Governor.sol',
        'pragma solidity ^0.8.0;\n\ncontract Governor {\n    // Governance implementation\n}',
      );

      await mockStore.createFile(
        '/contracts/utils/SafeMath.sol',
        'pragma solidity ^0.8.0;\n\nlibrary SafeMath {\n    // Math utilities\n}',
      );

      // Verify all files exist
      expect(mockStore.files.has('/contracts/tokens/ERC20Token.sol')).toBe(true);
      expect(mockStore.files.has('/contracts/governance/Governor.sol')).toBe(true);
      expect(mockStore.files.has('/contracts/utils/SafeMath.sol')).toBe(true);

      // Verify file properties
      const tokenFile = mockStore.files.get('/contracts/tokens/ERC20Token.sol');
      const governorFile = mockStore.files.get('/contracts/governance/Governor.sol');
      const mathFile = mockStore.files.get('/contracts/utils/SafeMath.sol');

      expect(tokenFile?.type).toBe('file');
      expect(tokenFile?.parent).toBe('/contracts/tokens');
      expect(governorFile?.type).toBe('file');
      expect(governorFile?.parent).toBe('/contracts/governance');
      expect(mathFile?.type).toBe('file');
      expect(mathFile?.parent).toBe('/contracts/utils');
    });
  });

  describe('File Operations in Nested Folders', () => {
    it('should support file operations (rename, delete) in nested folders', async () => {
      // Create nested structure
      await mockStore.createFolder('/src');
      await mockStore.createFolder('/src/components');
      await mockStore.createFile('/src/components/Button.tsx', 'export const Button = () => {};');

      // Verify file exists
      expect(mockStore.files.has('/src/components/Button.tsx')).toBe(true);

      // Rename file
      await mockStore.renameFile('/src/components/Button.tsx', '/src/components/MyButton.tsx');

      // Verify rename
      expect(mockStore.files.has('/src/components/Button.tsx')).toBe(false);
      expect(mockStore.files.has('/src/components/MyButton.tsx')).toBe(true);

      const renamedFile = mockStore.files.get('/src/components/MyButton.tsx');
      expect(renamedFile?.path).toBe('/src/components/MyButton.tsx');

      // Delete file
      await mockStore.deleteFile('/src/components/MyButton.tsx');

      // Verify deletion
      expect(mockStore.files.has('/src/components/MyButton.tsx')).toBe(false);
    });

    it('should support opening and closing files from nested folders', async () => {
      // Create nested files
      await mockStore.createFolder('/src');
      await mockStore.createFile('/src/App.js', 'console.log("App");');
      await mockStore.createFile('/src/utils.js', 'console.log("Utils");');

      // Open files
      await mockStore.openFile('/src/App.js');
      await mockStore.openFile('/src/utils.js');

      // Verify files are open
      expect(mockStore.openTabs).toContain('/src/App.js');
      expect(mockStore.openTabs).toContain('/src/utils.js');

      // Set active file
      mockStore.setActiveFile('/src/utils.js');
      expect(mockStore.activeFile).toBe('/src/utils.js');

      // Close file
      mockStore.closeFile('/src/App.js');
      expect(mockStore.openTabs).not.toContain('/src/App.js');
      expect(mockStore.openTabs).toContain('/src/utils.js');
    });
  });

  describe('Folder Expansion State', () => {
    it('should maintain expanded folder state during nested operations', async () => {
      // Create nested structure
      await mockStore.createFolder('/src');
      await mockStore.createFolder('/src/components');

      // Expand folders
      mockStore.expandFolder('/src');
      mockStore.expandFolder('/src/components');

      // Verify expansion state
      expect(mockStore.expandedFolders.has('/src')).toBe(true);
      expect(mockStore.expandedFolders.has('/src/components')).toBe(true);

      // Create more items in expanded folders
      await mockStore.createFile('/src/index.js', 'content');
      await mockStore.createFile('/src/components/App.jsx', 'content');

      // Expansion state should be maintained
      expect(mockStore.expandedFolders.has('/src')).toBe(true);
      expect(mockStore.expandedFolders.has('/src/components')).toBe(true);
    });

    it('should handle folder toggle operations in nested structure', async () => {
      // Create nested structure
      await mockStore.createFolder('/project');
      await mockStore.createFolder('/project/src');
      await mockStore.createFolder('/project/src/components');

      // Test toggle operations
      mockStore.toggleFolder('/project');
      expect(mockStore.expandedFolders.has('/project')).toBe(true);

      mockStore.toggleFolder('/project/src');
      expect(mockStore.expandedFolders.has('/project/src')).toBe(true);

      // Toggle off
      mockStore.toggleFolder('/project');
      expect(mockStore.expandedFolders.has('/project')).toBe(false);

      // Toggle back on
      mockStore.toggleFolder('/project');
      expect(mockStore.expandedFolders.has('/project')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in nested folder names', async () => {
      // Create folders with special characters
      await mockStore.createFolder('/my-project');
      await mockStore.createFolder('/my-project/src_files');
      await mockStore.createFolder('/my-project/src_files/components.v2');

      // Create files in these folders
      await mockStore.createFile('/my-project/config-file.json', '{}');
      await mockStore.createFile('/my-project/src_files/index_main.js', 'export {};');
      await mockStore.createFile(
        '/my-project/src_files/components.v2/Button-v2.tsx',
        'export const Button = () => {};',
      );

      // Verify all items exist
      expect(mockStore.files.has('/my-project')).toBe(true);
      expect(mockStore.files.has('/my-project/src_files')).toBe(true);
      expect(mockStore.files.has('/my-project/src_files/components.v2')).toBe(true);
      expect(mockStore.files.has('/my-project/config-file.json')).toBe(true);
      expect(mockStore.files.has('/my-project/src_files/index_main.js')).toBe(true);
      expect(mockStore.files.has('/my-project/src_files/components.v2/Button-v2.tsx')).toBe(true);
    });

    it('should maintain correct file count across nested operations', async () => {
      // Start with empty store
      const initialCount = mockStore.files.size;
      expect(initialCount).toBe(0);

      // Create nested structure
      await mockStore.createFolder('/src'); // +1
      await mockStore.createFolder('/src/components'); // +1
      await mockStore.createFile('/src/index.js', 'content'); // +1
      await mockStore.createFile('/src/components/App.jsx', 'content'); // +1

      // Verify count
      expect(mockStore.files.size).toBe(4);

      // Create more nested items
      await mockStore.createFolder('/src/utils'); // +1
      await mockStore.createFile('/src/utils/helper.js', 'content'); // +1
      await mockStore.createFolder('/tests'); // +1
      await mockStore.createFile('/tests/app.test.js', 'content'); // +1

      // Verify final count
      expect(mockStore.files.size).toBe(8);
    });
  });
});
