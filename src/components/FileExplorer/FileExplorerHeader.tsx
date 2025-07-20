import React, { useState } from 'react';
import {
  LucideFilePlus,
  LucideFolderPlus,
  LucideRefreshCw,
  LucideChevronDown,
  LucideSearch,
  LucideX
} from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip.tsx';

interface FileExplorerHeaderProps {
  onCreateFile: () => void;
  onCreateFolder: () => void;
  onRefresh?: () => void;
  onCollapseAll?: () => void;
  onSearch?: (query: string) => void;
  searchQuery?: string;
}

const FileExplorerHeader: React.FC<FileExplorerHeaderProps> = ({
  onCreateFile,
  onCreateFolder,
  onRefresh,
  onCollapseAll,
  onSearch,
  searchQuery = '',
}) => {
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  const handleSearchToggle = () => {
    setIsSearchVisible(!isSearchVisible);
    if (isSearchVisible && onSearch) {
      onSearch('');
      setLocalSearchQuery('');
    }
  };

  const handleSearchChange = (value: string) => {
    setLocalSearchQuery(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  const handleSearchClear = () => {
    setLocalSearchQuery('');
    if (onSearch) {
      onSearch('');
    }
  };

  return (
    <div className="flex flex-col border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between p-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
          File Explorer
        </h2>

        <TooltipProvider>
          <div className="flex items-center space-x-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onCreateFile}
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                >
                  <LucideFilePlus size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>New File</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onCreateFolder}
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                >
                  <LucideFolderPlus size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>New Folder</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleSearchToggle}
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                >
                  <LucideSearch size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Search Files</p>
              </TooltipContent>
            </Tooltip>

            {onRefresh && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={onRefresh}
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                  >
                    <LucideRefreshCw size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Refresh</p>
                </TooltipContent>
              </Tooltip>
            )}

            {onCollapseAll && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={onCollapseAll}
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                  >
                    <LucideChevronDown size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Collapse All</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </TooltipProvider>
      </div>

      {/* Search Bar */}
      {isSearchVisible && (
        <div className="px-3 pb-3">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search files and folders..."
              value={localSearchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pr-8"
              autoFocus
            />
            {localSearchQuery && (
              <Button
                onClick={handleSearchClear}
                size="icon"
                variant="ghost"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
              >
                <LucideX size={14} />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileExplorerHeader;
