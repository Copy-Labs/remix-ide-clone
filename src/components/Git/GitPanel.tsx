import React, { useEffect, useState } from 'react';
import { useGitStore } from '@/stores/gitStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertCircle,
  Check,
  Download,
  GitBranch,
  GitCommit,
  Github,
  GitMerge,
  HelpCircle,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
  Upload,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
// import toast from 'react-hot-toast';
import GitBranchVisualizer from './GitBranchVisualizer';
import { GitErrorBanner } from './GitErrorBanner';

const GitPanel: React.FC = () => {
  const {
    // State
    isInitialized,
    currentBranch,
    branches,
    commits,
    status,
    config,
    isLoading,
    error,

    // Actions
    initRepository,
    createInitialCommit,
    createBranch,
    switchBranch,
    deleteBranch,
    getBranches,
    addFile,
    unstageFile,
    addAllFiles,
    commit,
    getCommits,
    getStatus,
    setConfig,
    setError,
    resetGitIndex,
  } = useGitStore();

  // Local state for forms
  const [commitMessage, setCommitMessage] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [userName, setUserName] = useState(config.user.name);
  const [userEmail, setUserEmail] = useState(config.user.email);

  // Dialog states
  const [showBranchDialog, setShowBranchDialog] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);

  useEffect(() => {
    if (isInitialized) {
      getBranches();
      getCommits();
      getStatus();
    }
  }, [isInitialized]);


  const handleInitRepository = async () => {
    try {
      await initRepository();
      toast.success('Repository initialized successfully');
    } catch (err) {
      toast.error('Failed to initialize repository');
    }
  };


  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) {
      toast.error('Please enter a branch name');
      return;
    }

    try {
      await createBranch(newBranchName);
      setShowBranchDialog(false);
      setNewBranchName('');
      toast.success(`Branch '${newBranchName}' created successfully`);
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

  const handleCommit = async () => {
    if (!commitMessage.trim()) {
      toast.error('Please enter a commit message');
      return;
    }

    try {
      await commit(commitMessage);
      setCommitMessage('');
      toast.success('Changes committed successfully');
    } catch (err) {
      toast.error('Failed to commit changes');
    }
  };


  // GitHub connection is now handled by GitAuthManager

  const handleSaveConfig = () => {
    setConfig({
      user: {
        name: userName,
        email: userEmail,
      },
    });
    setShowConfigDialog(false);
    toast.success('Configuration saved');
  };


  const handleResetGitIndex = async () => {
    try {
      await resetGitIndex();
      toast.success('Git index has been reset successfully');
    } catch (err) {
      toast.error('Failed to reset Git index');
    }
  };

  const getStatusIcon = (file: any) => {
    const { head, workdir, stage } = file;

    if (head === 1 && workdir === 2 && stage === 0) return <AlertCircle className="h-4 w-4 text-orange-500" />; // Modified
    if (head === 0 && workdir === 2 && stage === 0) return <Plus className="h-4 w-4 text-green-500" />; // New
    if (head === 1 && workdir === 0 && stage === 0) return <Trash2 className="h-4 w-4 text-red-500" />; // Deleted
    if (stage === 2) return <Check className="h-4 w-4 text-blue-500" />; // Staged

    return <HelpCircle className="h-4 w-4 text-gray-500" />; // Unknown
  };

  const getStatusText = (file: any) => {
    const { head, workdir, stage } = file;

    if (head === 1 && workdir === 2 && stage === 0) return 'Modified';
    if (head === 0 && workdir === 2 && stage === 0) return 'New';
    if (head === 1 && workdir === 0 && stage === 0) return 'Deleted';
    if (stage === 2) return 'Staged';

    return 'Unknown';
  };

  if (!isInitialized) {
    return (
      <div className="p-2 space-y-2">
        <Card className="shadow-none border">
          <CardHeader className="py-1.5 px-3">
            <CardTitle className="flex items-center gap-1.5 text-xs font-medium">
              <GitBranch className="h-4 w-4" />
              Git Integration
            </CardTitle>
            <CardDescription className="text-xs">
              Initialize a git repository to get started.
            </CardDescription>
          </CardHeader>
          <CardContent className="py-1 px-2 space-y-2">
            <Button onClick={handleInitRepository} disabled={isLoading} className="w-full h-7 text-xs">
              {isLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Initialize Repository
            </Button>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive" className="py-2 text-xs">
            <AlertCircle className="h-3.5 w-3.5" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <GitErrorBanner error={error} />
      </div>
    );
  }

  return (
    <div className="p-2 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <GitBranch className="h-4 w-4" />
          <span className="font-medium text-sm">Git</span>
          {currentBranch && <Badge variant="secondary" className="text-xs py-0 h-5">{currentBranch}</Badge>}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => setShowConfigDialog(true)} className="h-7 w-7">
            <Settings className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleResetGitIndex}
            disabled={isLoading}
            title="Reset Git Index"
            className="h-7 w-7"
          >
            <AlertCircle className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              getBranches();
              getCommits();
              getStatus();
            }}
            disabled={isLoading}
            className="h-7 w-7"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="py-2 text-xs">
          <AlertCircle className="h-3.5 w-3.5" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <GitErrorBanner error={error} />

      <Tabs defaultValue="changes" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-8">
          <TabsTrigger value="changes" className="text-xs py-1">Changes</TabsTrigger>
          <TabsTrigger value="branches" className="text-xs py-1">Branches</TabsTrigger>
          <TabsTrigger value="history" className="text-xs py-1">History</TabsTrigger>
        </TabsList>

        <TabsContent value="changes" className="space-y-2 mt-2">
          {/* Unstaged Changes */}
          <Card className="shadow-none border">
            <CardHeader className="py-1.5 px-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium">Unstaged Changes</CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={addAllFiles}
                    disabled={isLoading}
                    title="Stage All Changes"
                    className="h-6 w-6"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={getStatus}
                    disabled={isLoading}
                    title="Refresh Status"
                    className="h-6 w-6"
                  >
                    <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="py-1 px-2">
              <ScrollArea className="h-24">
                {status.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-2 text-center">
                    <Check className="h-5 w-5 text-green-500 mb-1" />
                    <p className="text-xs text-muted-foreground">No changes detected</p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {status.filter(file => file.stage !== 2).map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between py-1 px-2 rounded-sm hover:bg-muted text-xs"
                      >
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <div title={getStatusText(file)}>{getStatusIcon(file)}</div>
                          <span className="font-mono truncate">{file.file}</span>
                          <Badge variant="outline" className="text-[10px] py-0 h-4">
                            {getStatusText(file)}
                          </Badge>
                        </div>
                        <div className="flex">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => addFile(file.file)}
                            disabled={isLoading}
                            title="Stage File"
                            className="h-5 w-5 p-0"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Staged Changes */}
          <Card className="shadow-none border">
            <CardHeader className="py-1.5 px-3">
              <CardTitle className="text-xs font-medium">Staged Changes</CardTitle>
            </CardHeader>
            <CardContent className="py-1 px-2">
              <ScrollArea className="h-24">
                {status.filter(file => file.stage === 2).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-2 text-center">
                    <p className="text-xs text-muted-foreground">No staged changes</p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {status.filter(file => file.stage === 2).map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between py-1 px-2 rounded-sm hover:bg-muted text-xs"
                      >
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <div title="Staged">{getStatusIcon(file)}</div>
                          <span className="font-mono truncate">{file.file}</span>
                          <Badge variant="outline" className="text-[10px] py-0 h-4 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                            Staged
                          </Badge>
                        </div>
                        <div className="flex">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => unstageFile(file.file)}
                            disabled={isLoading}
                            title="Unstage File"
                            className="h-5 w-5 p-0"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Commit Section */}
          <Card className="shadow-none border">
            <CardHeader className="py-1.5 px-3">
              <CardTitle className="text-xs font-medium">Commit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 py-1 px-2">
              <div className="space-y-1">
                <Label htmlFor="commit-message" className="text-xs">Commit Message</Label>
                <Textarea
                  id="commit-message"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="Enter commit message..."
                  rows={2}
                  className="text-xs min-h-[60px]"
                />
              </div>
              <Button
                onClick={handleCommit}
                disabled={isLoading || !commitMessage.trim() || status.filter(file => file.stage === 2).length === 0}
                className="w-full h-7 text-xs"
              >
                {isLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                <GitCommit className="h-3 w-3 mr-1" />
                Commit Changes
              </Button>
              {status.filter(file => file.stage === 2).length === 0 && (
                <p className="text-[10px] text-center text-muted-foreground">
                  Stage changes before committing
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branches" className="space-y-2 mt-2">
          <Card className="shadow-none border">
            <CardHeader className="py-1.5 px-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-medium">Branches</CardTitle>
                <Dialog open={showBranchDialog} onOpenChange={setShowBranchDialog}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <Plus className="h-3 w-3" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-xs">
                    <DialogHeader>
                      <DialogTitle className="text-sm">Create New Branch</DialogTitle>
                      <DialogDescription className="text-xs">Enter a name for the new branch.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                      <div>
                        <Label htmlFor="branch-name" className="text-xs">Branch Name</Label>
                        <Input
                          id="branch-name"
                          value={newBranchName}
                          onChange={(e) => setNewBranchName(e.target.value)}
                          placeholder="feature/new-feature"
                          className="h-7 text-xs"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowBranchDialog(false)} className="h-7 text-xs">
                        Cancel
                      </Button>
                      <Button onClick={handleCreateBranch} disabled={isLoading} className="h-7 text-xs">
                        {isLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                        Create
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="py-1 px-2">
              {branches.length === 0 ? (
                <div className="text-center py-4 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    No branches found. Create an initial commit first.
                  </p>
                  <Button
                    onClick={async () => {
                      if (!config.user.name || !config.user.email) {
                        toast.error('Please configure your Git user name and email first');
                        return;
                      }
                      try {
                        await createInitialCommit();
                        toast.success('Initial commit created successfully');
                      } catch (err) {
                        toast.error('Failed to create initial commit');
                      }
                    }}
                    disabled={isLoading || !config.user.name || !config.user.email}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                  >
                    {isLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                    <GitCommit className="h-3 w-3 mr-1" />
                    Create Initial Commit
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {/* Branch List */}
                  <div>
                    <h4 className="text-xs font-medium mb-1">Branch List</h4>
                    <ScrollArea className="h-24">
                      <div className="space-y-0.5">
                        {branches.map((branch) => (
                          <div
                            key={branch.name}
                            className="flex items-center justify-between py-1 px-2 rounded-sm hover:bg-muted text-xs"
                          >
                            <div className="flex items-center gap-1.5">
                              <GitBranch className="h-3 w-3" />
                              <span className={`font-mono truncate ${branch.current ? 'font-bold' : ''}`}>
                                {branch.name}
                              </span>
                              {branch.current && <Badge variant="default" className="text-[10px] py-0 h-4">Current</Badge>}
                            </div>
                            <div className="flex gap-0.5">
                              {!branch.current && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleSwitchBranch(branch.name)}
                                  disabled={isLoading}
                                  title="Switch to this branch"
                                  className="h-5 w-5"
                                >
                                  <GitMerge className="h-3 w-3" />
                                </Button>
                              )}
                              {!branch.current && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    if (window.confirm(`Are you sure you want to delete the branch "${branch.name}"?`)) {
                                      deleteBranch(branch.name);
                                    }
                                  }}
                                  disabled={isLoading}
                                  title="Delete this branch"
                                  className="h-5 w-5 text-red-500 hover:text-red-600"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Branch Visualization */}
                  <div className="mt-2">
                    <h4 className="text-xs font-medium mb-1">Branch Visualization</h4>
                    <div className="border rounded-sm h-48">
                      <GitBranchVisualizer />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

        </TabsContent>

        <TabsContent value="history" className="space-y-2 mt-2">
          <Card className="shadow-none border">
            <CardHeader className="py-1.5 px-3">
              <CardTitle className="text-xs font-medium">Commit History</CardTitle>
            </CardHeader>
            <CardContent className="py-1 px-2">
              <ScrollArea className="h-[calc(100vh-220px)] min-h-[200px]">
                <div className="space-y-1.5">
                  {commits.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">No commits yet</p>
                  ) : (
                    commits.map((commit) => (
                      <div key={commit.oid} className="border-l border-muted pl-2 pb-1.5 text-xs">
                        <div className="flex items-start justify-between">
                          <div className="space-y-0.5">
                            <p className="font-medium truncate">{commit.message}</p>
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <span className="truncate max-w-[80px]">{commit.author.name}</span>
                              <span>•</span>
                              <span>
                                {new Date(commit.author.timestamp * 1000).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <Badge variant="outline" className="font-mono text-[10px] py-0 h-4">
                            {commit.oid.substring(0, 7)}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Configuration Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-sm">Git Configuration</DialogTitle>
            <DialogDescription className="text-xs">Configure your git user information.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div>
              <Label htmlFor="user-name" className="text-xs">Name</Label>
              <Input
                id="user-name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Your Name"
                className="h-7 text-xs"
              />
            </div>
            <div>
              <Label htmlFor="user-email" className="text-xs">Email</Label>
              <Input
                id="user-email"
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="h-7 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigDialog(false)} className="h-7 text-xs">
              Cancel
            </Button>
            <Button onClick={handleSaveConfig} className="h-7 text-xs">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default GitPanel;
