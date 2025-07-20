import React, { useCallback, useMemo, useState } from 'react';
import { useFileStore } from '@/stores/fileStore.ts';
import type { FileNode } from '@/types';
import FileTreeItem from './FileTreeItem';
import FileExplorerHeader from './FileExplorerHeader';
import ContextMenu, { type ClipboardItem } from './ContextMenu';
import { FileTypeIcon } from './FileTypeIcons';
import { Input } from '@/components/ui/input.tsx';

interface FileExplorerProps {
  className?: string;
}

const FileExplorer: React.FC<FileExplorerProps> = ({ className = '' }) => {
  const {
    files,
    expandedFolders,
    selectedFiles,
    createFile,
    createFolder,
    deleteFile,
    renameFile,
    openFile,
    selectFile,
    clearSelection,
    toggleFolder,
    getFileContent,
    collapseAllFolders,
    refreshFolders,
  } = useFileStore();

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    file: FileNode | null;
  } | null>(null);

  const [isCreating, setIsCreating] = useState<{
    type: 'file' | 'folder';
    parentPath: string;
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [clipboardItem, setClipboardItem] = useState<ClipboardItem | null>(null);

  // Search filtering logic
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) {
      return files;
    }

    const query = searchQuery.toLowerCase();
    const matchingFiles = new Map<string, FileNode>();

    // Find all files that match the search query
    for (const [path, file] of files) {
      if (file.name.toLowerCase().includes(query)) {
        matchingFiles.set(path, file);

        // Also include all parent folders to maintain hierarchy
        let currentPath = file.parent;
        while (currentPath && currentPath !== '/' && !matchingFiles.has(currentPath)) {
          const parentFile = files.get(currentPath);
          if (parentFile) {
            matchingFiles.set(currentPath, parentFile);
            currentPath = parentFile.parent;
          } else {
            break;
          }
        }
      }
    }

    return matchingFiles;
  }, [files, searchQuery]);

  // Get root files (files without parent or with parent '/')
  const getRootFiles = useCallback(() => {
    return Array.from(filteredFiles.values())
      .filter((file) => !file.parent || file.parent === '/')
      .sort((a, b) => {
        // Folders first, then files, alphabetically
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
  }, [filteredFiles]);

  // Get children of a folder
  const getChildren = useCallback(
    (parentPath: string) => {
      return Array.from(filteredFiles.values())
        .filter((file) => file.parent === parentPath)
        .sort((a, b) => {
          if (a.type !== b.type) {
            return a.type === 'folder' ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });
    },
    [filteredFiles],
  );

  const handleFileClick = useCallback(
    (file: FileNode, event: React.MouseEvent) => {
      event.stopPropagation();

      if (event.ctrlKey || event.metaKey) {
        // Multi-select
        selectFile(file.path, true);
      } else {
        selectFile(file.path, false);

        if (file.type === 'file') {
          openFile(file.path);
        } else {
          toggleFolder(file.path);
        }
      }
    },
    [selectFile, openFile, toggleFolder],
  );

  const handleFileDoubleClick = useCallback(
    (file: FileNode, event: React.MouseEvent) => {
      event.stopPropagation();

      if (file.type === 'file') {
        openFile(file.path);
      } else {
        toggleFolder(file.path);
      }
    },
    [openFile, toggleFolder],
  );

  const handleContextMenu = useCallback((event: React.MouseEvent, file: FileNode | null) => {
    event.preventDefault();
    event.stopPropagation();

    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      file,
    });
  }, []);

  const handleCreateNew = useCallback((type: 'file' | 'folder', parentPath: string = '/') => {
    setIsCreating({ type, parentPath });
    setContextMenu(null);
  }, []);

  const handleCreateConfirm = useCallback(
    (name: string) => {
      if (!isCreating || !name.trim()) return;

      const path = isCreating.parentPath === '/' ? `/${name}` : `${isCreating.parentPath}/${name}`;

      if (isCreating.type === 'file') {
        createFile(path, '');
      } else {
        createFolder(path);
      }

      setIsCreating(null);
    },
    [isCreating, createFile, createFolder],
  );

  const handleCreateCancel = useCallback(() => {
    setIsCreating(null);
  }, []);

  const handleDelete = useCallback(
    (filePath: string) => {
      if (window.confirm('Are you sure you want to delete this item?')) {
        deleteFile(filePath);
      }
      setContextMenu(null);
    },
    [deleteFile],
  );

  const handleRename = useCallback(
    (oldPath: string, newName: string) => {
      const parentPath = oldPath.substring(0, oldPath.lastIndexOf('/')) || '/';
      const newPath = parentPath === '/' ? `/${newName}` : `${parentPath}/${newName}`;
      renameFile(oldPath, newPath);
    },
    [renameFile],
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleBackgroundClick = useCallback(() => {
    clearSelection();
    closeContextMenu();
  }, [clearSelection, closeContextMenu]);

  // Clipboard operations
  const handleCopy = useCallback((file: FileNode) => {
    setClipboardItem({ file, operation: 'copy' });
  }, []);

  const handleCut = useCallback((file: FileNode) => {
    setClipboardItem({ file, operation: 'cut' });
  }, []);

  const handlePaste = useCallback(
    async (targetPath: string) => {
      if (!clipboardItem) return;

      const { file, operation } = clipboardItem;
      const fileName = file.name;
      const newPath = targetPath === '/' ? `/${fileName}` : `${targetPath}/${fileName}`;

      try {
        if (operation === 'copy') {
          // Copy file/folder
          if (file.type === 'file') {
            const content = await getFileContent(file.path);
            await createFile(newPath, content || '');
          } else {
            await createFolder(newPath);
            // TODO: Recursively copy folder contents
          }
        } else if (operation === 'cut') {
          // Move file/folder
          await renameFile(file.path, newPath);
          setClipboardItem(null); // Clear clipboard after cut operation
        }
      } catch (error) {
        console.error('Paste operation failed:', error);
      }
    },
    [clipboardItem, createFile, createFolder, renameFile, getFileContent],
  );

  const handleDuplicate = useCallback(
    async (file: FileNode) => {
      const baseName = file.name;
      const extension = baseName.includes('.') ? baseName.split('.').pop() : '';
      const nameWithoutExt = extension ? baseName.slice(0, -(extension.length + 1)) : baseName;
      const newName = extension ? `${nameWithoutExt}_copy.${extension}` : `${nameWithoutExt}_copy`;
      const parentPath = file.parent || '/';
      const newPath = parentPath === '/' ? `/${newName}` : `${parentPath}/${newName}`;

      try {
        if (file.type === 'file') {
          const content = await getFileContent(file.path);
          await createFile(newPath, content || '');
        } else {
          await createFolder(newPath);
          // TODO: Recursively duplicate folder contents
        }
      } catch (error) {
        console.error('Duplicate operation failed:', error);
      }
    },
    [createFile, createFolder, getFileContent],
  );

  // Utility functions
  const handleRefresh = useCallback(() => {
    // Force re-render using the store method
    refreshFolders();
  }, [refreshFolders]);

  const handleCollapseAll = useCallback(() => {
    // Collapse all folders using the store method
    collapseAllFolders();
  }, [collapseAllFolders]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  return (
    <div className={`flex flex-col h-full max-w-full ${className}`}>
      <FileExplorerHeader
        onCreateFile={() => handleCreateNew('file', '/')}
        onCreateFolder={() => handleCreateNew('folder', '/')}
        onRefresh={handleRefresh}
        onCollapseAll={handleCollapseAll}
        onSearch={handleSearch}
        searchQuery={searchQuery}
      />

      <div
        className="flex-1 overflow-auto p-2"
        onClick={handleBackgroundClick}
        onContextMenu={(e) => handleContextMenu(e, null)}
      >
        <div className="space-y-1">
          {getRootFiles().map((file) => (
            <FileTreeItem
              key={file.id}
              file={file}
              level={0}
              isExpanded={expandedFolders.has(file.path)}
              isSelected={selectedFiles.includes(file.path)}
              children={file.type === 'folder' ? getChildren(file.path) : []}
              onClick={handleFileClick}
              onDoubleClick={handleFileDoubleClick}
              onContextMenu={handleContextMenu}
              onRename={handleRename}
              onToggleExpanded={() => toggleFolder(file.path)}
              isCreating={isCreating?.parentPath === file.path ? isCreating : null}
              onCreateConfirm={handleCreateConfirm}
              onCreateCancel={handleCreateCancel}
              onCreateNew={handleCreateNew}
              getChildren={getChildren}
              expandedFolders={expandedFolders}
              selectedFiles={selectedFiles}
              toggleFolder={toggleFolder}
            />
          ))}
        </div>

        {/* Create New Item Input */}
        {isCreating?.parentPath === '/' && (
          <div className="mt-2">
            <CreateNewItem
              type={isCreating.type}
              onConfirm={handleCreateConfirm}
              onCancel={handleCreateCancel}
            />
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          file={contextMenu.file}
          onClose={closeContextMenu}
          onCreateFile={(parentPath) => handleCreateNew('file', parentPath)}
          onCreateFolder={(parentPath) => handleCreateNew('folder', parentPath)}
          onDelete={handleDelete}
          onRename={(filePath) => {
            // Trigger rename mode in FileTreeItem
            // This is handled by the FileTreeItem component itself
          }}
          onCopy={handleCopy}
          onCut={handleCut}
          onPaste={handlePaste}
          onDuplicate={handleDuplicate}
          onRefresh={handleRefresh}
          clipboardItem={clipboardItem}
        />
      )}
    </div>
  );
};

// Create New Item Component
interface CreateNewItemProps {
  type: 'file' | 'folder';
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

const CreateNewItem: React.FC<CreateNewItemProps> = ({ type, onConfirm, onCancel }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onConfirm(name.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center space-x-2 p-1">
      <span className="text-sm">
        <FileTypeIcon
          fileName={type === 'folder' ? 'folder' : 'file.txt'}
          fileType={type}
          size={16}
          className="text-gray-600 dark:text-gray-400"
        />
      </span>
      <Input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={onCancel}
        placeholder={`New ${type} name`}
        autoFocus
      />
    </form>
  );
};

export default FileExplorer;
