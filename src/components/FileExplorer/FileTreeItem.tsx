import React, { useCallback, useState } from 'react';
import type { FileNode } from '@/types';
import {
  ChevronRight, Folder,
  LucideFile,
  LucideFilePlus,
  LucideFolder,
  LucideFolderOpen,
  LucideFolderPlus, LucidePencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible.tsx';

interface FileTreeItemProps {
  file: FileNode;
  level: number;
  isExpanded: boolean;
  isSelected: boolean;
  children: FileNode[];
  onClick: (file: FileNode, event: React.MouseEvent) => void;
  onDoubleClick: (file: FileNode, event: React.MouseEvent) => void;
  onContextMenu: (event: React.MouseEvent, file: FileNode | null) => void;
  onRename: (oldPath: string, newName: string) => void;
  onToggleExpanded: () => void;
  isCreating: 'file' | 'folder' | null;
  onCreateConfirm: (name: string) => void;
  onCreateCancel: () => void;
  onCreateNew: (type: 'file' | 'folder', parentPath: string) => void;
  getChildren: (parentPath: string) => FileNode[];
  expandedFolders: Set<string>;
  selectedFiles: string[];
}

const FileTreeItem: React.FC<FileTreeItemProps> = ({
  file,
  level,
  isExpanded,
  isSelected,
  children,
  onClick,
  onDoubleClick,
  onContextMenu,
  onRename,
  onToggleExpanded,
  isCreating,
  onCreateConfirm,
  onCreateCancel,
  onCreateNew,
  getChildren,
  expandedFolders,
  selectedFiles,
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(file.name);

  const handleRenameSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      if (renameValue.trim()) {
        onRename(file.path, renameValue.trim());
        setIsRenaming(false);
      }
    },
    [renameValue, file.path, onRename],
  );

  const handleRenameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => setRenameValue(event.target.value),
    [],
  );

  const handleRenameKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsRenaming(false);
    }
  }, []);

  return (
    <>
      {/*<Collapsible*/}
      {/*  className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"*/}
      {/*  // defaultOpen={name === "components" || name === "ui"}*/}
      {/*>*/}
      {/*  <CollapsibleTrigger asChild>*/}
      {/*    <Button size={'sm'} variant={'ghost'}>*/}
      {/*      <ChevronRight className="transition-transform" />*/}
      {/*      {name}*/}
      {/*    </Button>*/}
      {/*  </CollapsibleTrigger>*/}
      {/*  <CollapsibleContent>*/}

      {/*  </CollapsibleContent>*/}
      {/*</Collapsible>*/}

      <div className="flex flex-col">
        <div
          className={`flex items-center space-x-2 p-2 rounded cursor-pointer ${
            isSelected ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          onClick={(event) => onClick(file, event)}
          onDoubleClick={(event) => onDoubleClick(file, event)}
          onContextMenu={(event) => onContextMenu(event, file)}
          style={{ marginLeft: level * 16 }}
        >
          <span onClick={onToggleExpanded} className="text-sm select-none">
            {/*{file.type === 'folder' ? (isExpanded ? '📂' : '📁') : '📄'}*/}
            {file.type === 'folder' ? (
              isExpanded ? (
                <LucideFolderOpen size={15} />
              ) : (
                <LucideFolder size={15} />
              )
            ) : (
              <LucideFile size={15} />
            )}
          </span>
          {isRenaming ? (
            <input
              value={renameValue}
              onChange={handleRenameChange}
              onBlur={() => setIsRenaming(false)}
              onKeyDown={handleRenameKeyDown}
              className="text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          ) : (
            <span
              className="flex-1 text-sm text-gray-700 dark:text-gray-300"
              onDoubleClick={(e) => {
                e.stopPropagation();
                setIsRenaming(true);
              }}
            >
              {file.name}
            </span>
          )}

          {/* New File/Folder Input */}
          {isCreating && isExpanded && (
            <CreateNewItem type={isCreating} onConfirm={onCreateConfirm} onCancel={onCreateCancel} />
          )}

          {/* Context Menu Actions (icon buttons) */}
          <div className="flex items-center space-x-0.5">
            <Button
              // className="p-1 rounded-sm hover:bg-gray-200 dark:hover:bg-gray-600"
              onClick={(e) => {
                e.stopPropagation();
                onCreateNew('file', file.path);
              }}
              size={'sm'}
              variant={'ghost'}
            >
              {/*➕📄*/}
              <LucideFilePlus size={14} />
            </Button>
            <Button
              // className="p-1 rounded-sm hover:bg-gray-200 dark:hover:bg-gray-600"
              onClick={(e) => {
                e.stopPropagation();
                onCreateNew('folder', file.path);
              }}
              size={'sm'}
              variant={'ghost'}
            >
              {/*➕📁*/}
              <LucideFolderPlus size={14} />
            </Button>
            <Button
              // className="p-1 rounded-sm hover:bg-gray-200 dark:hover:bg-gray-600"
              onClick={(e) => {
                e.stopPropagation();
                setIsRenaming(true);
              }}
              size={'sm'}
              variant={'ghost'}
            >
              {/*✏️*/}
              <LucidePencil size={14} />
            </Button>
          </div>
        </div>

        {/* Render children if expanded */}
        {isExpanded && children && (
          <div className="pl-4">
            {children.map((child) => (
              <FileTreeItem
                key={child.path}
                file={child}
                level={level + 1}
                isExpanded={expandedFolders.has(child.path)}
                isSelected={selectedFiles.includes(child.path)}
                children={child.type === 'folder' ? getChildren(child.path) : []}
                onClick={onClick}
                onDoubleClick={onDoubleClick}
                onContextMenu={onContextMenu}
                onRename={onRename}
                onToggleExpanded={() => onToggleExpanded()}
                isCreating={null}
                onCreateConfirm={onCreateConfirm}
                onCreateCancel={onCreateCancel}
                onCreateNew={onCreateNew}
                expandedFolders={expandedFolders}
                selectedFiles={selectedFiles}
                getChildren={getChildren}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

interface CreateNewItemProps {
  type: 'file' | 'folder';
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

const CreateNewItem: React.FC<CreateNewItemProps> = ({ type, onConfirm, onCancel }) => {
  const [name, setName] = useState('');

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      if (name.trim()) {
        onConfirm(name.trim());
      }
    },
    [name, onConfirm],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    },
    [onCancel],
  );

  return (
    <form onSubmit={handleSubmit} className="flex items-center space-x-2 p-1">
      <span className="text-sm">{type === 'folder' ? '📁' : '📄'}</span>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={onCancel}
        placeholder={`New ${type} name`}
        className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
        autoFocus
      />
    </form>
  );
};

export default FileTreeItem;
