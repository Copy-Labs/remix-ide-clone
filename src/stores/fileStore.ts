import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { persist, createJSONStorage } from 'zustand/middleware';
import {enableMapSet} from "immer";
import type {FileSystemState, FileNode} from '@/types';

// Enable the MapSet plugin for Immer
enableMapSet();

interface FileStoreActions {
  // File operations
  createFile: (path: string, content?: string) => void;
  createFolder: (path: string) => void;
  deleteFile: (path: string) => void;
  renameFile: (oldPath: string, newPath: string) => void;
  updateFileContent: (path: string, content: string) => void;

  // Tab operations
  openFile: (path: string) => void;
  closeFile: (path: string) => void;
  setActiveFile: (path: string | null) => void;
  closeAllTabs: () => void;
  closeOtherTabs: (path: string) => void;

  // Folder operations
  toggleFolder: (path: string) => void;
  expandFolder: (path: string) => void;
  collapseFolder: (path: string) => void;

  // Selection operations
  selectFile: (path: string, multiple?: boolean) => void;
  clearSelection: () => void;

  // Utility functions
  getFile: (path: string) => FileNode | undefined;
  getFileContent: (path: string) => string | undefined;
  isFileOpen: (path: string) => boolean;
  getParentPath: (path: string) => string;
  getFileName: (path: string) => string;
  generateUniqueId: () => string;

  // Import/Export
  importProject: (files: FileNode[]) => void;
  exportProject: () => FileNode[];

  // Reset
  reset: () => void;
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

        createFile: (path: string, content = '') => {
          set((state) => {
            const id = get().generateUniqueId();
            const parentPath = get().getParentPath(path);
            const fileName = get().getFileName(path);

            const newFile: FileNode = {
              id,
              name: fileName,
              path,
              type: 'file',
              content,
              parent: parentPath,
              lastModified: Date.now(),
              size: content.length,
            };

            state.files.set(path, newFile);

            // Add to parent folder if it exists
            const parent = state.files.get(parentPath);
            if (parent && parent.type === 'folder') {
              if (!parent.children) parent.children = [];
              parent.children.push(newFile);
            }
          });
        },

        createFolder: (path: string) => {
          set((state) => {
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

            state.files.set(path, newFolder);

            // Add to parent folder if it exists
            const parent = state.files.get(parentPath);
            if (parent && parent.type === 'folder') {
              if (!parent.children) parent.children = [];
              parent.children.push(newFolder);
            }
          });
        },

        deleteFile: (path: string) => {
          set((state) => {
            const file = state.files.get(path);
            if (!file) return;

            // Remove from parent's children
            if (file.parent) {
              const parent = state.files.get(file.parent);
              if (parent && parent.children) {
                parent.children = parent.children.filter(child => child.path !== path);
              }
            }

            // If it's a folder, recursively delete children
            if (file.type === 'folder' && file.children) {
              const deleteRecursively = (children: FileNode[]) => {
                children.forEach(child => {
                  state.files.delete(child.path);
                  if (child.type === 'folder' && child.children) {
                    deleteRecursively(child.children);
                  }
                });
              };
              deleteRecursively(file.children);
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
        },

        renameFile: (oldPath: string, newPath: string) => {
          set((state) => {
            const file = state.files.get(oldPath);
            if (!file) return;

            const newFileName = get().getFileName(newPath);
            const updatedFile = { ...file, name: newFileName, path: newPath };

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

        updateFileContent: (path: string, content: string) => {
          set((state) => {
            const file = state.files.get(path);
            if (file && file.type === 'file') {
              file.content = content;
              file.lastModified = Date.now();
              file.size = content.length;
            }
          });
        },

        openFile: (path: string) => {
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
          });
        },

        setActiveFile: (path: string | null) => {
          set((state) => {
            state.activeFile = path;
          });
        },

        closeAllTabs: () => {
          set((state) => {
            state.openTabs = [];
            state.activeFile = null;
          });
        },

        closeOtherTabs: (path: string) => {
          set((state) => {
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

        getFile: (path: string) => {
          return get().files.get(path);
        },

        getFileContent: (path: string) => {
          const file = get().files.get(path);
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

        importProject: (files: FileNode[]) => {
          set((state) => {
            state.files.clear();
            state.openTabs = [];
            state.activeFile = null;
            state.selectedFiles = [];
            state.expandedFolders = new Set(['/']);

            files.forEach(file => {
              state.files.set(file.path, file);
            });
          });
        },

        exportProject: () => {
          return Array.from(get().files.values());
        },

        reset: () => {
          set((state) => {
            state.files.clear();
            state.openTabs = [];
            state.activeFile = null;
            state.selectedFiles = [];
            state.expandedFolders = new Set(['/']);

            // Add default files
            defaultFiles.forEach(file => {
              state.files.set(file.path, file);
            });
          });
        },
      })),
      {
        name: 'file-storage',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => {
          // Convert Map to array of entries for serialization
          const filesArray = Array.from(state.files.entries());
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
        version: 1, // Add version for future migrations
        onRehydrateStorage: () => (state) => {
          // Log when state is rehydrated from storage
          console.log('File store state rehydrated from localStorage');
        },
      }
    ),
    {
      name: 'file-store',
    }
  )
);

// Initialize with default files
useFileStore.getState().reset();
