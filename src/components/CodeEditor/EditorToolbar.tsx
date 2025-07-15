import React from 'react';
import { useHistoryStore } from '@/stores/historyStore';

interface EditorToolbarProps {
  filePath: string;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({ filePath }) => {
  const { canUndo, canRedo, undo, redo, getUndoDescription, getRedoDescription } = useHistoryStore();

  return (
    <div className="flex items-center space-x-2 p-1 bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
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
    </div>
  );
};

export default EditorToolbar;
