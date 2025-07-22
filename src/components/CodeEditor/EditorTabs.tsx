import React, { useCallback } from 'react';
import { useFileStore } from '@/stores/fileStore.ts';
import { cn } from '@/lib/utils.ts';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LucideEllipsisVertical } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';

interface EditorTabsProps {
  className?: string;
}

const EditorTabs: React.FC<EditorTabsProps> = ({ className = '' }) => {
  const { files, openTabs, activeFile, setActiveFile, closeFile, closeAllTabs, closeOtherTabs } =
    useFileStore();

  const handleTabClick = useCallback(
    (filePath: string) => {
      setActiveFile(filePath);
    },
    [setActiveFile],
  );

  const handleTabClose = useCallback(
    (filePath: string, event: React.MouseEvent) => {
      event.stopPropagation();
      closeFile(filePath);
    },
    [closeFile],
  );

  const handleTabMiddleClick = useCallback(
    (filePath: string, event: React.MouseEvent) => {
      if (event.button === 1) {
        // Middle mouse button
        event.preventDefault();
        closeFile(filePath);
      }
    },
    [closeFile],
  );

  const handleTabContextMenu = useCallback((filePath: string, event: React.MouseEvent) => {
    event.preventDefault();
    // TODO: Show context menu with options like "Close", "Close Others", "Close All"
  }, []);

  const getFileIcon = useCallback((fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();

    // Return SVG icons for different file types
    switch (extension) {
      case 'sol':
        return (
          <svg className="w-4 h-4 text-yellow-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z" />
          </svg>
        );
      case 'js':
      case 'jsx':
        return (
          <svg className="w-4 h-4 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M0 0h24v24H0V0zm22.034 18.276c-.175-1.095-.888-2.015-3.003-2.873-.736-.345-1.554-.585-1.797-1.14-.091-.33-.105-.51-.046-.705.15-.646.915-.84 1.515-.66.39.12.75.42.976.9 1.034-.676 1.034-.676 1.755-1.125-.27-.42-.404-.601-.586-.78-.63-.705-1.469-1.065-2.834-1.034l-.705.089c-.676.165-1.32.525-1.71 1.005-1.14 1.291-.811 3.541.569 4.471 1.365 1.02 3.361 1.244 3.616 2.205.24 1.17-.87 1.545-1.966 1.41-.811-.18-1.26-.586-1.755-1.336l-1.83 1.051c.21.48.45.689.81 1.109 1.74 1.756 6.09 1.666 6.871-1.004.029-.09.24-.705.074-1.65l.046.067zm-8.983-7.245h-2.248c0 1.938-.009 3.864-.009 5.805 0 1.232.063 2.363-.138 2.711-.33.689-1.18.601-1.566.48-.396-.196-.597-.466-.83-.855-.063-.105-.11-.196-.127-.196l-1.825 1.125c.305.63.75 1.172 1.324 1.517.855.51 2.004.675 3.207.405.783-.226 1.458-.691 1.811-1.411.51-.93.402-2.07.397-3.346.012-2.054 0-4.109 0-6.179l.004-.056z" />
          </svg>
        );
      case 'ts':
      case 'tsx':
        return (
          <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 3h18v18H3V3zm10.71 12.71c.39-.39.39-1.02 0-1.41-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0zM16 8v2h-4V8h4zm-2-4l-2 2H9v2h2.67L9 10.67V12h2l2-2h1v2h-2.67L14 14.67V16h-2l-2-2H9v-2h2.67L9 9.33V8h2l2 2h1V8h-2.67L14 5.33V4h2z" />
          </svg>
        );
      case 'json':
        return (
          <svg className="w-4 h-4 text-yellow-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm3.5 14a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm7-3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" />
          </svg>
        );
      case 'md':
        return (
          <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.56 18H3.44C2.65 18 2 17.37 2 16.59V7.41C2 6.63 2.65 6 3.44 6h17.12c.79 0 1.44.63 1.44 1.41v9.18c0 .78-.65 1.41-1.44 1.41M6.81 15.19v-3.66l1.92 2.35 1.92-2.35v3.66h1.93V8.81h-1.93l-1.92 2.35-1.92-2.35H4.89v6.38h1.92M19.69 12h-1.92V8.81h-1.92V12h-1.93l2.89 3.28L19.69 12z" />
          </svg>
        );
      case 'css':
        return (
          <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5 3l-.65 3.34h13.59L17.5 8.5H3.92l-.66 3.33h13.59l-.76 3.81-5.48 1.81-4.75-1.81.33-1.64H2.85l-.79 4 7.85 3 9.05-3 1.2-6.03.24-1.21L21.94 3H5z" />
          </svg>
        );
      case 'html':
        return (
          <svg className="w-4 h-4 text-orange-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 17.56l4.07-1.13.55-6.1H9.38L9.2 8.3h7.6l.2-1.99H7l.56 6.01h6.89l-.23 2.58-2.22.6-2.22-.6-.14-1.66h-2l.29 3.19L12 17.56M4.07 3h15.86L18.5 19.2 12 21 5.5 19.2 4.07 3z" />
          </svg>
        );
      case 'py':
        return (
          <svg className="w-4 h-4 text-blue-700" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.14 7.5A2.86 2.86 0 0 1 22 10.36v3.78A2.86 2.86 0 0 1 19.14 17H12c0 .39.32.96.71.96H17v1.68a2.86 2.86 0 0 1-2.86 2.86H9.86A2.86 2.86 0 0 1 7 19.64v-3.75a2.85 2.85 0 0 1 2.86-2.85h5.25a2.85 2.85 0 0 0 2.85-2.86V7.5h1.18m-5.25 7.5H9.86a1.48 1.48 0 0 0-1.43 1.5v3.75c0 .83.66 1.5 1.43 1.5h4.28a1.5 1.5 0 0 0 1.43-1.5V18h-3.03c-1.31 0-2.14-1.13-2.14-2.25V15h3.5M4.86 16.5a2.86 2.86 0 0 1-2.86-2.86V9.86A2.86 2.86 0 0 1 4.86 7H12c0-.4-.32-.96-.71-.96H7V4.36A2.86 2.86 0 0 1 9.86 1.5h4.28A2.86 2.86 0 0 1 17 4.36v3.78a2.85 2.85 0 0 1-2.86 2.86H8.89a2.85 2.85 0 0 0-2.85 2.86v2.64H4.86m5.25-7.5h4.03a1.5 1.5 0 0 0 1.43-1.5V4.36a1.5 1.5 0 0 0-1.43-1.5H9.86a1.5 1.5 0 0 0-1.43 1.5V6h3.03c1.31 0 2.14 1.13 2.14 2.25V9h-3.5m-2.89 6.41a.89.89 0 1 0 0-1.77.89.89 0 0 0 0 1.77m10.6-10.66a.88.88 0 1 0 0-1.76.88.88 0 0 0 0 1.76z" />
          </svg>
        );
      case 'svg':
        return (
          <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5.13 10.71h1.97v1.38H5.13v-1.38m2.72 0h1.97v1.38H7.85v-1.38m2.72 0h1.97v1.38h-1.97v-1.38m5.96-7.12H7.47c-1.22 0-2.21.99-2.21 2.21v11.8c0 1.22.99 2.21 2.21 2.21h9.06c1.22 0 2.21-.99 2.21-2.21V5.8c0-1.22-.99-2.21-2.21-2.21M7.5 18.54c-.61 0-1.1-.49-1.1-1.1 0-.61.49-1.1 1.1-1.1.61 0 1.1.49 1.1 1.1 0 .61-.49 1.1-1.1 1.1m9.06 0H9.92v-1.1h6.64v1.1m0-3.31H7.5v-5.53h9.06v5.53m0-6.64H7.5V5.8h9.06v2.79z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6m4 18H6V4h7v5h5v11z" />
          </svg>
        );
    }
  }, []);

  if (openTabs.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex flex-row items-center justify-start', className)}>
      <div className="flex items-center gap-x-1 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 p-1 rounded-lg">
        {openTabs.map((filePath) => {
          const file = files.get(filePath);
          if (!file) return null;

          const isActive = activeFile === filePath;
          const hasUnsavedChanges = false; // TODO: Implement unsaved changes detection

          return (
            <div
              key={filePath}
              className={cn(
                'flex items-center w-full px-3 py-1.5 cursor-pointer group relative',
                'transition-all duration-200 ease-in-out rounded-md',
                isActive ? 'bg-gradient-to-b from-border to-secondary' : '',
                'border-0 hover:bg-secondary',
              )}
              onClick={() => handleTabClick(filePath)}
              onMouseDown={(event) => handleTabMiddleClick(filePath, event)}
              onContextMenu={(event) => handleTabContextMenu(filePath, event)}
            >
              <span className="mr-2 text-sm">{getFileIcon(file.name)}</span>

              <span className="truncat text-xs font-medium ">{file.name}</span>

              {hasUnsavedChanges && (
                <span className="w-2 h-2 bg-orange-400 rounded-full mr-2" title="Unsaved changes" />
              )}

              <button
                onClick={(event) => handleTabClose(filePath, event)}
                className={cn(
                  'ml-2 p-1 rounded-md hover:bg-card dark:hover:bg-card',
                  isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                  'transition-opacity duration-200 ease-in-out flex items-center justify-center',
                )}
                title="Close"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      </div>

      {/* Tab Actions */}
      <div className="flex items-center ml-auto px-2 space-x-1">
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button size={'icon'} variant={'outline'}>
              <LucideEllipsisVertical size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>File Options</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              title="Close Other Tabs"
              disabled={!activeFile || openTabs.length <= 1}
              onClick={() => activeFile && closeOtherTabs(activeFile)}
            >
              Close Other Tabs
            </DropdownMenuItem>
            <DropdownMenuItem
              title="Close All Tabs"
              onClick={() => closeAllTabs()}
            >
              Close All Tabs
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {/*<button
          onClick={() => activeFile && closeOtherTabs(activeFile)}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400"
          title="Close Other Tabs"
          disabled={!activeFile || openTabs.length <= 1}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </button>*/}
        {/*<Button
          onClick={() => closeAllTabs()}
          // className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400"
          size={'icon'}
          title="Close All Tabs"
          variant={'secondary'}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </Button>*/}
      </div>
    </div>
  );
};

export default EditorTabs;
