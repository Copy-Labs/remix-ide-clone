import React, { useCallback, useState } from 'react';
import type { FileNode } from '@/types';
import {
  LucideFilePlus,
  LucideFolderPlus,
  LucidePencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip.tsx';
import { FileTypeIcon } from './FileTypeIcons';

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
  isCreating: { type: 'file' | 'folder'; parentPath: string } | null;
  onCreateConfirm: (name: string) => void;
  onCreateCancel: () => void;
  onCreateNew: (type: 'file' | 'folder', parentPath: string) => void;
  getChildren: (parentPath: string) => FileNode[];
  expandedFolders: Set<string>;
  selectedFiles: string[];
  toggleFolder: (path: string) => void;
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
  toggleFolder,
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
          className={`group flex items-center space-x-2 p-2 rounded cursor-pointer transition-colors ${
            isSelected ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          onClick={(event) => onClick(file, event)}
          onDoubleClick={(event) => onDoubleClick(file, event)}
          onContextMenu={(event) => onContextMenu(event, file)}
          style={{ marginLeft: level * 16 }}
        >
          <span onClick={onToggleExpanded} className="text-sm select-none cursor-pointer">
            <FileTypeIcon
              fileName={file.name}
              fileType={file.type}
              isExpanded={isExpanded}
              size={16}
              className="text-gray-600 dark:text-gray-400"
            />
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


          {/* Context Menu Actions (icon buttons) */}
          <TooltipProvider>
            <div className="flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Only show create buttons on folders */}
              {file.type === 'folder' && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCreateNew('file', file.path);
                        }}
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                      >
                        <LucideFilePlus size={12} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>New File</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCreateNew('folder', file.path);
                        }}
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                      >
                        <LucideFolderPlus size={12} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>New Folder</p>
                    </TooltipContent>
                  </Tooltip>
                </>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsRenaming(true);
                    }}
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                  >
                    <LucidePencil size={12} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Rename</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
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
                onToggleExpanded={() => toggleFolder(child.path)}
                isCreating={isCreating?.parentPath === child.path ? isCreating : null}
                onCreateConfirm={onCreateConfirm}
                onCreateCancel={onCreateCancel}
                onCreateNew={onCreateNew}
                expandedFolders={expandedFolders}
                selectedFiles={selectedFiles}
                getChildren={getChildren}
                toggleFolder={toggleFolder}
              />
            ))}

            {/* Create New Item Input - render after children */}
            {isCreating && isCreating.parentPath === file.path && (
              <div className="ml-4 mt-1">
                <CreateNewItem
                  type={isCreating.type}
                  onConfirm={onCreateConfirm}
                  onCancel={onCreateCancel}
                />
              </div>
            )}
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
      <span className="text-sm">
        <FileTypeIcon
          fileName={type === 'folder' ? 'folder' : 'file.txt'}
          fileType={type}
          size={16}
          className="text-gray-600 dark:text-gray-400"
        />
      </span>
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
