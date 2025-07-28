import React, { useEffect, useRef, useState } from 'react';
import { useGitStore } from '@/stores/gitStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  ArrowDown,
  ArrowUp,
  Check,
  FileText,
  GitBranch,
  GitCommit,
  GitMerge,
  Plus,
  RefreshCw,
  Scissors,
  Trash2,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils.ts';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import CommitDetailsView from './CommitDetailsView';

interface CommitNode {
  id: string;
  message: string;
  author: string;
  timestamp: number;
  parents: string[];
  branch: string;
  isMergeCommit: boolean;
  x: number;
  y: number;
  lane: number;
}

interface BranchInfo {
  name: string;
  current: boolean;
  color: string;
}

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];

const GitBranchVisualizer: React.FC = () => {
  const {
    commits,
    branches,
    currentBranch,
    getCommits,
    createBranch,
    switchBranch,
    deleteBranch,
    isLoading,
    rebaseInProgress,
    rebaseTargetCommit,
    rebaseCommits,
    startInteractiveRebase,
    continueRebase,
    abortRebase,
    reorderCommits,
    squashCommit,
    dropCommit,
  } = useGitStore();

  const [graphData, setGraphData] = useState<{
    nodes: CommitNode[];
    branchInfo: BranchInfo[];
  }>({ nodes: [], branchInfo: [] });

  const [newBranchName, setNewBranchName] = useState('');
  const [showNewBranchInput, setShowNewBranchInput] = useState(false);
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null);

  // Rebase UI state
  const [showRebaseDialog, setShowRebaseDialog] = useState(false);
  const [showSquashDialog, setShowSquashDialog] = useState(false);
  const [squashCommitId, setSquashCommitId] = useState<string | null>(null);
  const [squashTargetId, setSquashTargetId] = useState<string | null>(null);
  const [squashMessage, setSquashMessage] = useState('');
  const [rebaseCommitOrder, setRebaseCommitOrder] = useState<string[]>([]);

  // Commit details UI state
  const [showCommitDetails, setShowCommitDetails] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Process commits into a graph structure
  useEffect(() => {
    if (commits.length === 0) return;

    // Assign colors to branches
    const branchColors = new Map<string, string>();
    branches.forEach((branch, index) => {
      branchColors.set(branch.name, COLORS[index % COLORS.length]);
    });

    // Create branch info
    const branchInfo: BranchInfo[] = branches.map((branch) => ({
      name: branch.name,
      current: branch.current,
      color: branchColors.get(branch.name) || '#888888',
    }));

    // Create a map of commit ID to its index for quick lookup
    const commitMap = new Map<string, number>();
    commits.forEach((commit, index) => {
      commitMap.set(commit.oid, index);
    });

    // Determine branch for each commit using a more sophisticated approach
    const branchAssignments = new Map<string, string>();

    // Start by assigning the current branch to the most recent commit
    if (commits.length > 0) {
      branchAssignments.set(commits[0].oid, currentBranch);
    }

    // Process commits to determine parent-child relationships and branch assignments
    const processedNodes: CommitNode[] = [];
    const laneAssignments = new Map<string, number>(); // branch name to lane number
    let nextLane = 0;

    // Assign initial lane to current branch
    laneAssignments.set(currentBranch, nextLane++);

    // Process each commit
    commits.forEach((commit, index) => {
      // Determine which branch this commit belongs to
      let branch = branchAssignments.get(commit.oid) || currentBranch;

      // Get or assign a lane for this branch
      let lane = laneAssignments.get(branch) ?? -1;
      if (lane === -1) {
        lane = nextLane++;
        laneAssignments.set(branch, lane);
      }

      // Determine if this is a merge commit (in a real implementation, we would check if it has multiple parents)
      const isMergeCommit = false; // Placeholder - would need gitService enhancement

      // Determine parents (in a real implementation, we would get this from the commit data)
      const parents: string[] = [];
      if (index < commits.length - 1) {
        parents.push(commits[index + 1].oid);
      }

      // Calculate position
      const y = index * 50 + 25; // 50px per commit, centered
      const x = 100 + lane * 60; // 60px per lane, starting at 100px

      processedNodes.push({
        id: commit.oid,
        message: commit.message,
        author: commit.author.name,
        timestamp: commit.author.timestamp,
        parents,
        branch,
        isMergeCommit,
        x,
        y,
        lane,
      });
    });

    setGraphData({ nodes: processedNodes, branchInfo });
  }, [commits, branches, currentBranch]);

  // Draw the graph when data changes
  useEffect(() => {
    if (!canvasRef.current || graphData.nodes.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set canvas dimensions
    const nodeRadius = 8;
    const totalHeight =
      graphData.nodes.length > 0 ? Math.max(...graphData.nodes.map((node) => node.y)) + 100 : 100;
    const totalWidth =
      graphData.nodes.length > 0 ? Math.max(...graphData.nodes.map((node) => node.x)) + 100 : 300;

    canvas.height = totalHeight;
    canvas.width = totalWidth;

    // Draw branch lines first (behind nodes)
    const lanePositions = new Map<number, number>(); // lane number to x position

    graphData.nodes.forEach((node) => {
      lanePositions.set(node.lane, node.x);
    });

    // Draw continuous branch lines
    lanePositions.forEach((x, lane) => {
      const nodesInLane = graphData.nodes.filter((n) => n.lane === lane);
      if (nodesInLane.length > 0) {
        const firstNode = nodesInLane[0];
        const lastNode = nodesInLane[nodesInLane.length - 1];

        // Find branch color
        const branchInfo = graphData.branchInfo.find((b) => b.name === firstNode.branch);
        const color = branchInfo?.color || '#888888';

        ctx.beginPath();
        ctx.moveTo(x, firstNode.y);
        ctx.lineTo(x, lastNode.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });

    // Draw connections between nodes (parent-child relationships)
    graphData.nodes.forEach((node) => {
      node.parents.forEach((parentId) => {
        const parentNode = graphData.nodes.find((n) => n.id === parentId);
        if (parentNode) {
          // Find branch color
          const branchInfo = graphData.branchInfo.find((b) => b.name === node.branch);
          const color = branchInfo?.color || '#888888';

          ctx.beginPath();

          // Start at child node
          ctx.moveTo(node.x, node.y);

          // If parent is in a different lane, draw a curved connection
          if (node.lane !== parentNode.lane) {
            // Control points for bezier curve
            const cp1x = node.x;
            const cp1y = (node.y + parentNode.y) / 2;
            const cp2x = parentNode.x;
            const cp2y = (node.y + parentNode.y) / 2;

            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, parentNode.x, parentNode.y);
          } else {
            // Direct line for same lane
            ctx.lineTo(parentNode.x, parentNode.y);
          }

          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
    });

    // Draw nodes on top
    graphData.nodes.forEach((node) => {
      // Find branch color
      const branchInfo = graphData.branchInfo.find((b) => b.name === node.branch);
      const color = branchInfo?.color || '#888888';

      // Draw node
      ctx.beginPath();
      ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();

      // Add white border for better visibility
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // For merge commits, add an additional ring
      if (node.isMergeCommit) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeRadius + 3, 0, 2 * Math.PI);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });
  }, [graphData]);

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) {
      toast.error('Please enter a branch name');
      return;
    }

    try {
      await createBranch(newBranchName);
      toast.success(`Branch '${newBranchName}' created successfully`);
      setNewBranchName('');
      setShowNewBranchInput(false);
    } catch (err) {
      toast.error('Failed to create branch');
    }
  };

  const handleSwitchBranch = async (branchName: string) => {
    try {
      await switchBranch(branchName);
      toast.success(`Switched to branch '${branchName}'`);
    } catch (err) {
      toast.error('Failed to switch branch');
    }
  };

  const handleDeleteBranch = async (branchName: string) => {
    if (window.confirm(`Are you sure you want to delete the branch "${branchName}"?`)) {
      try {
        await deleteBranch(branchName);
        toast.success(`Branch '${branchName}' deleted successfully`);
      } catch (err) {
        toast.error('Failed to delete branch');
      }
    }
  };

  // Rebase operations
  const handleStartRebase = async (commitId: string) => {
    try {
      await startInteractiveRebase(commitId);
      setRebaseCommitOrder(rebaseCommits.map((commit) => commit.oid));
      setShowRebaseDialog(true);
      toast.success('Interactive rebase started');
    } catch (err) {
      toast.error('Failed to start interactive rebase');
    }
  };

  const handleContinueRebase = async () => {
    try {
      await continueRebase();
      setShowRebaseDialog(false);
      toast.success('Rebase completed successfully');
    } catch (err) {
      toast.error('Failed to complete rebase');
    }
  };

  const handleAbortRebase = async () => {
    try {
      await abortRebase();
      setShowRebaseDialog(false);
      toast.success('Rebase aborted');
    } catch (err) {
      toast.error('Failed to abort rebase');
    }
  };

  const handleReorderCommits = async () => {
    try {
      await reorderCommits(rebaseCommitOrder);
      toast.success('Commits reordered');
    } catch (err) {
      toast.error('Failed to reorder commits');
    }
  };

  const handleMoveCommitUp = (commitId: string) => {
    const index = rebaseCommitOrder.indexOf(commitId);
    if (index > 0) {
      const newOrder = [...rebaseCommitOrder];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      setRebaseCommitOrder(newOrder);
    }
  };

  const handleMoveCommitDown = (commitId: string) => {
    const index = rebaseCommitOrder.indexOf(commitId);
    if (index < rebaseCommitOrder.length - 1) {
      const newOrder = [...rebaseCommitOrder];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      setRebaseCommitOrder(newOrder);
    }
  };

  const handleOpenSquashDialog = (commitId: string, targetId: string) => {
    const commit = rebaseCommits.find((c) => c.oid === commitId);
    const targetCommit = rebaseCommits.find((c) => c.oid === targetId);

    if (commit && targetCommit) {
      setSquashCommitId(commitId);
      setSquashTargetId(targetId);
      setSquashMessage(`${targetCommit.message}\n\n${commit.message}`);
      setShowSquashDialog(true);
    }
  };

  const handleSquashCommit = async () => {
    if (!squashCommitId || !squashTargetId) return;

    try {
      await squashCommit(squashCommitId, squashTargetId, squashMessage);
      setShowSquashDialog(false);

      // Update the rebase commit order by removing the squashed commit
      setRebaseCommitOrder((prev) => prev.filter((id) => id !== squashCommitId));

      toast.success('Commits squashed');
    } catch (err) {
      toast.error('Failed to squash commits');
    }
  };

  const handleDropCommit = async (commitId: string) => {
    try {
      await dropCommit(commitId);

      // Update the rebase commit order by removing the dropped commit
      setRebaseCommitOrder((prev) => prev.filter((id) => id !== commitId));

      toast.success('Commit dropped');
    } catch (err) {
      toast.error('Failed to drop commit');
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold">Branch Visualization</h3>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => getCommits(50)}
            disabled={isLoading}
            title="Refresh"
          >
            <RefreshCw className={cn('h-4 w-4', isLoading ? 'animate-spin' : '')} />
          </Button>

          {rebaseInProgress ? (
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400"
              >
                Rebase in Progress
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowRebaseDialog(true)}
                className="text-xs"
              >
                Continue Rebase
              </Button>
            </div>
          ) : (
            <>
              {showNewBranchInput ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    placeholder="Branch name"
                    className="px-2 py-1 text-sm border rounded"
                  />
                  <Button
                    size="sm"
                    onClick={handleCreateBranch}
                    disabled={isLoading || !newBranchName.trim()}
                  >
                    Create
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowNewBranchInput(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  className={'text-xs'}
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewBranchInput(true)}
                  disabled={isLoading}
                >
                  <Plus className="h-4 w-4" />
                  New Branch
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex gap-4 mb-4">
        {graphData.branchInfo.map((branch) => (
          <div
            key={branch.name}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm ${
              branch.current ? 'bg-secondary' : 'bg-secondary/20'
            }`}
            style={{ borderLeft: `3px solid ${branch.color}` }}
          >
            <GitBranch className="h-3 w-3" />
            <span>{branch.name}</span>
            {branch.current && (
              <Badge variant="outline" className="ml-1 text-xs">
                current
              </Badge>
            )}

            {!branch.current && (
              <div className="flex gap-1 ml-2">
                <button
                  onClick={() => handleSwitchBranch(branch.name)}
                  className="text-blue-500 hover:text-blue-700"
                  title="Switch to this branch"
                >
                  <GitMerge className="h-3 w-3" />
                </button>
                <button
                  onClick={() => handleDeleteBranch(branch.name)}
                  className="text-red-500 hover:text-red-700"
                  title="Delete this branch"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <ScrollArea className="flex-1 border rounded-md">
        <div className="p-4 relative">
          <canvas ref={canvasRef} className="absolute left-0 top-0 z-0" width="800" height="600" />

          <div className="relative z-10">
            {graphData.nodes.map((node, index) => {
              const branchInfo = graphData.branchInfo.find((b) => b.name === node.branch);
              const color = branchInfo?.color || '#888888';

              // Position the commit card next to its node in the visualization
              const style = {
                marginLeft: `${node.x + 20}px`,
                marginTop: `${node.y - 30}px`,
                borderLeft: `3px solid ${color}`,
                position: 'absolute' as 'absolute',
                width: 'calc(100% - 200px)',
                maxWidth: '500px',
              };

              return (
                <div
                  key={node.id}
                  className={`p-3 border rounded-md ${
                    selectedCommit === node.id ? 'bg-secondary/20' : 'bg-card'
                  }`}
                  style={style}
                  onClick={() => setSelectedCommit(node.id === selectedCommit ? null : node.id)}
                >
                  <div className="flex items-center gap-2">
                    {node.isMergeCommit ? (
                      <GitMerge className="h-4 w-4" style={{ color }} />
                    ) : (
                      <GitCommit className="h-4 w-4" style={{ color }} />
                    )}
                    <span className="font-mono text-xs">{node.id.substring(0, 7)}</span>
                    <span className="font-medium">{node.message}</span>
                    <Badge
                      variant="outline"
                      className="ml-auto text-[10px]"
                      style={{ backgroundColor: `${color}20`, color }}
                    >
                      {node.branch}
                    </Badge>

                    {!rebaseInProgress && selectedCommit === node.id && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartRebase(node.id);
                          }}
                          title="Start interactive rebase from this commit"
                        >
                          Rebase
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowCommitDetails(true);
                          }}
                          title="View commit details"
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          Details
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    <span>{node.author}</span>
                    <span className="mx-1">•</span>
                    <span>{new Date(node.timestamp * 1000).toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </ScrollArea>

      {/* Rebase Dialog */}
      <Dialog open={showRebaseDialog} onOpenChange={setShowRebaseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Interactive Rebase</DialogTitle>
            <DialogDescription>Reorder, squash, or drop commits during rebase.</DialogDescription>
          </DialogHeader>

          {rebaseInProgress && (
            <div className="space-y-4">
              <Alert
                variant="warning"
                className="bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
              >
                <AlertDescription>
                  You are rebasing onto commit {rebaseTargetCommit?.substring(0, 7)}. Reorder,
                  squash, or drop commits as needed, then continue or abort the rebase.
                </AlertDescription>
              </Alert>

              <div className="border rounded-md">
                <div className="p-2 bg-muted text-xs font-medium">Commits to Rebase</div>
                <ScrollArea className="h-64">
                  <div className="p-2 space-y-2">
                    {rebaseCommitOrder.map((commitId, index) => {
                      const commit = rebaseCommits.find((c) => c.oid === commitId);
                      if (!commit) return null;

                      return (
                        <div key={commitId} className="border rounded-md p-2 bg-card">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <GitCommit className="h-4 w-4" />
                              <span className="font-mono text-xs">
                                {commit.oid.substring(0, 7)}
                              </span>
                              <span className="text-xs font-medium">{commit.message}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => handleMoveCommitUp(commitId)}
                                disabled={index === 0}
                                title="Move up"
                              >
                                <ArrowUp className="h-3 w-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => handleMoveCommitDown(commitId)}
                                disabled={index === rebaseCommitOrder.length - 1}
                                title="Move down"
                              >
                                <ArrowDown className="h-3 w-3" />
                              </Button>
                              {index < rebaseCommitOrder.length - 1 && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6"
                                  onClick={() =>
                                    handleOpenSquashDialog(commitId, rebaseCommitOrder[index + 1])
                                  }
                                  title="Squash with next commit"
                                >
                                  <Scissors className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-red-500 hover:text-red-700"
                                onClick={() => handleDropCommit(commitId)}
                                title="Drop commit"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={handleAbortRebase} className="text-xs">
                  <X className="h-3 w-3 mr-1" />
                  Abort Rebase
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleReorderCommits} className="text-xs">
                    Apply Changes
                  </Button>
                  <Button onClick={handleContinueRebase} className="text-xs">
                    <Check className="h-3 w-3 mr-1" />
                    Continue Rebase
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Squash Dialog */}
      <Dialog open={showSquashDialog} onOpenChange={setShowSquashDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Squash Commits</DialogTitle>
            <DialogDescription>Enter a message for the squashed commit.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="squash-message">Commit Message</Label>
              <Textarea
                id="squash-message"
                value={squashMessage}
                onChange={(e) => setSquashMessage(e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowSquashDialog(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button onClick={handleSquashCommit} className="text-xs">
                Squash Commits
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Commit Details Dialog */}
      <Dialog open={showCommitDetails} onOpenChange={setShowCommitDetails}>
        <DialogContent className="max-w-4xl h-[80vh]">
          {selectedCommit && (
            <CommitDetailsView
              commitOid={selectedCommit}
              onClose={() => setShowCommitDetails(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GitBranchVisualizer;
