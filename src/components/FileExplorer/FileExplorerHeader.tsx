import React from 'react';
import { LucideFilePlus, LucideFolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';

interface FileExplorerHeaderProps {
  onCreateFile: () => void;
  onCreateFolder: () => void;
}

const FileExplorerHeader: React.FC<FileExplorerHeaderProps> = ({
  onCreateFile,
  onCreateFolder,
}) => {
  return (
    <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
        File Explorer
      </h2>

      <div className="flex items-center space-x-1">
        <Button
          onClick={onCreateFile}
          // className="p-1.5 rounded-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
          size={'icon'}
          title="New File"
          variant={'ghost'}
        >
          <LucideFilePlus size={16} />
          {/* File icon */}
          {/*<svg
            className="w-4 h-4 text-gray-600 dark:text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>*/}
        </Button>

        <Button
          onClick={onCreateFolder}
          // className="p-1.5 rounded-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
          size={'icon'}
          title="New Folder"
          variant={'ghost'}
        >
          <LucideFolderPlus size={16} />
          {/* Plus icon */}
          {/*<svg
            className="w-4 h-4 text-gray-600 dark:text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>*/}
        </Button>

        <button
          className="p-1.5 rounded-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
          title="Refresh"
        >
          <svg
            className="w-4 h-4 text-gray-600 dark:text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>

        <button
          className="p-1.5 rounded-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
          title="Collapse All"
        >
          <svg
            className="w-4 h-4 text-gray-600 dark:text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default FileExplorerHeader;
