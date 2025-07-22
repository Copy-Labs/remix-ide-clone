import React, { useState } from 'react';
import { useHistoryStore } from '@/stores/historyStore';
import { useGitStore } from '@/stores/gitStore';
import {
  GitBranch,
  GitCommit,
  History,
  DiffIcon,
  Save,
  Package,
  PackageOpen
} from 'lucide-react';

interface EditorToolbarProps {
  filePath: string;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({ filePath }) => {
  const { canUndo, canRedo, undo, redo, getUndoDescription, getRedoDescription } = useHistoryStore();
  const {
    isInitialized,
    showBlame,
    showDiff,
    toggleBlame,
    toggleDiff,
    getFileBlame,
    getFileHistory,
    getFileDiff,
    createStash,
    listStashes,
    stashes
  } = useGitStore();

  const [showStashDialog, setShowStashDialog] = useState(false);
  const [stashMessage, setStashMessage] = useState('');

  // Handle Git operations
  const handleToggleBlame = () => {
    if (!showBlame) {
      getFileBlame(filePath);
    }
    toggleBlame();
  };

  const handleToggleDiff = () => {
    if (!showDiff) {
      getFileDiff(filePath);
    }
    toggleDiff();
  };

  const handleShowHistory = () => {
    getFileHistory(filePath);
    // In a real implementation, we would show a history dialog
    alert('File history feature would be shown here');
  };

  const handleCreateStash = () => {
    if (stashMessage.trim()) {
      createStash(stashMessage);
      setStashMessage('');
      setShowStashDialog(false);
    }
  };

  return (
    <div className="flex items-center space-x-2 p-1 bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
      {/* Undo/Redo buttons */}
      <button
        onClick={() => undo()}
        disabled={!canUndo()}
        title={getUndoDescription() || 'Undo'}
        className={`p-1 rounded ${
          canUndo()
            ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7v6h6"></path>
          <path d="M21 17a9 9 0 0 0-9-9H3"></path>
        </svg>
      </button>

      <button
        onClick={() => redo()}
        disabled={!canRedo()}
        title={getRedoDescription() || 'Redo'}
        className={`p-1 rounded ${
          canRedo()
            ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 7v6h-6"></path>
          <path d="M3 17a9 9 0 0 1 9-9h9"></path>
        </svg>
      </button>

      <div className="text-xs text-gray-500 dark:text-gray-400 ml-2">
        {canUndo() && <span className="mr-2">{getUndoDescription()}</span>}
        {canRedo() && <span>{getRedoDescription()}</span>}
      </div>

      {/* Separator */}
      <div className="h-4 border-l border-gray-300 dark:border-gray-600 mx-2"></div>

      {/* Git buttons - only show if Git is initialized */}
      {isInitialized && (
        <>
          <button
            onClick={handleToggleBlame}
            title="Toggle Git Blame"
            className={`p-1 rounded ${
              showBlame
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <GitCommit size={16} />
          </button>

          <button
            onClick={handleToggleDiff}
            title="Toggle Git Diff"
            className={`p-1 rounded ${
              showDiff
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <DiffIcon size={16} />
          </button>

          <button
            onClick={handleShowHistory}
            title="Show File History"
            className="p-1 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            <History size={16} />
          </button>

          <button
            onClick={() => {
              listStashes();
              setShowStashDialog(true);
            }}
            title="Stash Changes"
            className="p-1 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            <Package size={16} />
          </button>
        </>
      )}
    </div>
  );
};

export default EditorToolbar;
