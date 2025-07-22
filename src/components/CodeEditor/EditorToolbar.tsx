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
  PackageOpen,
  LucideUndo, LucideRedo,
} from 'lucide-react';
import { cn } from '@/lib/utils.ts';
import { Button } from '@/components/ui/button.tsx';
import { Separator } from '@/components/ui/separator.tsx';

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
    <div className="flex items-center space-x-1 p-2 bg-card">
      {/* Undo/Redo buttons */}
      <Button
        onClick={() => undo()}
        disabled={!canUndo()}
        title={getUndoDescription() || 'Undo'}
        className={cn('rounded-md size-8',
          canUndo()
            ? ''
            : 'text-muted-foreground !cursor-not-allowed',
        )}
        variant={'ghost'}
      >
        {/*<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7v6h6"></path>
          <path d="M21 17a9 9 0 0 0-9-9H3"></path>
        </svg>*/}
        <LucideUndo size={16} />
      </Button>

      <Button
        onClick={() => redo()}
        disabled={!canRedo()}
        size={'icon'}
        title={getRedoDescription() || 'Redo'}
        className={cn('rounded-md size-8',
          canRedo()
            ? ''
            : 'text-muted-foreground !cursor-not-allowed',
        )}
        variant={'ghost'}
      >
        {/*<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 7v6h-6"></path>
          <path d="M3 17a9 9 0 0 1 9-9h9"></path>
        </svg>*/}
        <LucideRedo size={16} />
      </Button>

      <div className="text-xs text-gray-500 dark:text-gray-400 ml-2">
        {canUndo() && <span className="mr-2">{getUndoDescription()}</span>}
        {canRedo() && <span>{getRedoDescription()}</span>}
      </div>

      {/* Separator */}
      {/*<div className="h-4 border-l border-gray-300 dark:border-gray-600 mx-2"></div>*/}
      <Separator orientation={'vertical'} className={'h-4'} />

      {/* Git buttons - only show if Git is initialized */}
      {isInitialized && (
        <>
          <Button
            onClick={handleToggleBlame}
            size={'icon'}
            title="Toggle Git Blame"
            className={cn('size-8',
              // showBlame
              //   ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
              //   : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600',
            )}
            variant={showBlame ? 'default' : 'ghost'}
          >
            <GitCommit size={16} />
          </Button>

          <Button
            onClick={handleToggleDiff}
            size={'icon'}
            title="Toggle Git Diff"
            className={cn('size-8',
              // showDiff
              //   ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
              //   : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600',
            )}
            variant={showDiff ? 'default' : 'ghost'}
          >
            <DiffIcon size={16} />
          </Button>

          <Button
            onClick={handleShowHistory}
            size={'icon'}
            title="Show File History"
            className="size-8"
            variant={'ghost'}
          >
            <History size={16} />
          </Button>

          <Button
            onClick={() => {
              listStashes();
              setShowStashDialog(true);
            }}
            title="Stash Changes"
            className="size-8"
            variant={'ghost'}
          >
            <Package size={16} />
          </Button>
        </>
      )}
    </div>
  );
};

export default EditorToolbar;
