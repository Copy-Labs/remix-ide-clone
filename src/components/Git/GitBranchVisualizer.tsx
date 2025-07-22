import React, { useEffect, useRef, useState } from 'react';
import { useGitStore } from '@/stores/gitStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { GitBranch, GitCommit, GitMerge, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface CommitNode {
  id: string;
  message: string;
  author: string;
  timestamp: number;
  parents: string[];
  branch: string;
  isMergeCommit: boolean;
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
  } = useGitStore();

  const [graphData, setGraphData] = useState<{
    nodes: CommitNode[];
    branchInfo: BranchInfo[];
  }>({ nodes: [], branchInfo: [] });

  const [newBranchName, setNewBranchName] = useState('');
  const [showNewBranchInput, setShowNewBranchInput] = useState(false);
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null);

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
    const branchInfo: BranchInfo[] = branches.map(branch => ({
      name: branch.name,
      current: branch.current,
      color: branchColors.get(branch.name) || '#888888',
    }));

    // Process commits into nodes
    const nodes: CommitNode[] = commits.map(commit => {
      // Determine which branch this commit belongs to
      // This is a simplified approach - in a real implementation,
      // we would need more sophisticated branch detection
      const branch = currentBranch;

      return {
        id: commit.oid,
        message: commit.message,
        author: commit.author.name,
        timestamp: commit.author.timestamp,
        parents: [], // We'll need to enhance gitService to provide parent information
        branch,
        isMergeCommit: false, // We'll need to enhance gitService to detect merge commits
      };
    });

    setGraphData({ nodes, branchInfo });
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
    const nodeHeight = 30;
    const nodeSpacing = 20;
    const totalHeight = graphData.nodes.length * (nodeHeight + nodeSpacing);
    canvas.height = totalHeight;

    // Draw nodes and connections
    graphData.nodes.forEach((node, index) => {
      const y = index * (nodeHeight + nodeSpacing) + nodeHeight / 2;
      const x = 100; // Fixed x position for now

      // Find branch color
      const branchInfo = graphData.branchInfo.find(b => b.name === node.branch);
      const color = branchInfo?.color || '#888888';

      // Draw node
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();

      // Draw connections to parents
      if (index < graphData.nodes.length - 1) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + nodeSpacing + nodeHeight);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
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

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Branch Visualization</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => getCommits(50)}
            disabled={isLoading}
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

          {showNewBranchInput ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                placeholder="Branch name"
                className="px-2 py-1 text-sm border rounded"
              />
              <Button size="sm" onClick={handleCreateBranch} disabled={isLoading || !newBranchName.trim()}>
                Create
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowNewBranchInput(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNewBranchInput(true)}
              disabled={isLoading}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Branch
            </Button>
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
            {branch.current && <Badge variant="outline" className="ml-1 text-xs">current</Badge>}

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
          <canvas ref={canvasRef} className="absolute left-0 top-0 z-0" width="200" />

          <div className="relative z-10">
            {graphData.nodes.map((node, index) => {
              const branchInfo = graphData.branchInfo.find(b => b.name === node.branch);
              const color = branchInfo?.color || '#888888';

              return (
                <div
                  key={node.id}
                  className={`ml-[120px] mb-5 p-3 border rounded-md ${
                    selectedCommit === node.id ? 'bg-secondary/20' : 'bg-card'
                  }`}
                  onClick={() => setSelectedCommit(node.id === selectedCommit ? null : node.id)}
                >
                  <div className="flex items-center gap-2">
                    <GitCommit className="h-4 w-4" style={{ color }} />
                    <span className="font-mono text-xs">{node.id.substring(0, 7)}</span>
                    <span className="font-medium">{node.message}</span>
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
    </div>
  );
};

export default GitBranchVisualizer;
