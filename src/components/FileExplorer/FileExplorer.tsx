import React, { useState, useCallback } from 'react';
import { useFileStore } from '@/stores/fileStore.ts';
import type {FileNode} from '@/types';
import FileTreeItem from './FileTreeItem';
import FileExplorerHeader from './FileExplorerHeader';
import ContextMenu from './ContextMenu';

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
    toggleFolder
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

  // Get root files (files without parent or with parent '/')
  const getRootFiles = useCallback(() => {
    return Array.from(files.values())
      .filter(file => !file.parent || file.parent === '/')
      .sort((a, b) => {
        // Folders first, then files, alphabetically
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
  }, [files]);

  // Get children of a folder
  const getChildren = useCallback((parentPath: string) => {
    return Array.from(files.values())
      .filter(file => file.parent === parentPath)
      .sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
  }, [files]);

  const handleFileClick = useCallback((file: FileNode, event: React.MouseEvent) => {
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
  }, [selectFile, openFile, toggleFolder]);

  const handleFileDoubleClick = useCallback((file: FileNode, event: React.MouseEvent) => {
    event.stopPropagation();

    if (file.type === 'file') {
      openFile(file.path);
    } else {
      toggleFolder(file.path);
    }
  }, [openFile, toggleFolder]);

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

  const handleCreateConfirm = useCallback((name: string) => {
    if (!isCreating || !name.trim()) return;

    const path = isCreating.parentPath === '/'
      ? `/${name}`
      : `${isCreating.parentPath}/${name}`;

    if (isCreating.type === 'file') {
      createFile(path, '');
    } else {
      createFolder(path);
    }

    setIsCreating(null);
  }, [isCreating, createFile, createFolder]);

  const handleCreateCancel = useCallback(() => {
    setIsCreating(null);
  }, []);

  const handleDelete = useCallback((filePath: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      deleteFile(filePath);
    }
    setContextMenu(null);
  }, [deleteFile]);

  const handleRename = useCallback((oldPath: string, newName: string) => {
    const parentPath = oldPath.substring(0, oldPath.lastIndexOf('/')) || '/';
    const newPath = parentPath === '/' ? `/${newName}` : `${parentPath}/${newName}`;
    renameFile(oldPath, newPath);
  }, [renameFile]);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleBackgroundClick = useCallback(() => {
    clearSelection();
    closeContextMenu();
  }, [clearSelection, closeContextMenu]);

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-800 ${className}`}>
      <FileExplorerHeader
        onCreateFile={() => handleCreateNew('file', '/')}
        onCreateFolder={() => handleCreateNew('folder', '/')}
      />

      <div
        className="flex-1 overflow-auto p-2"
        onClick={handleBackgroundClick}
        onContextMenu={(e) => handleContextMenu(e, null)}
      >
        <div className="space-y-1">
          {getRootFiles().map(file => (
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
              isCreating={isCreating?.parentPath === file.path ? isCreating.type : null}
              onCreateConfirm={handleCreateConfirm}
              onCreateCancel={handleCreateCancel}
              onCreateNew={handleCreateNew}
              getChildren={getChildren}
              expandedFolders={expandedFolders}
              selectedFiles={selectedFiles}
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
        {type === 'folder' ? '📁' : '📄'}
      </span>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={onCancel}
        placeholder={`New ${type} name`}
        className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        autoFocus
      />
    </form>
  );
};

export default FileExplorer;
