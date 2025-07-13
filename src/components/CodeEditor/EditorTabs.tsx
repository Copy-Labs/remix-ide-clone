import React, { useCallback } from 'react';
import { useFileStore } from '../../stores/fileStore';

interface EditorTabsProps {
  className?: string;
}

const EditorTabs: React.FC<EditorTabsProps> = ({ className = '' }) => {
  const { 
    files, 
    openTabs, 
    activeFile, 
    setActiveFile, 
    closeFile, 
    closeAllTabs, 
    closeOtherTabs 
  } = useFileStore();

  const handleTabClick = useCallback((filePath: string) => {
    setActiveFile(filePath);
  }, [setActiveFile]);

  const handleTabClose = useCallback((filePath: string, event: React.MouseEvent) => {
    event.stopPropagation();
    closeFile(filePath);
  }, [closeFile]);

  const handleTabMiddleClick = useCallback((filePath: string, event: React.MouseEvent) => {
    if (event.button === 1) { // Middle mouse button
      event.preventDefault();
      closeFile(filePath);
    }
  }, [closeFile]);

  const handleTabContextMenu = useCallback((filePath: string, event: React.MouseEvent) => {
    event.preventDefault();
    // TODO: Show context menu with options like "Close", "Close Others", "Close All"
  }, []);

  const getFileIcon = useCallback((fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'sol':
        return '⚡';
      case 'js':
      case 'jsx':
        return '📜';
      case 'ts':
      case 'tsx':
        return '🔷';
      case 'json':
        return '📋';
      case 'md':
        return '📝';
      case 'css':
        return '🎨';
      case 'html':
        return '🌐';
      default:
        return '📄';
    }
  }, []);

  if (openTabs.length === 0) {
    return null;
  }

  return (
    <div className={`bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="flex items-center overflow-x-auto">
        {openTabs.map(filePath => {
          const file = files.get(filePath);
          if (!file) return null;

          const isActive = activeFile === filePath;
          const hasUnsavedChanges = false; // TODO: Implement unsaved changes detection

          return (
            <div
              key={filePath}
              className={`flex items-center min-w-0 px-3 py-2 border-r border-gray-200 dark:border-gray-700 cursor-pointer group ${
                isActive
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              onClick={() => handleTabClick(filePath)}
              onMouseDown={(event) => handleTabMiddleClick(filePath, event)}
              onContextMenu={(event) => handleTabContextMenu(filePath, event)}
            >
              <span className="mr-2 text-sm">
                {getFileIcon(file.name)}
              </span>
              
              <span className="truncate text-sm font-medium mr-2">
                {file.name}
              </span>
              
              {hasUnsavedChanges && (
                <span className="w-2 h-2 bg-orange-400 rounded-full mr-2" />
              )}
              
              <button
                onClick={(event) => handleTabClose(filePath, event)}
                className={`p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 ${
                  isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                } transition-opacity`}
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          );
        })}
        
        {/* Tab Actions */}
        <div className="flex items-center ml-auto px-2">
          <button
            onClick={() => closeAllTabs()}
            className="p-1 rounded-sm hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400"
            title="Close All Tabs"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditorTabs;
