import React, { useEffect } from 'react';
import { useGitStore } from '@/stores/gitStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileText, GitCommit, Plus, Minus, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CommitDetailsViewProps {
  commitOid: string;
  onClose?: () => void;
}

const CommitDetailsView: React.FC<CommitDetailsViewProps> = ({ commitOid, onClose }) => {
  const { commitDetails, getCommitDetails, commits, isLoading } = useGitStore();

  // Get the commit object from the commits array
  const commit = commits.find((c) => c.oid === commitOid);

  useEffect(() => {
    if (commitOid && (!commitDetails.commitOid || commitDetails.commitOid !== commitOid)) {
      getCommitDetails(commitOid);
    }
  }, [commitOid, getCommitDetails, commitDetails.commitOid]);

  if (!commit) {
    return (
      <Card className="w-full h-full">
        <CardHeader>
          <CardTitle className="text-sm">Commit Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64">
            <p className="text-sm text-muted-foreground">Commit not found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isLoaded = commitDetails.commitOid === commitOid && !commitDetails.isLoading;
  const files = commitDetails.files || [];

  // Calculate summary statistics
  const totalFiles = files.length;
  const totalAdditions = files.reduce((sum, file) => sum + file.additions, 0);
  const totalDeletions = files.reduce((sum, file) => sum + file.deletions, 0);

  return (
    <Card className="w-full h-full">
      <CardHeader className="py-3 flex flex-row items-center justify-between">
        <div className="flex flex-col">
          <CardTitle className="text-sm flex items-center gap-2">
            <GitCommit className="h-4 w-4" />
            Commit Details
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose} className="ml-auto">
                Close
              </Button>
            )}
          </CardTitle>
          <div className="text-xs text-muted-foreground mt-1">
            <span className="font-mono">{commitOid.substring(0, 7)}</span>
            <span className="mx-1">•</span>
            <span>{commit.author.name}</span>
            <span className="mx-1">•</span>
            <span>{new Date(commit.author.timestamp * 1000).toLocaleString()}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="p-3 border-b">
          <h3 className="text-sm font-medium">{commit.message}</h3>
        </div>

        {isLoading && !isLoaded ? (
          <div className="flex flex-col items-center justify-center h-64">
            <p className="text-sm text-muted-foreground">Loading commit details...</p>
          </div>
        ) : (
          <>
            <div className="p-3 border-b">
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  <span>{totalFiles} files changed</span>
                </div>
                <div className="flex items-center gap-1 text-green-600">
                  <Plus className="h-3.5 w-3.5" />
                  <span>{totalAdditions} additions</span>
                </div>
                <div className="flex items-center gap-1 text-red-600">
                  <Minus className="h-3.5 w-3.5" />
                  <span>{totalDeletions} deletions</span>
                </div>
              </div>
            </div>

            <ScrollArea className="h-[calc(100vh-300px)]">
              <div className="p-3 space-y-4">
                {files.map((file, index) => (
                  <div key={index} className="border rounded-md overflow-hidden">
                    <div className="flex items-center justify-between p-2 bg-muted">
                      <div className="flex items-center gap-2 text-xs">
                        <FileCode className="h-3.5 w-3.5" />
                        <span className="font-mono">{file.file}</span>
                        <Badge
                          variant={
                            file.status === 'added'
                              ? 'success'
                              : file.status === 'modified'
                                ? 'warning'
                                : file.status === 'deleted'
                                  ? 'destructive'
                                  : 'outline'
                          }
                          className="text-[10px] py-0 h-4"
                        >
                          {file.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-green-600">+{file.additions}</span>
                        <span className="text-red-600">-{file.deletions}</span>
                      </div>
                    </div>

                    <Separator />

                    <div className="p-0 bg-card">
                      <pre className="text-xs font-mono overflow-x-auto p-2 whitespace-pre">
                        {file.diff.split('\n').map((line, i) => {
                          let className = '';
                          if (line.startsWith('+'))
                            className =
                              'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400';
                          if (line.startsWith('-'))
                            className =
                              'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400';

                          return (
                            <div key={i} className={className}>
                              {line}
                            </div>
                          );
                        })}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default CommitDetailsView;
