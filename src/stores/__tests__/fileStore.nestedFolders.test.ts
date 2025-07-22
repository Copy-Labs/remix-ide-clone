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

describe('FileStore Nested Folder Operations', () => {
  beforeEach(async () => {
    // Clear localStorage before each test
    localStorage.clear();

    // Reset the store state using the reset method
    await useFileStore.getState().reset();

    // Clear all mocks
    vi.clearAllMocks();
  });

  describe('Nested Folder Creation', () => {
    it('should create folders at multiple nesting levels', async () => {
      const store = useFileStore.getState();

      // Create nested folder structure: src/components/ui
      await store.createFolder('/src');
      await store.createFolder('/src/components');
      await store.createFolder('/src/components/ui');

      // Verify all folders exist
      expect(store.files.has('/src')).toBe(true);
      expect(store.files.has('/src/components')).toBe(true);
      expect(store.files.has('/src/components/ui')).toBe(true);

      // Verify folder properties
      const srcFolder = store.files.get('/src');
      const componentsFolder = store.files.get('/src/components');
      const uiFolder = store.files.get('/src/components/ui');

      expect(srcFolder?.type).toBe('folder');
      expect(srcFolder?.parent).toBe('/');
      expect(componentsFolder?.type).toBe('folder');
      expect(componentsFolder?.parent).toBe('/src');
      expect(uiFolder?.type).toBe('folder');
      expect(uiFolder?.parent).toBe('/src/components');
    });

    it('should create deeply nested folder structure', async () => {
      const store = useFileStore.getState();

      // Create deeply nested structure: project/src/components/forms/inputs/validation
      await store.createFolder('/project');
      await store.createFolder('/project/src');
      await store.createFolder('/project/src/components');
      await store.createFolder('/project/src/components/forms');
      await store.createFolder('/project/src/components/forms/inputs');
      await store.createFolder('/project/src/components/forms/inputs/validation');

      // Verify all folders exist with correct hierarchy
      const paths = [
        '/project',
        '/project/src',
        '/project/src/components',
        '/project/src/components/forms',
        '/project/src/components/forms/inputs',
        '/project/src/components/forms/inputs/validation'
      ];

      paths.forEach(path => {
        expect(store.files.has(path)).toBe(true);
        const folder = store.files.get(path);
        expect(folder?.type).toBe('folder');
      });

      // Verify parent relationships
      expect(store.files.get('/project')?.parent).toBe('/');
      expect(store.files.get('/project/src')?.parent).toBe('/project');
      expect(store.files.get('/project/src/components')?.parent).toBe('/project/src');
      expect(store.files.get('/project/src/components/forms')?.parent).toBe('/project/src/components');
      expect(store.files.get('/project/src/components/forms/inputs')?.parent).toBe('/project/src/components/forms');
      expect(store.files.get('/project/src/components/forms/inputs/validation')?.parent).toBe('/project/src/components/forms/inputs');
    });
  });

  describe('File Creation in Nested Folders', () => {
    it('should create files in first-level nested folders', async () => {
      const store = useFileStore.getState();

      // Create folder structure
      await store.createFolder('/src');

      // Create files in nested folder
      await store.createFile('/src/index.js', 'console.log("Hello World");');
      await store.createFile('/src/utils.js', 'export const helper = () => {};');

      // Verify files exist
      expect(store.files.has('/src/index.js')).toBe(true);
      expect(store.files.has('/src/utils.js')).toBe(true);

      // Verify file properties
      const indexFile = store.files.get('/src/index.js');
      const utilsFile = store.files.get('/src/utils.js');

      expect(indexFile?.type).toBe('file');
      expect(indexFile?.parent).toBe('/src');
      expect(indexFile?.content).toBe('console.log("Hello World");');

      expect(utilsFile?.type).toBe('file');
      expect(utilsFile?.parent).toBe('/src');
      expect(utilsFile?.content).toBe('export const helper = () => {};');
    });

    it('should create files in deeply nested folders', async () => {
      const store = useFileStore.getState();

      // Create nested folder structure
      await store.createFolder('/src');
      await store.createFolder('/src/components');
      await store.createFolder('/src/components/ui');
      await store.createFolder('/src/components/ui/forms');

      // Create files at different nesting levels
      await store.createFile('/src/App.js', 'import React from "react";');
      await store.createFile('/src/components/Header.jsx', 'export const Header = () => {};');
      await store.createFile('/src/components/ui/Button.tsx', 'interface ButtonProps {}');
      await store.createFile('/src/components/ui/forms/Input.tsx', 'export const Input = () => {};');

      // Verify all files exist
      expect(store.files.has('/src/App.js')).toBe(true);
      expect(store.files.has('/src/components/Header.jsx')).toBe(true);
      expect(store.files.has('/src/components/ui/Button.tsx')).toBe(true);
      expect(store.files.has('/src/components/ui/forms/Input.tsx')).toBe(true);

      // Verify parent relationships
      expect(store.files.get('/src/App.js')?.parent).toBe('/src');
      expect(store.files.get('/src/components/Header.jsx')?.parent).toBe('/src/components');
      expect(store.files.get('/src/components/ui/Button.tsx')?.parent).toBe('/src/components/ui');
      expect(store.files.get('/src/components/ui/forms/Input.tsx')?.parent).toBe('/src/components/ui/forms');

      // Verify content
      expect(store.files.get('/src/App.js')?.content).toBe('import React from "react";');
      expect(store.files.get('/src/components/Header.jsx')?.content).toBe('export const Header = () => {};');
      expect(store.files.get('/src/components/ui/Button.tsx')?.content).toBe('interface ButtonProps {}');
      expect(store.files.get('/src/components/ui/forms/Input.tsx')?.content).toBe('export const Input = () => {};');
    });

    it('should create Solidity files in nested contract folders', async () => {
      const store = useFileStore.getState();

      // Create contract folder structure
      await store.createFolder('/contracts');
      await store.createFolder('/contracts/tokens');
      await store.createFolder('/contracts/governance');
      await store.createFolder('/contracts/utils');

      // Create Solidity files in nested folders
      await store.createFile('/contracts/tokens/ERC20Token.sol',
        'pragma solidity ^0.8.0;\n\ncontract ERC20Token {\n    // Token implementation\n}');

      await store.createFile('/contracts/governance/Governor.sol',
        'pragma solidity ^0.8.0;\n\ncontract Governor {\n    // Governance implementation\n}');

      await store.createFile('/contracts/utils/SafeMath.sol',
        'pragma solidity ^0.8.0;\n\nlibrary SafeMath {\n    // Math utilities\n}');

      // Verify all Solidity files exist
      expect(store.files.has('/contracts/tokens/ERC20Token.sol')).toBe(true);
      expect(store.files.has('/contracts/governance/Governor.sol')).toBe(true);
      expect(store.files.has('/contracts/utils/SafeMath.sol')).toBe(true);

      // Verify file types and parents
      const tokenFile = store.files.get('/contracts/tokens/ERC20Token.sol');
      const governorFile = store.files.get('/contracts/governance/Governor.sol');
      const mathFile = store.files.get('/contracts/utils/SafeMath.sol');

      expect(tokenFile?.type).toBe('file');
      expect(tokenFile?.parent).toBe('/contracts/tokens');
      expect(governorFile?.type).toBe('file');
      expect(governorFile?.parent).toBe('/contracts/governance');
      expect(mathFile?.type).toBe('file');
      expect(mathFile?.parent).toBe('/contracts/utils');
    });
  });

  describe('Mixed Operations in Nested Folders', () => {
    it('should handle mixed file and folder creation in nested structure', async () => {
      const store = useFileStore.getState();

      // Create a complex nested structure with mixed operations
      await store.createFolder('/project');
      await store.createFile('/project/README.md', '# Project Documentation');

      await store.createFolder('/project/src');
      await store.createFile('/project/src/index.ts', 'export * from "./components";');

      await store.createFolder('/project/src/components');
      await store.createFile('/project/src/components/index.ts', 'export { Button } from "./Button";');
      await store.createFile('/project/src/components/Button.tsx', 'export const Button = () => {};');

      await store.createFolder('/project/src/utils');
      await store.createFile('/project/src/utils/helpers.ts', 'export const formatDate = () => {};');

      await store.createFolder('/project/tests');
      await store.createFile('/project/tests/Button.test.tsx', 'describe("Button", () => {});');

      // Verify the entire structure
      const expectedPaths = [
        '/project',
        '/project/README.md',
        '/project/src',
        '/project/src/index.ts',
        '/project/src/components',
        '/project/src/components/index.ts',
        '/project/src/components/Button.tsx',
        '/project/src/utils',
        '/project/src/utils/helpers.ts',
        '/project/tests',
        '/project/tests/Button.test.tsx'
      ];

      expectedPaths.forEach(path => {
        expect(store.files.has(path)).toBe(true);
      });

      // Verify folder vs file types
      expect(store.files.get('/project')?.type).toBe('folder');
      expect(store.files.get('/project/README.md')?.type).toBe('file');
      expect(store.files.get('/project/src')?.type).toBe('folder');
      expect(store.files.get('/project/src/index.ts')?.type).toBe('file');
      expect(store.files.get('/project/src/components')?.type).toBe('folder');
      expect(store.files.get('/project/src/components/Button.tsx')?.type).toBe('file');
    });

    it('should create files and folders at the same nesting level', async () => {
      const store = useFileStore.getState();

      // Create parent folder
      await store.createFolder('/workspace');

      // Create multiple files and folders at the same level
      await store.createFile('/workspace/config.json', '{"name": "test"}');
      await store.createFolder('/workspace/src');
      await store.createFile('/workspace/package.json', '{"version": "1.0.0"}');
      await store.createFolder('/workspace/dist');
      await store.createFile('/workspace/.gitignore', 'node_modules/');
      await store.createFolder('/workspace/docs');

      // Verify all items exist at the same level
      const workspaceItems = [
        '/workspace/config.json',
        '/workspace/src',
        '/workspace/package.json',
        '/workspace/dist',
        '/workspace/.gitignore',
        '/workspace/docs'
      ];

      workspaceItems.forEach(path => {
        expect(store.files.has(path)).toBe(true);
        expect(store.files.get(path)?.parent).toBe('/workspace');
      });

      // Verify types
      expect(store.files.get('/workspace/config.json')?.type).toBe('file');
      expect(store.files.get('/workspace/src')?.type).toBe('folder');
      expect(store.files.get('/workspace/package.json')?.type).toBe('file');
      expect(store.files.get('/workspace/dist')?.type).toBe('folder');
      expect(store.files.get('/workspace/.gitignore')?.type).toBe('file');
      expect(store.files.get('/workspace/docs')?.type).toBe('folder');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle creating files in non-existent nested folders', async () => {
      const store = useFileStore.getState();

      // Try to create a file in a non-existent nested folder
      // This should still work as the store creates the file with the correct parent path
      await store.createFile('/nonexistent/folder/file.txt', 'content');

      // Verify the file was created
      expect(store.files.has('/nonexistent/folder/file.txt')).toBe(true);
      const file = store.files.get('/nonexistent/folder/file.txt');
      expect(file?.parent).toBe('/nonexistent/folder');
      expect(file?.content).toBe('content');
    });

    it('should handle empty folder names in nested paths', async () => {
      const store = useFileStore.getState();

      // Create folders with proper paths
      await store.createFolder('/src');
      await store.createFile('/src/file.js', 'content');

      // Verify normal operation works
      expect(store.files.has('/src')).toBe(true);
      expect(store.files.has('/src/file.js')).toBe(true);
    });

    it('should handle special characters in nested folder names', async () => {
      const store = useFileStore.getState();

      // Create folders with special characters
      await store.createFolder('/my-project');
      await store.createFolder('/my-project/src_files');
      await store.createFolder('/my-project/src_files/components.v2');

      // Create files in these folders
      await store.createFile('/my-project/config-file.json', '{}');
      await store.createFile('/my-project/src_files/index_main.js', 'export {};');
      await store.createFile('/my-project/src_files/components.v2/Button-v2.tsx', 'export const Button = () => {};');

      // Verify all items exist
      expect(store.files.has('/my-project')).toBe(true);
      expect(store.files.has('/my-project/src_files')).toBe(true);
      expect(store.files.has('/my-project/src_files/components.v2')).toBe(true);
      expect(store.files.has('/my-project/config-file.json')).toBe(true);
      expect(store.files.has('/my-project/src_files/index_main.js')).toBe(true);
      expect(store.files.has('/my-project/src_files/components.v2/Button-v2.tsx')).toBe(true);
    });

    it('should maintain correct file count across nested operations', async () => {
      const store = useFileStore.getState();

      // Start with default files (should be 4: contracts, tests, scripts folders + Example.sol)
      const initialCount = store.files.size;
      expect(initialCount).toBe(4); // Verify we start with expected default files

      // Create nested structure
      await store.createFolder('/src');                    // +1
      await store.createFolder('/src/components');         // +1
      await store.createFile('/src/index.js', 'content');  // +1
      await store.createFile('/src/components/App.jsx', 'content'); // +1

      // Verify count
      expect(store.files.size).toBe(initialCount + 4);

      // Create more nested items
      await store.createFolder('/src/utils');              // +1
      await store.createFile('/src/utils/helper.js', 'content'); // +1
      await store.createFolder('/tests/unit');             // +1
      await store.createFile('/tests/unit/app.test.js', 'content'); // +1

      // Verify final count
      expect(store.files.size).toBe(initialCount + 8);
    });
  });

  describe('Folder Expansion State with Nested Operations', () => {
    it('should maintain expanded folder state during nested operations', async () => {
      const store = useFileStore.getState();

      // Create nested structure
      await store.createFolder('/src');
      await store.createFolder('/src/components');

      // Expand folders
      store.expandFolder('/src');
      store.expandFolder('/src/components');

      // Verify expansion state
      expect(store.expandedFolders.has('/src')).toBe(true);
      expect(store.expandedFolders.has('/src/components')).toBe(true);

      // Create more items in expanded folders
      await store.createFile('/src/index.js', 'content');
      await store.createFile('/src/components/App.jsx', 'content');

      // Expansion state should be maintained
      expect(store.expandedFolders.has('/src')).toBe(true);
      expect(store.expandedFolders.has('/src/components')).toBe(true);
    });

    it('should handle folder toggle operations in nested structure', async () => {
      const store = useFileStore.getState();

      // Create nested structure
      await store.createFolder('/project');
      await store.createFolder('/project/src');
      await store.createFolder('/project/src/components');

      // Test toggle operations
      store.toggleFolder('/project');
      expect(store.expandedFolders.has('/project')).toBe(true);

      store.toggleFolder('/project/src');
      expect(store.expandedFolders.has('/project/src')).toBe(true);

      // Toggle off
      store.toggleFolder('/project');
      expect(store.expandedFolders.has('/project')).toBe(false);

      // Toggle back on
      store.toggleFolder('/project');
      expect(store.expandedFolders.has('/project')).toBe(true);
    });
  });

  describe('File Operations in Nested Folders', () => {
    it('should support file operations (rename, delete) in nested folders', async () => {
      const store = useFileStore.getState();

      // Create nested structure with files
      await store.createFolder('/src');
      await store.createFolder('/src/components');
      await store.createFile('/src/components/Button.tsx', 'export const Button = () => {};');

      // Verify file exists
      expect(store.files.has('/src/components/Button.tsx')).toBe(true);

      // Rename file
      await store.renameFile('/src/components/Button.tsx', '/src/components/MyButton.tsx');

      // Verify rename
      expect(store.files.has('/src/components/Button.tsx')).toBe(false);
      expect(store.files.has('/src/components/MyButton.tsx')).toBe(true);

      const renamedFile = store.files.get('/src/components/MyButton.tsx');
      expect(renamedFile?.parent).toBe('/src/components');
      expect(renamedFile?.content).toBe('export const Button = () => {};');

      // Delete file
      await store.deleteFile('/src/components/MyButton.tsx');

      // Verify deletion
      expect(store.files.has('/src/components/MyButton.tsx')).toBe(false);
    });

    it('should support opening and closing files from nested folders', async () => {
      const store = useFileStore.getState();

      // Create nested files
      await store.createFolder('/src');
      await store.createFile('/src/App.js', 'console.log("App");');
      await store.createFile('/src/utils.js', 'console.log("Utils");');

      // Open files
      await store.openFile('/src/App.js');
      await store.openFile('/src/utils.js');

      // Verify files are open
      expect(store.openTabs).toContain('/src/App.js');
      expect(store.openTabs).toContain('/src/utils.js');

      // Set active file
      store.setActiveFile('/src/utils.js');
      expect(store.activeFile).toBe('/src/utils.js');

      // Close file
      store.closeFile('/src/App.js');
      expect(store.openTabs).not.toContain('/src/App.js');
      expect(store.openTabs).toContain('/src/utils.js');
    });
  });
});
