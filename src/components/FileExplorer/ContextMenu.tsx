import React, { useEffect, useRef } from 'react';
import type { FileNode } from '@/types';
import {
  LucideFilePlus,
  LucideFolderPlus,
  LucidePencil,
  LucideTrash2,
  LucideCopy,
  LucideScissors,
  LucideClipboard,
  LucideFiles,
  LucideRefreshCw,
} from 'lucide-react';

export interface ClipboardItem {
  file: FileNode;
  operation: 'copy' | 'cut';
}

interface ContextMenuProps {
  x: number;
  y: number;
  file: FileNode | null;
  onClose: () => void;
  onCreateFile: (parentPath: string) => void;
  onCreateFolder: (parentPath: string) => void;
  onDelete: (filePath: string) => void;
  onRename?: (filePath: string) => void;
  onCopy?: (file: FileNode) => void;
  onCut?: (file: FileNode) => void;
  onPaste?: (targetPath: string) => void;
  onDuplicate?: (file: FileNode) => void;
  onRefresh?: () => void;
  clipboardItem?: ClipboardItem | null;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  file,
  onClose,
  onCreateFile,
  onCreateFolder,
  onDelete,
  onRename,
  onCopy,
  onCut,
  onPaste,
  onDuplicate,
  onRefresh,
  clipboardItem,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Calculate menu position to prevent overflow
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let adjustedX = x;
      let adjustedY = y;

      if (x + rect.width > viewportWidth) {
        adjustedX = viewportWidth - rect.width - 10;
      }

      if (y + rect.height > viewportHeight) {
        adjustedY = viewportHeight - rect.height - 10;
      }

      menuRef.current.style.left = `${adjustedX}px`;
      menuRef.current.style.top = `${adjustedY}px`;
    }
  }, [x, y]);

  const menuItems = [
    // File-specific actions
    ...(file
      ? [
          {
            label: 'Copy',
            icon: LucideCopy,
            action: () => {
              onCopy?.(file);
              onClose();
            },
            shortcut: 'Ctrl+C',
          },
          {
            label: 'Cut',
            icon: LucideScissors,
            action: () => {
              onCut?.(file);
              onClose();
            },
            shortcut: 'Ctrl+X',
          },
          {
            label: 'Duplicate',
            icon: LucideFiles,
            action: () => {
              onDuplicate?.(file);
              onClose();
            },
          },
          { separator: true },
          {
            label: 'Rename',
            icon: LucidePencil,
            action: () => {
              onRename?.(file.path);
              onClose();
            },
            shortcut: 'F2',
          },
          {
            label: 'Delete',
            icon: LucideTrash2,
            action: () => onDelete(file.path),
            dangerous: true,
            shortcut: 'Del',
          },
          { separator: true },
        ]
      : []),

    // Paste action (available when clipboard has content)
    ...(clipboardItem && onPaste
      ? [
          {
            label: `Paste ${clipboardItem.file.name}`,
            icon: LucideClipboard,
            action: () => {
              onPaste(file?.path || '/');
              onClose();
            },
            shortcut: 'Ctrl+V',
            disabled: false,
          },
          { separator: true },
        ]
      : []),

    // Creation actions
    {
      label: 'New File',
      icon: LucideFilePlus,
      action: () => onCreateFile(file?.path || '/'),
    },
    {
      label: 'New Folder',
      icon: LucideFolderPlus,
      action: () => onCreateFolder(file?.path || '/'),
    },

    // Refresh action
    ...(onRefresh
      ? [
          { separator: true },
          {
            label: 'Refresh',
            icon: LucideRefreshCw,
            action: () => {
              onRefresh();
              onClose();
            },
            shortcut: 'F5',
          },
        ]
      : []),
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg py-1 min-w-[200px]"
      style={{ left: x, top: y }}
    >
      {menuItems.map((item, index) => {
        if ('separator' in item) {
          return (
            <div
              key={index}
              className="h-px bg-gray-200 dark:bg-gray-600 mx-1 my-1"
            />
          );
        }

        const IconComponent = item.icon;
        const isDisabled = 'disabled' in item && item.disabled;

        return (
          <button
            key={index}
            onClick={item.action}
            disabled={isDisabled}
            className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed ${
              item.dangerous
                ? 'text-red-600 dark:text-red-400'
                : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              {typeof IconComponent === 'function' ? (
                <IconComponent size={16} />
              ) : (
                <span><IconComponent size={16} /></span>
              )}
              <span>{item.label}</span>
            </div>
            {'shortcut' in item && item.shortcut && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {item.shortcut}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default ContextMenu;
