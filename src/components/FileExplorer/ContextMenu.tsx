import React, { useEffect, useRef } from 'react';
import type { FileNode } from '@/types';

interface ContextMenuProps {
  x: number;
  y: number;
  file: FileNode | null;
  onClose: () => void;
  onCreateFile: (parentPath: string) => void;
  onCreateFolder: (parentPath: string) => void;
  onDelete: (filePath: string) => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  file,
  onClose,
  onCreateFile,
  onCreateFolder,
  onDelete,
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
    ...(file
      ? [
          {
            label: 'Rename',
            icon: '✏️',
            action: () => {
              // Rename action is handled by FileTreeItem
              onClose();
            },
          },
          {
            label: 'Delete',
            icon: '🗑️',
            action: () => onDelete(file.path),
            dangerous: true,
          },
          { separator: true },
        ]
      : []),
    {
      label: 'New File',
      icon: '📄',
      action: () => onCreateFile(file?.path || '/'),
    },
    {
      label: 'New Folder',
      icon: '📁',
      action: () => onCreateFolder(file?.path || '/'),
    },
    { separator: true },
    {
      label: 'Refresh',
      icon: '🔄',
      action: () => {
        // TODO: Implement refresh functionality
        onClose();
      },
    },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg py-1 min-w-[160px]"
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

        return (
          <button
            key={index}
            onClick={item.action}
            className={`w-full text-left px-3 py-2 text-sm flex items-center space-x-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
              item.dangerous
                ? 'text-red-600 dark:text-red-400'
                : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ContextMenu;
