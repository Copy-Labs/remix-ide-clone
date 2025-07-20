import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { persist, createJSONStorage } from 'zustand/middleware';
import { enableMapSet } from "immer";
import type { FileSystemState, FileNode } from '@/types';
import { databaseService } from '@/services/databaseService';
import { debug, info, warn, error } from '@/services/loggerService';

// Enable the MapSet plugin for Immer
enableMapSet();

// Size threshold for storing file content in IndexedDB instead of localStorage
// Files larger than this size (in bytes) will be stored in IndexedDB
const INDEXEDDB_SIZE_THRESHOLD = 50 * 1024; // 50KB

interface FileStoreActions {
  // File operations
  createFile: (path: string, content?: string) => Promise<void>;
  createFolder: (path: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  renameFile: (oldPath: string, newPath: string) => Promise<void>;
  updateFileContent: (path: string, content: string) => Promise<void>;

  // Tab operations
  openFile: (path: string) => Promise<void>;
  closeFile: (path: string) => void;
  setActiveFile: (path: string | null) => void;
  closeAllTabs: () => void;
  closeOtherTabs: (path: string) => void;

  // Folder operations
  toggleFolder: (path: string) => void;
  expandFolder: (path: string) => void;
  collapseFolder: (path: string) => void;
  collapseAllFolders: () => void;
  refreshFolders: () => void;

  // Selection operations
  selectFile: (path: string, multiple?: boolean) => void;
  clearSelection: () => void;

  // Utility functions
  getFile: (path: string) => Promise<FileNode | undefined>;
  getFileContent: (path: string) => Promise<string | undefined>;
  isFileOpen: (path: string) => boolean;
  getParentPath: (path: string) => string;
  getFileName: (path: string) => string;
  generateUniqueId: () => string;

  // Import/Export
  importProject: (files: FileNode[]) => Promise<void>;
  exportProject: () => Promise<FileNode[]>;

  // Reset
  reset: () => Promise<void>;

  // Migration
  migrateFromLocalStorage: () => Promise<void>;
}

type FileStore = FileSystemState & FileStoreActions;

const initialState: FileSystemState = {
  files: new Map(),
  activeFile: null,
  openTabs: [],
  selectedFiles: [],
  expandedFolders: new Set(['/']),
};

// Default project structure
const defaultFiles: FileNode[] = [
  {
    id: 'contracts',
    name: 'contracts',
    path: '/contracts',
    type: 'folder',
    lastModified: Date.now(),
    children: [],
  },
  {
    id: 'example-sol',
    name: 'Example.sol',
    path: '/contracts/Example.sol',
    type: 'file',
    parent: '/contracts',
    lastModified: Date.now(),
    content: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Example {
    string public message;

    constructor(string memory _message) {
        message = _message;
    }

    function setMessage(string memory _message) public {
        message = _message;
    }

    function getMessage() public view returns (string memory) {
        return message;
    }
}`,
  },
  {
    id: 'tests',
    name: 'tests',
    path: '/tests',
    type: 'folder',
    lastModified: Date.now(),
    children: [],
  },
  {
    id: 'scripts',
    name: 'scripts',
    path: '/scripts',
    type: 'folder',
    lastModified: Date.now(),
    children: [],
  },
];

export const useFileStore = create<FileStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        createFile: async (path: string, content = '') => {
          const id = get().generateUniqueId();
          const parentPath = get().getParentPath(path);
          const fileName = get().getFileName(path);

          const newFile: FileNode = {
            id,
            name: fileName,
            path,
            type: 'file',
            parent: parentPath,
            lastModified: Date.now(),
            size: content.length,
          };

          // Determine if content should be stored in IndexedDB
          if (content.length > INDEXEDDB_SIZE_THRESHOLD) {
            // Store large content in IndexedDB
            newFile.contentInIndexedDB = true;

            // Save file metadata to state
            set((state) => {
              state.files.set(path, newFile);

              // Add to parent folder if it exists
              const parent = state.files.get(parentPath);
              if (parent && parent.type === 'folder') {
                if (!parent.children) parent.children = [];
                parent.children.push(newFile);
              }
            });

            // Save content to IndexedDB
            try {
              await databaseService.saveFile({
                ...newFile,
                content
              });
              debug('FileStore', `File created with content in IndexedDB: ${path}`);
            } catch (err) {
              error('FileStore', `Failed to save file content to IndexedDB: ${path}`, err);
              throw err;
            }
          } else {
            // Store small content directly in state
            newFile.content = content;
            newFile.contentInIndexedDB = false;

            set((state) => {
              state.files.set(path, newFile);

              // Add to parent folder if it exists
              const parent = state.files.get(parentPath);
              if (parent && parent.type === 'folder') {
                if (!parent.children) parent.children = [];
                parent.children.push(newFile);
              }
            });
          }
        },

        createFolder: async (path: string) => {
          const id = get().generateUniqueId();
          const parentPath = get().getParentPath(path);
          const folderName = get().getFileName(path);

          const newFolder: FileNode = {
            id,
            name: folderName,
            path,
            type: 'folder',
            parent: parentPath,
            lastModified: Date.now(),
            children: [],
          };

          set((state) => {
            state.files.set(path, newFolder);

            // Add to parent folder if it exists
            const parent = state.files.get(parentPath);
            if (parent && parent.type === 'folder') {
              if (!parent.children) parent.children = [];
              parent.children.push(newFolder);
            }
          });
        },

        deleteFile: async (path: string) => {
          const file = get().files.get(path);
          if (!file) return;

          set((state) => {
            // Remove from parent's children
            if (file.parent) {
              const parent = state.files.get(file.parent);
              if (parent && parent.children) {
                parent.children = parent.children.filter(child => child.path !== path);
              }
            }

            // If it's a folder, recursively delete children
            if (file.type === 'folder' && file.children) {
              const deleteRecursively = async (children: FileNode[]) => {
                for (const child of children) {
                  state.files.delete(child.path);

                  // If file content is in IndexedDB, delete it
                  if (child.type === 'file' && child.contentInIndexedDB) {
                    try {
                      await databaseService.deleteFile(child.path);
                      debug('FileStore', `Deleted file content from IndexedDB: ${child.path}`);
                    } catch (err) {
                      error('FileStore', `Failed to delete file content from IndexedDB: ${child.path}`, err);
                    }
                  }

                  if (child.type === 'folder' && child.children) {
                    await deleteRecursively(child.children);
                  }
                }
              };

              // We need to handle this outside the immer setter
              // because it contains async operations
              setTimeout(async () => {
                try {
                  await deleteRecursively(file.children);
                } catch (err) {
                  error('FileStore', `Error during recursive file deletion: ${path}`, err);
                }
              }, 0);
            }

            // Remove from maps and arrays
            state.files.delete(path);
            state.openTabs = state.openTabs.filter(tab => tab !== path);
            state.selectedFiles = state.selectedFiles.filter(selected => selected !== path);
            state.expandedFolders.delete(path);

            // Update active file if it was deleted
            if (state.activeFile === path) {
              state.activeFile = state.openTabs.length > 0 ? state.openTabs[0] : null;
            }
          });

          // If file content is in IndexedDB, delete it
          if (file.type === 'file' && file.contentInIndexedDB) {
            try {
              await databaseService.deleteFile(path);
              debug('FileStore', `Deleted file content from IndexedDB: ${path}`);
            } catch (err) {
              error('FileStore', `Failed to delete file content from IndexedDB: ${path}`, err);
              throw err;
            }
          }
        },

        renameFile: async (oldPath: string, newPath: string) => {
          const file = get().files.get(oldPath);
          if (!file) return;

          const newFileName = get().getFileName(newPath);
          const updatedFile = { ...file, name: newFileName, path: newPath };

          // Handle IndexedDB content if needed
          if (file.type === 'file' && file.contentInIndexedDB) {
            try {
              // Get content from IndexedDB
              const fileWithContent = await databaseService.getFile(oldPath);
              if (fileWithContent && fileWithContent.content) {
                // Save content with new path
                await databaseService.saveFile({
                  ...updatedFile,
                  content: fileWithContent.content
                });
                // Delete old entry
                await databaseService.deleteFile(oldPath);
                debug('FileStore', `Renamed file content in IndexedDB: ${oldPath} -> ${newPath}`);
              }
            } catch (err) {
              error('FileStore', `Failed to rename file content in IndexedDB: ${oldPath} -> ${newPath}`, err);
              throw err;
            }
          }

          set((state) => {
            // Update in files map
            state.files.delete(oldPath);
            state.files.set(newPath, updatedFile);

            // Update in parent's children
            if (file.parent) {
              const parent = state.files.get(file.parent);
              if (parent && parent.children) {
                const childIndex = parent.children.findIndex(child => child.path === oldPath);
                if (childIndex !== -1) {
                  parent.children[childIndex] = updatedFile;
                }
              }
            }

            // Update open tabs
            const tabIndex = state.openTabs.indexOf(oldPath);
            if (tabIndex !== -1) {
              state.openTabs[tabIndex] = newPath;
            }

            // Update active file
            if (state.activeFile === oldPath) {
              state.activeFile = newPath;
            }

            // Update selected files
            const selectedIndex = state.selectedFiles.indexOf(oldPath);
            if (selectedIndex !== -1) {
              state.selectedFiles[selectedIndex] = newPath;
            }
          });
        },

        updateFileContent: async (path: string, content: string) => {
          const file = get().files.get(path);
          if (!file || file.type !== 'file') return;

          const contentSize = content.length;
          const wasInIndexedDB = file.contentInIndexedDB;
          const shouldBeInIndexedDB = contentSize > INDEXEDDB_SIZE_THRESHOLD;

          // Update file metadata
          set((state) => {
            const fileToUpdate = state.files.get(path);
            if (fileToUpdate && fileToUpdate.type === 'file') {
              fileToUpdate.lastModified = Date.now();
              fileToUpdate.size = contentSize;
              fileToUpdate.contentInIndexedDB = shouldBeInIndexedDB;

              // Only store content in state if it's small enough
              if (!shouldBeInIndexedDB) {
                fileToUpdate.content = content;
              } else {
                // Remove content from state if it's now in IndexedDB
                delete fileToUpdate.content;
              }
            }
          });

          // Handle IndexedDB storage
          if (shouldBeInIndexedDB) {
            try {
              await databaseService.saveFile({
                ...file,
                content,
                contentInIndexedDB: true,
                lastModified: Date.now(),
                size: contentSize
              });
              debug('FileStore', `Updated file content in IndexedDB: ${path}`);
            } catch (err) {
              error('FileStore', `Failed to update file content in IndexedDB: ${path}`, err);
              throw err;
            }
          } else if (wasInIndexedDB) {
            // If it was in IndexedDB but now it's small enough, delete from IndexedDB
            try {
              await databaseService.deleteFile(path);
              debug('FileStore', `Removed file content from IndexedDB (now small enough): ${path}`);
            } catch (err) {
              error('FileStore', `Failed to remove file content from IndexedDB: ${path}`, err);
            }
          }
        },

        openFile: async (path: string) => {
          // Load file content from IndexedDB if needed
          const file = get().files.get(path);
          if (file && file.type === 'file' && file.contentInIndexedDB) {
            try {
              const fileWithContent = await databaseService.getFile(path);
              if (fileWithContent && fileWithContent.content) {
                // Update file in state with content (temporarily)
                set((state) => {
                  const fileToUpdate = state.files.get(path);
                  if (fileToUpdate && fileToUpdate.type === 'file') {
                    fileToUpdate.content = fileWithContent.content;
                  }
                });
              }
            } catch (err) {
              error('FileStore', `Failed to load file content from IndexedDB: ${path}`, err);
              throw err;
            }
          }

          // Update open tabs and active file
          set((state) => {
            if (!state.openTabs.includes(path)) {
              state.openTabs.push(path);
            }
            state.activeFile = path;
          });
        },

        closeFile: (path: string) => {
          set((state) => {
            state.openTabs = state.openTabs.filter(tab => tab !== path);

            if (state.activeFile === path) {
              state.activeFile = state.openTabs.length > 0 ? state.openTabs[state.openTabs.length - 1] : null;
            }

            // If file content was loaded from IndexedDB, remove it from state to save memory
            const file = state.files.get(path);
            if (file && file.type === 'file' && file.contentInIndexedDB && file.content) {
              delete file.content;
            }
          });
        },

        setActiveFile: (path: string | null) => {
          set((state) => {
            state.activeFile = path;
          });
        },

        closeAllTabs: () => {
          set((state) => {
            // Clear content from memory for files loaded from IndexedDB
            state.openTabs.forEach(path => {
              const file = state.files.get(path);
              if (file && file.type === 'file' && file.contentInIndexedDB && file.content) {
                delete file.content;
              }
            });

            state.openTabs = [];
            state.activeFile = null;
          });
        },

        closeOtherTabs: (path: string) => {
          set((state) => {
            // Clear content from memory for files loaded from IndexedDB
            state.openTabs.forEach(tabPath => {
              if (tabPath !== path) {
                const file = state.files.get(tabPath);
                if (file && file.type === 'file' && file.contentInIndexedDB && file.content) {
                  delete file.content;
                }
              }
            });

            state.openTabs = [path];
            state.activeFile = path;
          });
        },

        toggleFolder: (path: string) => {
          set((state) => {
            if (state.expandedFolders.has(path)) {
              state.expandedFolders.delete(path);
            } else {
              state.expandedFolders.add(path);
            }
          });
        },

        expandFolder: (path: string) => {
          set((state) => {
            state.expandedFolders.add(path);
          });
        },

        collapseFolder: (path: string) => {
          set((state) => {
            state.expandedFolders.delete(path);
          });
        },

        collapseAllFolders: () => {
          set((state) => {
            state.expandedFolders = new Set(['/']);
          });
        },

        refreshFolders: () => {
          set((state) => {
            // Force re-render by creating a new Set with current expanded folders
            const currentExpanded = Array.from(state.expandedFolders);
            state.expandedFolders = new Set(currentExpanded);
          });
        },

        selectFile: (path: string, multiple = false) => {
          set((state) => {
            if (multiple) {
              if (!state.selectedFiles.includes(path)) {
                state.selectedFiles.push(path);
              }
            } else {
              state.selectedFiles = [path];
            }
          });
        },

        clearSelection: () => {
          set((state) => {
            state.selectedFiles = [];
          });
        },

        getFile: async (path: string) => {
          const file = get().files.get(path);

          // If file content is in IndexedDB, load it
          if (file && file.type === 'file' && file.contentInIndexedDB && !file.content) {
            try {
              const fileWithContent = await databaseService.getFile(path);
              if (fileWithContent && fileWithContent.content) {
                return {
                  ...file,
                  content: fileWithContent.content
                };
              }
            } catch (err) {
              error('FileStore', `Failed to get file content from IndexedDB: ${path}`, err);
              throw err;
            }
          }

          return file;
        },

        getFileContent: async (path: string) => {
          const file = await get().getFile(path);
          return file?.content;
        },

        isFileOpen: (path: string) => {
          return get().openTabs.includes(path);
        },

        getParentPath: (path: string) => {
          const parts = path.split('/').filter(Boolean);
          if (parts.length <= 1) return '/';
          return '/' + parts.slice(0, -1).join('/');
        },

        getFileName: (path: string) => {
          const parts = path.split('/').filter(Boolean);
          return parts[parts.length - 1] || '';
        },

        generateUniqueId: () => {
          return Math.random().toString(36).substring(2, 15);
        },

        importProject: async (files: FileNode[]) => {
          // Clear existing files
          set((state) => {
            state.files.clear();
            state.openTabs = [];
            state.activeFile = null;
            state.selectedFiles = [];
            state.expandedFolders = new Set(['/']);
          });

          // Process files
          for (const file of files) {
            if (file.type === 'file') {
              await get().createFile(file.path, file.content || '');
            } else {
              await get().createFolder(file.path);
            }
          }
        },

        exportProject: async () => {
          const files = Array.from(get().files.values());
          const result: FileNode[] = [];

          // Ensure all files have their content loaded
          for (const file of files) {
            if (file.type === 'file' && file.contentInIndexedDB && !file.content) {
              try {
                const fileWithContent = await databaseService.getFile(file.path);
                if (fileWithContent && fileWithContent.content) {
                  result.push({
                    ...file,
                    content: fileWithContent.content,
                    contentInIndexedDB: undefined // Remove this property for export
                  });
                } else {
                  result.push({
                    ...file,
                    content: '', // Fallback to empty content
                    contentInIndexedDB: undefined
                  });
                }
              } catch (err) {
                error('FileStore', `Failed to export file content from IndexedDB: ${file.path}`, err);
                result.push({
                  ...file,
                  content: '', // Fallback to empty content
                  contentInIndexedDB: undefined
                });
              }
            } else {
              // For folders or files with content in state
              const fileCopy = { ...file };
              if (fileCopy.contentInIndexedDB !== undefined) {
                delete fileCopy.contentInIndexedDB;
              }
              result.push(fileCopy);
            }
          }

          return result;
        },

        reset: async () => {
          // Clear IndexedDB
          try {
            await databaseService.clearDatabase();
            debug('FileStore', 'IndexedDB cleared during reset');
          } catch (err) {
            error('FileStore', 'Failed to clear IndexedDB during reset', err);
          }

          // Reset state
          set((state) => {
            state.files.clear();
            state.openTabs = [];
            state.activeFile = null;
            state.selectedFiles = [];
            state.expandedFolders = new Set(['/']);
          });

          // Add default files
          for (const file of defaultFiles) {
            if (file.type === 'file') {
              await get().createFile(file.path, file.content || '');
            } else {
              await get().createFolder(file.path);
            }
          }
        },

        migrateFromLocalStorage: async () => {
          try {
            info('FileStore', 'Starting migration from localStorage to IndexedDB');

            // Get data from localStorage
            const storageData = localStorage.getItem('file-storage');
            if (!storageData) {
              info('FileStore', 'No data found in localStorage for migration');
              return;
            }

            const parsedData = JSON.parse(storageData);
            if (!parsedData.state || !parsedData.state.filesArray) {
              info('FileStore', 'Invalid data format in localStorage');
              return;
            }

            // Convert array back to Map
            const filesMap = new Map(parsedData.state.filesArray);

            // Migrate files to IndexedDB
            for (const [path, file] of filesMap.entries()) {
              if (file.type === 'file' && file.content && file.content.length > INDEXEDDB_SIZE_THRESHOLD) {
                try {
                  // Save to IndexedDB
                  await databaseService.saveFile({
                    ...file,
                    contentInIndexedDB: true
                  });

                  // Update file in state
                  set((state) => {
                    const fileInState = state.files.get(path);
                    if (fileInState && fileInState.type === 'file') {
                      fileInState.contentInIndexedDB = true;
                      delete fileInState.content;
                    }
                  });

                  debug('FileStore', `Migrated file to IndexedDB: ${path}`);
                } catch (err) {
                  error('FileStore', `Failed to migrate file to IndexedDB: ${path}`, err);
                }
              }
            }

            info('FileStore', 'Migration from localStorage to IndexedDB completed');
          } catch (err) {
            error('FileStore', 'Failed to migrate from localStorage to IndexedDB', err);
            throw err;
          }
        }
      })),
      {
        name: 'file-storage',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => {
          // Convert Map to array of entries for serialization
          const filesArray = Array.from(state.files.entries()).map(([path, file]) => {
            // Don't include content for files stored in IndexedDB
            if (file.type === 'file' && file.contentInIndexedDB) {
              const { content, ...fileWithoutContent } = file;
              return [path, fileWithoutContent];
            }
            return [path, file];
          });

          // Convert Set to array for serialization
          const expandedFoldersArray = Array.from(state.expandedFolders);

          return {
            // Return serializable version of the state
            filesArray,
            expandedFoldersArray,
            openTabs: state.openTabs,
            activeFile: state.activeFile,
            selectedFiles: state.selectedFiles,
          };
        },
        // Custom merge function to handle Map and Set reconstruction
        merge: (persistedState: any, currentState) => {
          const mergedState = { ...currentState };

          if (persistedState.filesArray) {
            // Convert array back to Map
            mergedState.files = new Map(persistedState.filesArray);
          }

          if (persistedState.expandedFoldersArray) {
            // Convert array back to Set
            mergedState.expandedFolders = new Set(persistedState.expandedFoldersArray);
          }

          if (persistedState.openTabs) {
            mergedState.openTabs = persistedState.openTabs;
          }

          if (persistedState.activeFile !== undefined) {
            mergedState.activeFile = persistedState.activeFile;
          }

          if (persistedState.selectedFiles) {
            mergedState.selectedFiles = persistedState.selectedFiles;
          }

          return mergedState;
        },
        version: 2, // Increment version for migration
        onRehydrateStorage: () => (state) => {
          // Log when state is rehydrated from storage
          info('FileStore', 'File store state rehydrated from localStorage');

          // Migrate data from localStorage to IndexedDB if needed
          if (state) {
            setTimeout(async () => {
              try {
                await state.migrateFromLocalStorage();
              } catch (err) {
                error('FileStore', 'Error during migration', err);
              }
            }, 1000);
          }
        },
      }
    ),
    {
      name: 'file-store',
    }
  )
);

// Initialize with default files only if no files exist
(async () => {
  try {
    // Wait a bit for the store to be properly initialized and rehydrated
    setTimeout(async () => {
      const state = useFileStore.getState();

      // Only initialize default files if no files exist
      if (state.files.size === 0) {
        debug('FileStore', 'No existing files found, initializing with default files');

        // Add default files without clearing existing data
        for (const file of defaultFiles) {
          if (file.type === 'file') {
            await state.createFile(file.path, file.content || '');
          } else {
            await state.createFolder(file.path);
          }
        }
      } else {
        debug('FileStore', `Found ${state.files.size} existing files, skipping default initialization`);
      }
    }, 1500); // Wait longer than the migration timeout to ensure proper initialization
  } catch (err) {
    console.error('Failed to initialize file store:', err);
  }
})();
