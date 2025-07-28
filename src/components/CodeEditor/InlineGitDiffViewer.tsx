import React, { useEffect, useState } from 'react';
import { useGitStore } from '@/stores/gitStore';
import { useEditorStore } from '@/stores/editorStore';
import { useFileStore } from '@/stores/fileStore';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Check, ChevronDown, ChevronUp, GitMerge, X, Edit, ArrowDown, ArrowUp } from 'lucide-react';
import type { monaco } from '@/lib/monaco-editor';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface InlineGitDiffViewerProps {
  filePath: string;
  visible: boolean;
}

interface DiffLine {
  type:
    | 'added'
    | 'removed'
    | 'unchanged'
    | 'conflict-start'
    | 'conflict-ours'
    | 'conflict-theirs'
    | 'conflict-end';
  content: string;
  lineNumber: {
    old: number | null;
    new: number | null;
  };
}

interface DiffHunk {
  startLine: number;
  endLine: number;
  lines: DiffLine[];
  isCollapsed?: boolean;
}

const InlineGitDiffViewer: React.FC<InlineGitDiffViewerProps> = ({ filePath, visible }) => {
  const { fileDiff, selectedCommit, toggleDiff } = useGitStore();
  const { getEditor } = useEditorStore();
  const { updateFileContent } = useFileStore();
  const [diffHunks, setDiffHunks] = useState<DiffHunk[]>([]);
  const [decorations, setDecorations] = useState<string[]>([]);
  const [hasConflicts, setHasConflicts] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [currentConflict, setCurrentConflict] = useState<DiffHunk | null>(null);
  const [resolvedContent, setResolvedContent] = useState<string>('');
  const [currentHunkIndex, setCurrentHunkIndex] = useState<number>(-1);

  // Process diff to create hunks of changes
  useEffect(() => {
    if (!visible || !fileDiff[filePath]) return;

    const diff = fileDiff[filePath].diff;
    const hunks: DiffHunk[] = [];
    let currentHunk: DiffHunk | null = null;
    let inConflict = false;
    let hasConflictMarkers = false;

    // Process diff lines to create hunks
    for (let i = 0; i < diff.length; i++) {
      const line = diff[i];

      // Detect conflict markers
      if (line.content.startsWith('<<<<<<<')) {
        hasConflictMarkers = true;
        inConflict = true;
      } else if (line.content.startsWith('>>>>>>>')) {
        inConflict = false;
      }

      // Skip unchanged lines that are not part of a hunk
      if (line.type === 'unchanged' && !currentHunk && !inConflict) {
        continue;
      }

      // Start a new hunk if needed
      if (!currentHunk) {
        currentHunk = {
          startLine: line.lineNumber.new || 0,
          endLine: line.lineNumber.new || 0,
          lines: [],
          isCollapsed: false,
        };
      }

      // Add line to current hunk
      currentHunk.lines.push(line);

      // Update hunk end line
      if (line.lineNumber.new) {
        currentHunk.endLine = line.lineNumber.new;
      }

      // Check if we should end the current hunk
      const nextLine = i < diff.length - 1 ? diff[i + 1] : null;
      const isEndOfHunk =
        !nextLine ||
        (nextLine.type === 'unchanged' &&
          !inConflict &&
          currentHunk.lines.length > 0 &&
          currentHunk.lines.some((l) => l.type !== 'unchanged'));

      if (isEndOfHunk && currentHunk) {
        // Add some context lines before and after the hunk
        const contextLinesBefore = diff
          .slice(Math.max(0, i - 3), i)
          .filter((l) => l.type === 'unchanged');

        const contextLinesAfter = nextLine
          ? diff.slice(i + 1, Math.min(diff.length, i + 4)).filter((l) => l.type === 'unchanged')
          : [];

        // Add context lines to the hunk
        if (contextLinesBefore.length > 0 && !currentHunk.lines.includes(contextLinesBefore[0])) {
          currentHunk.lines.unshift(...contextLinesBefore);
          if (contextLinesBefore[0].lineNumber.new) {
            currentHunk.startLine = contextLinesBefore[0].lineNumber.new;
          }
        }

        if (contextLinesAfter.length > 0) {
          currentHunk.lines.push(...contextLinesAfter);
          if (contextLinesAfter[contextLinesAfter.length - 1].lineNumber.new) {
            currentHunk.endLine = contextLinesAfter[contextLinesAfter.length - 1].lineNumber.new;
          }
        }

        hunks.push(currentHunk);
        currentHunk = null;
      }
    }

    // Add the last hunk if it exists
    if (currentHunk && currentHunk.lines.length > 0) {
      hunks.push(currentHunk);
    }

    setDiffHunks(hunks);
    setHasConflicts(hasConflictMarkers);

    // Apply decorations when hunks change
    applyDecorations(hunks);
  }, [fileDiff, filePath, visible]);

  // Clean up decorations when component unmounts or visibility changes
  useEffect(() => {
    return () => {
      clearDecorations();
    };
  }, [visible]);

  // Apply decorations to the editor
  const applyDecorations = (hunks: DiffHunk[]) => {
    const editor = getEditor(filePath);
    if (!editor || !visible) return;

    clearDecorations();

    const monacoInstance = (window as any).monaco;
    if (!monacoInstance) return;

    const newDecorations: monaco.editor.IModelDeltaDecoration[] = [];
    const lineDecorations: monaco.editor.IModelDeltaDecoration[] = [];
    const widgetDecorations: monaco.editor.IModelDeltaDecoration[] = [];

    // Create decorations for each hunk
    hunks.forEach((hunk, hunkIndex) => {
      if (hunk.isCollapsed) {
        // Add collapsed hunk widget
        widgetDecorations.push({
          range: new monacoInstance.Range(hunk.startLine, 1, hunk.startLine, 1),
          options: {
            isWholeLine: true,
            className: 'git-diff-collapsed-hunk',
            glyphMarginClassName: 'git-diff-glyph-collapsed',
            glyphMarginHoverMessage: { value: 'Expand diff hunk' },
            afterContentClassName: 'git-diff-after-collapsed',
            after: {
              content: `[Collapsed diff: ${hunk.lines.filter((l) => l.type === 'added' || l.type === 'removed').length} changes]`,
            },
          },
        });
      } else {
        // Add decorations for each line in the hunk
        hunk.lines.forEach((line) => {
          if (line.lineNumber.new === null) return;

          let className = '';
          let glyphClassName = '';
          let contentClassName = '';
          let beforeContentClassName = '';
          let beforeContent = '';

          switch (line.type) {
            case 'added':
              className = 'git-diff-added-line';
              glyphClassName = 'git-diff-glyph-added';
              beforeContentClassName = 'git-diff-before-added';
              beforeContent = '+';
              break;
            case 'removed':
              className = 'git-diff-removed-line';
              glyphClassName = 'git-diff-glyph-removed';
              beforeContentClassName = 'git-diff-before-removed';
              beforeContent = '-';
              break;
            case 'conflict-start':
              className = 'git-diff-conflict-start';
              glyphClassName = 'git-diff-glyph-conflict';
              break;
            case 'conflict-ours':
              className = 'git-diff-conflict-ours';
              glyphClassName = 'git-diff-glyph-conflict-ours';
              break;
            case 'conflict-theirs':
              className = 'git-diff-conflict-theirs';
              glyphClassName = 'git-diff-glyph-conflict-theirs';
              break;
            case 'conflict-end':
              className = 'git-diff-conflict-end';
              glyphClassName = 'git-diff-glyph-conflict';
              break;
          }

          if (className) {
            lineDecorations.push({
              range: new monacoInstance.Range(line.lineNumber.new, 1, line.lineNumber.new, 1),
              options: {
                isWholeLine: true,
                className,
                glyphMarginClassName: glyphClassName,
                beforeContentClassName,
                before: beforeContent ? { content: beforeContent } : undefined,
              },
            });
          }
        });

        // Add hunk header widget
        widgetDecorations.push({
          range: new monacoInstance.Range(hunk.startLine, 1, hunk.startLine, 1),
          options: {
            isWholeLine: false,
            stickiness: monacoInstance.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
            zIndex: 10,
            showIfCollapsed: true,
            marginClassName: 'git-diff-hunk-header-margin',
            className: 'git-diff-hunk-header',
            glyphMarginClassName: 'git-diff-glyph-hunk',
            glyphMarginHoverMessage: { value: 'Diff hunk' },
          },
        });
      }
    });

    // Apply all decorations
    const decorationIds = editor.deltaDecorations([], [...lineDecorations, ...widgetDecorations]);
    setDecorations(decorationIds);

    // Add CSS for decorations if not already added
    addDecorationStyles();
  };

  // Clear all decorations
  const clearDecorations = () => {
    const editor = getEditor(filePath);
    if (!editor) return;

    if (decorations.length > 0) {
      editor.deltaDecorations(decorations, []);
      setDecorations([]);
    }
  };

  // Add CSS styles for decorations
  const addDecorationStyles = () => {
    if (document.getElementById('git-diff-styles')) return;

    const style = document.createElement('style');
    style.id = 'git-diff-styles';
    style.innerHTML = `
      .git-diff-added-line {
        background-color: rgba(0, 255, 0, 0.1);
      }
      .git-diff-removed-line {
        background-color: rgba(255, 0, 0, 0.1);
      }
      .git-diff-conflict-start, .git-diff-conflict-end {
        background-color: rgba(255, 165, 0, 0.2);
      }
      .git-diff-conflict-ours {
        background-color: rgba(0, 0, 255, 0.1);
      }
      .git-diff-conflict-theirs {
        background-color: rgba(128, 0, 128, 0.1);
      }
      .git-diff-glyph-added {
        background-color: rgba(0, 255, 0, 0.3);
        border-left: 2px solid green;
      }
      .git-diff-glyph-removed {
        background-color: rgba(255, 0, 0, 0.3);
        border-left: 2px solid red;
      }
      .git-diff-glyph-conflict {
        background-color: rgba(255, 165, 0, 0.3);
        border-left: 2px solid orange;
      }
      .git-diff-glyph-conflict-ours {
        background-color: rgba(0, 0, 255, 0.2);
        border-left: 2px solid blue;
      }
      .git-diff-glyph-conflict-theirs {
        background-color: rgba(128, 0, 128, 0.2);
        border-left: 2px solid purple;
      }
      .git-diff-glyph-hunk {
        background-color: rgba(128, 128, 128, 0.2);
        border-left: 2px solid gray;
      }
      .git-diff-before-added {
        color: green;
        font-weight: bold;
        margin-right: 4px;
      }
      .git-diff-before-removed {
        color: red;
        font-weight: bold;
        margin-right: 4px;
      }
      .git-diff-hunk-header {
        background-color: rgba(128, 128, 128, 0.1);
        border-top: 1px solid rgba(128, 128, 128, 0.3);
        border-bottom: 1px solid rgba(128, 128, 128, 0.3);
        font-size: 0.85em;
        color: rgba(128, 128, 128, 0.8);
      }
      .git-diff-collapsed-hunk {
        background-color: rgba(128, 128, 128, 0.1);
        border-top: 1px dashed rgba(128, 128, 128, 0.3);
        border-bottom: 1px dashed rgba(128, 128, 128, 0.3);
      }
      .git-diff-after-collapsed {
        font-style: italic;
        color: rgba(128, 128, 128, 0.8);
      }
      .git-diff-glyph-collapsed {
        background-color: rgba(128, 128, 128, 0.2);
        border-left: 2px dashed gray;
      }
    `;
    document.head.appendChild(style);
  };

  // Toggle the collapsed state of a hunk
  const toggleHunkCollapse = (hunkIndex: number) => {
    setDiffHunks((prevHunks) => {
      const newHunks = [...prevHunks];
      newHunks[hunkIndex] = {
        ...newHunks[hunkIndex],
        isCollapsed: !newHunks[hunkIndex].isCollapsed,
      };
      return newHunks;
    });
  };

  // Open conflict resolution dialog
  const openConflictDialog = (hunkIndex: number) => {
    const hunk = diffHunks[hunkIndex];
    if (!hunk) return;

    setCurrentConflict(hunk);
    setCurrentHunkIndex(hunkIndex);

    // Get the current file content
    const editor = getEditor(filePath);
    if (!editor) return;

    const content = editor.getValue();
    setResolvedContent(content);
    setShowConflictDialog(true);
  };

  // Handle accepting "our" changes for a conflict
  const handleAcceptOurs = (hunkIndex: number) => {
    const hunk = diffHunks[hunkIndex];
    if (!hunk) return;

    // Find the conflict markers in the hunk
    let startIndex = -1;
    let separatorIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < hunk.lines.length; i++) {
      const line = hunk.lines[i];
      if (line.type === 'conflict-start') {
        startIndex = i;
      } else if (line.content.startsWith('=======')) {
        separatorIndex = i;
      } else if (line.type === 'conflict-end') {
        endIndex = i;
        break;
      }
    }

    if (startIndex === -1 || separatorIndex === -1 || endIndex === -1) {
      toast.error('Could not find conflict markers');
      return;
    }

    // Get the editor and current content
    const editor = getEditor(filePath);
    if (!editor) return;

    const content = editor.getValue();
    const lines = content.split('\n');

    // Get the line numbers in the file
    const startLine = hunk.lines[startIndex].lineNumber.new || 0;
    const separatorLine = hunk.lines[separatorIndex].lineNumber.new || 0;
    const endLine = hunk.lines[endIndex].lineNumber.new || 0;

    // Extract "our" content (between start and separator)
    const ourContent = lines.slice(startLine, separatorLine - 1).join('\n');

    // Create the new content
    const newContent = [...lines.slice(0, startLine - 1), ourContent, ...lines.slice(endLine)].join(
      '\n',
    );

    // Update the file content
    updateFileContent(filePath, newContent)
      .then(() => {
        toast.success('Conflict resolved with our changes');
      })
      .catch((err) => {
        toast.error('Failed to resolve conflict');
        console.error(err);
      });
  };

  // Handle accepting "their" changes for a conflict
  const handleAcceptTheirs = (hunkIndex: number) => {
    const hunk = diffHunks[hunkIndex];
    if (!hunk) return;

    // Find the conflict markers in the hunk
    let startIndex = -1;
    let separatorIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < hunk.lines.length; i++) {
      const line = hunk.lines[i];
      if (line.type === 'conflict-start') {
        startIndex = i;
      } else if (line.content.startsWith('=======')) {
        separatorIndex = i;
      } else if (line.type === 'conflict-end') {
        endIndex = i;
        break;
      }
    }

    if (startIndex === -1 || separatorIndex === -1 || endIndex === -1) {
      toast.error('Could not find conflict markers');
      return;
    }

    // Get the editor and current content
    const editor = getEditor(filePath);
    if (!editor) return;

    const content = editor.getValue();
    const lines = content.split('\n');

    // Get the line numbers in the file
    const startLine = hunk.lines[startIndex].lineNumber.new || 0;
    const separatorLine = hunk.lines[separatorIndex].lineNumber.new || 0;
    const endLine = hunk.lines[endIndex].lineNumber.new || 0;

    // Extract "their" content (between separator and end)
    const theirContent = lines.slice(separatorLine, endLine - 1).join('\n');

    // Create the new content
    const newContent = [
      ...lines.slice(0, startLine - 1),
      theirContent,
      ...lines.slice(endLine),
    ].join('\n');

    // Update the file content
    updateFileContent(filePath, newContent)
      .then(() => {
        toast.success('Conflict resolved with their changes');
      })
      .catch((err) => {
        toast.error('Failed to resolve conflict');
        console.error(err);
      });
  };

  // Handle saving custom resolved content
  const handleSaveResolution = async () => {
    try {
      await updateFileContent(filePath, resolvedContent);
      setShowConflictDialog(false);
      toast.success('Conflict resolution saved');
    } catch (err) {
      toast.error('Failed to save conflict resolution');
      console.error(err);
    }
  };

  // Navigate to the next hunk
  const goToNextHunk = () => {
    if (diffHunks.length === 0) return;

    const nextIndex = currentHunkIndex < diffHunks.length - 1 ? currentHunkIndex + 1 : 0;

    setCurrentHunkIndex(nextIndex);

    // Scroll to the hunk
    const editor = getEditor(filePath);
    if (!editor) return;

    const hunk = diffHunks[nextIndex];
    editor.revealLineInCenter(hunk.startLine);
  };

  // Navigate to the previous hunk
  const goToPrevHunk = () => {
    if (diffHunks.length === 0) return;

    const prevIndex = currentHunkIndex > 0 ? currentHunkIndex - 1 : diffHunks.length - 1;

    setCurrentHunkIndex(prevIndex);

    // Scroll to the hunk
    const editor = getEditor(filePath);
    if (!editor) return;

    const hunk = diffHunks[prevIndex];
    editor.revealLineInCenter(hunk.startLine);
  };

  // Add controls overlay for diff navigation and actions
  const renderDiffControls = () => {
    if (!visible) return null;

    return (
      <div className="absolute top-2 right-2 z-50 flex items-center gap-2 bg-white dark:bg-gray-800 shadow-md rounded-md p-2">
        <div className="text-xs text-gray-500 dark:text-gray-400 mr-2">
          {selectedCommit ? `Diff with: ${selectedCommit.substring(0, 7)}` : 'Current changes'}
        </div>

        {hasConflicts && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
            onClick={() => {
              // Find the first conflict hunk
              const conflictIndex = diffHunks.findIndex((hunk) =>
                hunk.lines.some(
                  (line) =>
                    line.type === 'conflict-start' ||
                    line.type === 'conflict-ours' ||
                    line.type === 'conflict-theirs' ||
                    line.type === 'conflict-end',
                ),
              );

              if (conflictIndex >= 0) {
                openConflictDialog(conflictIndex);
              } else {
                toast.error('No conflicts found');
              }
            }}
          >
            <GitMerge className="h-3 w-3 mr-1 text-amber-500 dark:text-amber-400" />
            Resolve Conflicts
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          className="h-7 w-7 p-0"
          title="Previous change"
          onClick={goToPrevHunk}
          disabled={diffHunks.length === 0}
        >
          <ChevronUp className="h-3 w-3" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="h-7 w-7 p-0"
          title="Next change"
          onClick={goToNextHunk}
          disabled={diffHunks.length === 0}
        >
          <ChevronDown className="h-3 w-3" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="h-7 w-7 p-0"
          title="Close diff view"
          onClick={() => toggleDiff(false)}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  };

  // Render conflict resolution dialog
  const renderConflictDialog = () => {
    if (!currentConflict) return null;

    return (
      <Dialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Resolve Merge Conflict</DialogTitle>
            <DialogDescription>
              Edit the content below to resolve the conflict, or choose one of the quick options.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-4">
            <div className="flex justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAcceptOurs(currentHunkIndex)}
              >
                <ArrowUp className="h-3 w-3 mr-1" />
                Accept Our Changes
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAcceptTheirs(currentHunkIndex)}
              >
                <ArrowDown className="h-3 w-3 mr-1" />
                Accept Their Changes
              </Button>
            </div>

            <div className="border rounded-md">
              <textarea
                value={resolvedContent}
                onChange={(e) => setResolvedContent(e.target.value)}
                className="w-full h-[400px] p-4 font-mono text-sm resize-none border-0 focus:ring-0 focus:outline-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConflictDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveResolution}>
              <Check className="h-3 w-3 mr-1" />
              Save Resolution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // If not visible, don't render anything
  if (!visible) return null;

  return (
    <>
      <div className="absolute inset-0 pointer-events-none">{renderDiffControls()}</div>
      {renderConflictDialog()}
    </>
  );
};

export default InlineGitDiffViewer;
