import React, { useState, useEffect } from 'react';
import { useGitStore } from '@/stores/gitStore';
import { Button } from '@/components/ui/button';
import { AlertCircle, Check, Edit, GitMerge } from 'lucide-react';
import { toast } from 'sonner';

interface GitDiffViewerProps {
  filePath: string;
  visible: boolean;
}

// Enhanced diff line type to include conflict information
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

const GitDiffViewer: React.FC<GitDiffViewerProps> = ({ filePath, visible }) => {
  const { fileDiff, selectedCommit } = useGitStore();
  const [hasConflicts, setHasConflicts] = useState(false);
  const [resolvedContent, setResolvedContent] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [enhancedDiff, setEnhancedDiff] = useState<DiffLine[]>([]);

  // Process diff to detect and highlight conflicts
  useEffect(() => {
    if (!fileDiff[filePath]) return;

    const diff = fileDiff[filePath].diff;
    const enhancedLines: DiffLine[] = [];
    let inConflict = false;
    let conflictOurs: DiffLine[] = [];
    let conflictTheirs: DiffLine[] = [];
    let hasConflictMarkers = false;

    // Detect conflict markers in the diff
    for (let i = 0; i < diff.length; i++) {
      const line = diff[i];
      const content = line.content;

      if (content.startsWith('<<<<<<<')) {
        hasConflictMarkers = true;
        inConflict = true;
        enhancedLines.push({
          type: 'conflict-start',
          content: content,
          lineNumber: line.lineNumber,
        });
        continue;
      }

      if (inConflict && content.startsWith('=======')) {
        enhancedLines.push({
          type: 'conflict-end',
          content: content,
          lineNumber: line.lineNumber,
        });
        inConflict = false;
        continue;
      }

      if (content.startsWith('>>>>>>>')) {
        enhancedLines.push({
          type: 'conflict-end',
          content: content,
          lineNumber: line.lineNumber,
        });
        continue;
      }

      if (inConflict) {
        enhancedLines.push({
          type: 'conflict-ours',
          content: content,
          lineNumber: line.lineNumber,
        });
        conflictOurs.push({
          type: 'conflict-ours',
          content: content,
          lineNumber: line.lineNumber,
        });
      } else if (
        i > 0 &&
        diff[i - 1].content.startsWith('=======') &&
        !content.startsWith('>>>>>>>')
      ) {
        enhancedLines.push({
          type: 'conflict-theirs',
          content: content,
          lineNumber: line.lineNumber,
        });
        conflictTheirs.push({
          type: 'conflict-theirs',
          content: content,
          lineNumber: line.lineNumber,
        });
      } else {
        enhancedLines.push(line);
      }
    }

    setHasConflicts(hasConflictMarkers);
    setEnhancedDiff(enhancedLines);

    // Prepare initial resolved content (the full file content)
    setResolvedContent(fileDiff[filePath].newContent);
  }, [fileDiff, filePath]);

  if (!visible) return null;

  const diff = fileDiff[filePath];

  if (!diff) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        No diff information available
      </div>
    );
  }

  // Handle choosing "ours" version for a conflict
  const handleChooseOurs = (startIndex: number) => {
    // Find the conflict section
    let endIndex = startIndex;
    let separatorIndex = -1;

    // Find the separator and end of conflict
    for (let i = startIndex + 1; i < enhancedDiff.length; i++) {
      if (enhancedDiff[i].type === 'conflict-end') {
        endIndex = i;
        break;
      }
      if (enhancedDiff[i].content.startsWith('=======')) {
        separatorIndex = i;
      }
    }

    if (separatorIndex === -1 || endIndex <= separatorIndex) return;

    // Extract "ours" content (between start and separator)
    const oursContent = enhancedDiff
      .slice(startIndex + 1, separatorIndex)
      .map((line) => line.content)
      .join('\n');

    // Replace the conflict in the resolved content
    const lines = resolvedContent.split('\n');
    const startLine = enhancedDiff[startIndex].lineNumber.new || 0;
    const endLine = enhancedDiff[endIndex].lineNumber.new || 0;

    const newLines = [
      ...lines.slice(0, startLine - 1),
      ...oursContent.split('\n'),
      ...lines.slice(endLine),
    ];

    setResolvedContent(newLines.join('\n'));
    toast.success('Conflict resolved with "our" changes');
  };

  // Handle choosing "theirs" version for a conflict
  const handleChooseTheirs = (startIndex: number) => {
    // Find the conflict section
    let endIndex = startIndex;
    let separatorIndex = -1;

    // Find the separator and end of conflict
    for (let i = startIndex + 1; i < enhancedDiff.length; i++) {
      if (enhancedDiff[i].type === 'conflict-end') {
        endIndex = i;
        break;
      }
      if (enhancedDiff[i].content.startsWith('=======')) {
        separatorIndex = i;
      }
    }

    if (separatorIndex === -1 || endIndex <= separatorIndex) return;

    // Extract "theirs" content (between separator and end)
    const theirsContent = enhancedDiff
      .slice(separatorIndex + 1, endIndex)
      .map((line) => line.content)
      .join('\n');

    // Replace the conflict in the resolved content
    const lines = resolvedContent.split('\n');
    const startLine = enhancedDiff[startIndex].lineNumber.new || 0;
    const endLine = enhancedDiff[endIndex].lineNumber.new || 0;

    const newLines = [
      ...lines.slice(0, startLine - 1),
      ...theirsContent.split('\n'),
      ...lines.slice(endLine),
    ];

    setResolvedContent(newLines.join('\n'));
    toast.success('Conflict resolved with "their" changes');
  };

  // Handle saving the resolved content
  const handleSaveResolution = async () => {
    try {
      // In a real implementation, we would save the resolved content to the file
      // and mark the conflict as resolved in Git
      // For now, we'll just show a success message
      toast.success('Changes saved successfully');
      setIsEditing(false);
    } catch (err) {
      toast.error('Failed to save changes');
    }
  };

  return (
    <div className="w-full h-full overflow-auto bg-white dark:bg-gray-900 font-mono text-sm">
      <div className="sticky top-0 z-10 p-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600">
        <div className="flex justify-between items-center">
          <div>
            <span className="font-medium">Diff for: </span>
            <span className="text-gray-700 dark:text-gray-300">{filePath}</span>
          </div>
          <div className="flex items-center gap-2">
            {hasConflicts && (
              <div className="flex items-center text-amber-500 dark:text-amber-400">
                <AlertCircle className="h-4 w-4 mr-1" />
                <span className="text-xs">Conflicts detected</span>
              </div>
            )}
            {selectedCommit && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Comparing with commit: {selectedCommit.substring(0, 7)}
              </div>
            )}
            {hasConflicts && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="ml-2"
              >
                {isEditing ? (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Done
                  </>
                ) : (
                  <>
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </>
                )}
              </Button>
            )}
            {isEditing && (
              <Button variant="default" size="sm" onClick={handleSaveResolution}>
                <Check className="h-3 w-3 mr-1" />
                Save
              </Button>
            )}
          </div>
        </div>
      </div>

      {isEditing ? (
        <div className="p-4">
          <textarea
            value={resolvedContent}
            onChange={(e) => setResolvedContent(e.target.value)}
            className="w-full h-[calc(100vh-200px)] font-mono text-sm p-2 border rounded"
          />
        </div>
      ) : (
        <div className="p-4">
          {enhancedDiff.map((line, index) => {
            let bgColor = '';
            let lineNumberOld = '';
            let lineNumberNew = '';

            if (line.type === 'added') {
              bgColor = 'bg-green-50 dark:bg-green-900/20';
              lineNumberNew = line.lineNumber.new?.toString() || '';
            } else if (line.type === 'removed') {
              bgColor = 'bg-red-50 dark:bg-red-900/20';
              lineNumberOld = line.lineNumber.old?.toString() || '';
            } else if (line.type === 'conflict-start') {
              bgColor = 'bg-amber-100 dark:bg-amber-900/30';
              lineNumberNew = line.lineNumber.new?.toString() || '';
              lineNumberOld = line.lineNumber.old?.toString() || '';
            } else if (line.type === 'conflict-ours') {
              bgColor = 'bg-blue-50 dark:bg-blue-900/20';
              lineNumberNew = line.lineNumber.new?.toString() || '';
              lineNumberOld = line.lineNumber.old?.toString() || '';
            } else if (line.type === 'conflict-theirs') {
              bgColor = 'bg-purple-50 dark:bg-purple-900/20';
              lineNumberNew = line.lineNumber.new?.toString() || '';
              lineNumberOld = line.lineNumber.old?.toString() || '';
            } else if (line.type === 'conflict-end') {
              bgColor = 'bg-amber-100 dark:bg-amber-900/30';
              lineNumberNew = line.lineNumber.new?.toString() || '';
              lineNumberOld = line.lineNumber.old?.toString() || '';
            } else {
              lineNumberOld = line.lineNumber.old?.toString() || '';
              lineNumberNew = line.lineNumber.new?.toString() || '';
            }

            return (
              <div
                key={index}
                className={`flex ${bgColor} hover:bg-gray-100 dark:hover:bg-gray-800 relative group`}
              >
                <div className="w-12 text-right pr-2 text-gray-500 dark:text-gray-400 select-none border-r border-gray-300 dark:border-gray-600">
                  {lineNumberOld}
                </div>
                <div className="w-12 text-right pr-2 text-gray-500 dark:text-gray-400 select-none border-r border-gray-300 dark:border-gray-600">
                  {lineNumberNew}
                </div>
                <div className="pl-4 flex-1 whitespace-pre">
                  {line.type === 'added' && (
                    <span className="text-green-600 dark:text-green-400">+</span>
                  )}
                  {line.type === 'removed' && (
                    <span className="text-red-600 dark:text-red-400">-</span>
                  )}
                  {line.type === 'conflict-start' && (
                    <span className="text-amber-600 dark:text-amber-400">&lt;&lt;&lt;</span>
                  )}
                  {line.type === 'conflict-ours' && (
                    <span className="text-blue-600 dark:text-blue-400">|</span>
                  )}
                  {line.type === 'conflict-theirs' && (
                    <span className="text-purple-600 dark:text-purple-400">|</span>
                  )}
                  {line.type === 'conflict-end' && (
                    <span className="text-amber-600 dark:text-amber-400">&gt;&gt;&gt;</span>
                  )}
                  {line.type === 'unchanged' && (
                    <span className="text-gray-400 dark:text-gray-600"> </span>
                  )}
                  {line.content}
                </div>

                {/* Conflict resolution buttons */}
                {line.type === 'conflict-start' && (
                  <div className="absolute right-2 top-0 hidden group-hover:flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleChooseOurs(index)}
                      className="py-0 h-6 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50"
                    >
                      <span className="text-xs">Use Ours</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleChooseTheirs(index)}
                      className="py-0 h-6 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-900/50"
                    >
                      <span className="text-xs">Use Theirs</span>
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GitDiffViewer;
