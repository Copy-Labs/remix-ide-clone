import React, { useEffect } from 'react';
import { useGitStore } from '@/stores/gitStore';
import { GitBranch, GitCommit, Plus, Minus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface GitStatusBarProps {
  className?: string;
  onOpenCommitDialog?: () => void;
  onOpenBranchDialog?: () => void;
}

const GitStatusBar: React.FC<GitStatusBarProps> = ({
  className,
  onOpenCommitDialog,
  onOpenBranchDialog,
}) => {
  const { isInitialized, currentBranch, status, getStatus, getBranches, isLoading } = useGitStore();

  // Refresh status periodically
  useEffect(() => {
    if (!isInitialized) return;

    // Initial fetch
    getStatus();
    getBranches();

    // Set up interval for periodic refresh
    const interval = setInterval(() => {
      getStatus();
    }, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, [isInitialized, getStatus, getBranches]);

  // If Git is not initialized, don't show the status bar
  if (!isInitialized) {
    return null;
  }

  // Count staged and unstaged files
  const stagedCount = status.files.filter((file) => file.stage === 2).length;
  const unstagedCount = status.files.filter((file) => file.stage === 1 || file.stage === 0).length;

  return (
    <div
      className={cn(
        'flex items-center justify-between px-3 py-1 text-xs border-t bg-muted/40',
        className,
      )}
    >
      {/* Left side: Branch info */}
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={onOpenBranchDialog}
              >
                <GitBranch className="h-3.5 w-3.5 mr-1" />
                {currentBranch || 'No Branch'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Current branch. Click to switch branches.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Right side: File counts and actions */}
      <div className="flex items-center gap-2">
        {/* Staged files count */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center">
                <Plus className="h-3.5 w-3.5 mr-1 text-green-500" />
                <span>{stagedCount}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{stagedCount} staged files</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Unstaged files count */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center">
                <Minus className="h-3.5 w-3.5 mr-1 text-red-500" />
                <span>{unstagedCount}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{unstagedCount} unstaged files</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Commit button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={onOpenCommitDialog}
                disabled={stagedCount === 0}
              >
                <GitCommit className="h-3.5 w-3.5 mr-1" />
                Commit
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Commit staged changes</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Refresh button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => {
                  getStatus();
                  getBranches();
                }}
                disabled={isLoading}
              >
                <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Refresh Git status</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

export default GitStatusBar;
