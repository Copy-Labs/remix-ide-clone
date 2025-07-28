import React, { useState, useEffect } from 'react';
import { useGitStore } from '@/stores/gitStore';
import { useFileStore } from '@/stores/fileStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Minus, Check, X, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface InlineHunkStagerProps {
  filepath: string;
  onClose?: () => void;
}

const InlineHunkStager: React.FC<InlineHunkStagerProps> = ({ filepath, onClose }) => {
  const { addHunk, unstageHunk, getStatus, status } = useGitStore();
  const { readFile } = useFileStore();

  const [fileContent, setFileContent] = useState<string>('');
  const [lines, setLines] = useState<string[]>([]);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Find if the file is staged
  const fileStatus = status.files.find((file) => file.file === filepath);
  const isStaged = fileStatus?.stage === 2;

  useEffect(() => {
    const loadFileContent = async () => {
      try {
        setIsLoading(true);
        const content = await readFile(filepath);
        setFileContent(content);
        setLines(content.split('\n'));
      } catch (err) {
        toast.error(`Failed to load file: ${filepath}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadFileContent();
  }, [filepath, readFile]);

  const handleLineClick = (lineNumber: number) => {
    if (selectionStart === null) {
      setSelectionStart(lineNumber);
      setSelectionEnd(lineNumber);
    } else if (selectionEnd === lineNumber && selectionStart === lineNumber) {
      // Clicking the same line again deselects it
      setSelectionStart(null);
      setSelectionEnd(null);
    } else {
      // Extend selection
      if (lineNumber < selectionStart) {
        setSelectionStart(lineNumber);
      } else {
        setSelectionEnd(lineNumber);
      }
    }
  };

  const handleStageHunk = async () => {
    if (selectionStart === null || selectionEnd === null) {
      toast.error('Please select lines to stage');
      return;
    }

    try {
      setIsLoading(true);

      // Get the content of the selected lines
      const selectedLines = lines.slice(selectionStart - 1, selectionEnd);
      const hunkContent = selectedLines.join('\n');

      await addHunk(filepath, {
        startLine: selectionStart,
        endLine: selectionEnd,
        content: hunkContent,
      });

      toast.success(`Hunk staged successfully`);

      // Refresh status
      await getStatus();

      // Reset selection
      setSelectionStart(null);
      setSelectionEnd(null);
    } catch (err) {
      toast.error(`Failed to stage hunk: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnstageHunk = async () => {
    if (selectionStart === null || selectionEnd === null) {
      toast.error('Please select lines to unstage');
      return;
    }

    try {
      setIsLoading(true);

      // Get the content of the selected lines
      const selectedLines = lines.slice(selectionStart - 1, selectionEnd);
      const hunkContent = selectedLines.join('\n');

      await unstageHunk(filepath, {
        startLine: selectionStart,
        endLine: selectionEnd,
        content: hunkContent,
      });

      toast.success(`Hunk unstaged successfully`);

      // Refresh status
      await getStatus();

      // Reset selection
      setSelectionStart(null);
      setSelectionEnd(null);
    } catch (err) {
      toast.error(`Failed to unstage hunk: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full h-full">
      <CardHeader className="py-3 flex flex-row items-center justify-between">
        <div className="flex flex-col">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Hunk Staging: {filepath}
          </CardTitle>
          <div className="text-xs text-muted-foreground mt-1">Select lines to stage or unstage</div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleStageHunk}
            disabled={isLoading || selectionStart === null || isStaged}
          >
            <Plus className="h-3 w-3 mr-1" />
            Stage Selection
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleUnstageHunk}
            disabled={isLoading || selectionStart === null || !isStaged}
          >
            <Minus className="h-3 w-3 mr-1" />
            Unstage Selection
          </Button>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-3 w-3 mr-1" />
              Close
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-sm text-muted-foreground">Loading file content...</p>
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="font-mono text-xs">
              <table className="w-full border-collapse">
                <tbody>
                  {lines.map((line, index) => {
                    const lineNumber = index + 1;
                    const isSelected =
                      selectionStart !== null &&
                      selectionEnd !== null &&
                      lineNumber >= selectionStart &&
                      lineNumber <= selectionEnd;

                    return (
                      <tr
                        key={lineNumber}
                        className={`
                          hover:bg-muted/50 cursor-pointer
                          ${isSelected ? 'bg-blue-100 dark:bg-blue-900/30' : ''}
                        `}
                        onClick={() => handleLineClick(lineNumber)}
                      >
                        <td className="text-right pr-4 py-0.5 text-muted-foreground border-r w-12">
                          {lineNumber}
                        </td>
                        <td className="pl-4 py-0.5 whitespace-pre">{line}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default InlineHunkStager;
