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
import GitAuthManager from './GitAuthManager';
import { GitErrorBanner } from './GitErrorBanner';

const GitPanel: React.FC = () => {
  const {
    // State
    isInitialized,
    currentBranch,
    branches,
    remotes,
    commits,
    status,
    config,
    isLoading,
    error,
    githubRepos,
    isGithubConnected,

    // Actions
    initRepository,
    cloneRepository,
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
    addRemote,
    removeRemote,
    push,
    pull,
    fetch,
    getStatus,
    setConfig,
    connectGithub,
    disconnectGithub,
    getGithubRepos,
    createGithubRepo,
    setError,
    resetGitIndex,
  } = useGitStore();

  // Local state for forms
  const [commitMessage, setCommitMessage] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [cloneUrl, setCloneUrl] = useState('');
  const [remoteName, setRemoteName] = useState('');
  const [remoteUrl, setRemoteUrl] = useState('');
  const [forceRemote, setForceRemote] = useState(false);
  const [githubToken, setGithubToken] = useState('');
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoDescription, setNewRepoDescription] = useState('');
  const [userName, setUserName] = useState(config.user.name);
  const [userEmail, setUserEmail] = useState(config.user.email);

  // Dialog states
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [showBranchDialog, setShowBranchDialog] = useState(false);
  const [showRemoteDialog, setShowRemoteDialog] = useState(false);
  // const [showGithubDialog, setShowGithubDialog] = useState(false); // Replaced by GitAuthManager
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showCreateRepoDialog, setShowCreateRepoDialog] = useState(false);

  useEffect(() => {
    if (isInitialized) {
      getBranches();
      getCommits();
      getStatus();
    }
  }, [isInitialized]);

  useEffect(() => {
    if (isGithubConnected) {
      getGithubRepos();
    }
  }, [isGithubConnected]);

  const handleInitRepository = async () => {
    try {
      await initRepository();
      toast.success('Repository initialized successfully');
    } catch (err) {
      toast.error('Failed to initialize repository');
    }
  };

  const handleCloneRepository = async () => {
    if (!cloneUrl.trim()) {
      toast.error('Please enter a repository URL');
      return;
    }

    try {
      await cloneRepository(cloneUrl);
      setShowCloneDialog(false);
      setCloneUrl('');
      toast.success('Repository cloned successfully');
    } catch (err) {
      toast.error('Failed to clone repository');
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

  const handleAddRemote = async () => {
    if (!remoteName.trim() || !remoteUrl.trim()) {
      toast.error('Please enter both remote name and URL');
      return;
    }

    try {
      await addRemote(remoteName, remoteUrl, forceRemote);
      setShowRemoteDialog(false);
      setRemoteName('');
      setRemoteUrl('');
      setForceRemote(false);
      toast.success(`Remote '${remoteName}' added successfully`);
    } catch (err) {
      toast.error('Failed to add remote');
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

  const handleCreateGithubRepo = async () => {
    if (!newRepoName.trim()) {
      toast.error('Please enter a repository name');
      return;
    }

    try {
      await createGithubRepo(newRepoName, newRepoDescription);
      setShowCreateRepoDialog(false);
      setNewRepoName('');
      setNewRepoDescription('');
      toast.success(`Repository '${newRepoName}' created on GitHub`);
    } catch (err) {
      toast.error('Failed to create GitHub repository');
    }
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
      <div className="p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Git Integration
            </CardTitle>
            <CardDescription>
              Initialize a git repository or clone an existing one to get started.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleInitRepository} disabled={isLoading} className="w-full">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Initialize Repository
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="size-8 leading-8 text-xs text-center bg-card text-muted-foreground rounded-full">Or</span>
              </div>
            </div>

            <Dialog open={showCloneDialog} onOpenChange={setShowCloneDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Clone Repository
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Clone Repository</DialogTitle>
                  <DialogDescription>
                    Enter the URL of the repository you want to clone.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className={"space-y-2"}>
                    <Label htmlFor="clone-url">Repository URL</Label>
                    <Input
                      id="clone-url"
                      value={cloneUrl}
                      onChange={(e) => setCloneUrl(e.target.value)}
                      placeholder="https://github.com/user/repo.git"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCloneDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCloneRepository} disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Clone
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <GitErrorBanner error={error} />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          <span className="font-medium">Git</span>
          {currentBranch && <Badge variant="secondary">{currentBranch}</Badge>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowConfigDialog(true)}>
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetGitIndex}
            disabled={isLoading}
            title="Reset Git Index"
          >
            <AlertCircle className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              getBranches();
              getCommits();
              getStatus();
            }}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <GitErrorBanner error={error} />

      <Tabs defaultValue="changes" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="changes">Changes</TabsTrigger>
          <TabsTrigger value="branches">Branches</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="auth">Authentication</TabsTrigger>
        </TabsList>

        <TabsContent value="changes" className="space-y-4">
          {/* Unstaged Changes */}
          <Card>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Unstaged Changes</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addAllFiles}
                    disabled={isLoading}
                    title="Stage All Changes"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Stage All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={getStatus}
                    disabled={isLoading}
                    title="Refresh Status"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="py-2">
              <ScrollArea className="h-32">
                {status.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-4 text-center">
                    <Check className="h-8 w-8 text-green-500 mb-2" />
                    <p className="text-sm text-muted-foreground">No changes detected</p>
                    <p className="text-xs text-muted-foreground mt-1">Working tree is clean</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {status.filter(file => file.stage !== 2).map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-muted text-sm"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div title={getStatusText(file)}>{getStatusIcon(file)}</div>
                          <span className="font-mono truncate">{file.file}</span>
                          <Badge variant="outline" className="text-xs">
                            {getStatusText(file)}
                          </Badge>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => addFile(file.file)}
                            disabled={isLoading}
                            title="Stage File"
                            className="h-7 w-7 p-0"
                          >
                            <Plus className="h-3.5 w-3.5" />
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
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Staged Changes</CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <ScrollArea className="h-32">
                {status.filter(file => file.stage === 2).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-4 text-center">
                    <p className="text-sm text-muted-foreground">No staged changes</p>
                    <p className="text-xs text-muted-foreground mt-1">Stage changes before committing</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {status.filter(file => file.stage === 2).map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-muted text-sm"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div title="Staged">{getStatusIcon(file)}</div>
                          <span className="font-mono truncate">{file.file}</span>
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                            Staged
                          </Badge>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => unstageFile(file.file)}
                            disabled={isLoading}
                            title="Unstage File"
                            className="h-7 w-7 p-0"
                          >
                            <Minus className="h-3.5 w-3.5" />
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
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Commit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 py-2">
              <div className="space-y-2">
                <Label htmlFor="commit-message">Commit Message</Label>
                <Textarea
                  id="commit-message"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="Enter commit message..."
                  rows={3}
                />
              </div>
              <Button
                onClick={handleCommit}
                disabled={isLoading || !commitMessage.trim() || status.filter(file => file.stage === 2).length === 0}
                className="w-full"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                <GitCommit className="h-4 w-4 mr-2" />
                Commit Changes
              </Button>
              {status.filter(file => file.stage === 2).length === 0 && (
                <p className="text-xs text-center text-muted-foreground">
                  Stage changes before committing
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branches" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Branches</CardTitle>
                <Dialog open={showBranchDialog} onOpenChange={setShowBranchDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      New Branch
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Branch</DialogTitle>
                      <DialogDescription>Enter a name for the new branch.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="branch-name">Branch Name</Label>
                        <Input
                          id="branch-name"
                          value={newBranchName}
                          onChange={(e) => setNewBranchName(e.target.value)}
                          placeholder="feature/new-feature"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowBranchDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateBranch} disabled={isLoading}>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Create Branch
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {branches.length === 0 ? (
                <div className="text-center py-8 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    No branches found. Create an initial commit to establish the main branch.
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
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    <GitCommit className="h-4 w-4 mr-2" />
                    Create Initial Commit
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Branch List */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Branch List</h4>
                    <ScrollArea className="h-32">
                      <div className="space-y-2">
                        {branches.map((branch) => (
                          <div
                            key={branch.name}
                            className="flex items-center justify-between p-2 rounded-md hover:bg-muted"
                          >
                            <div className="flex items-center gap-2">
                              <GitBranch className="h-4 w-4" />
                              <span className={`font-mono ${branch.current ? 'font-bold' : ''}`}>
                                {branch.name}
                              </span>
                              {branch.current && <Badge variant="default">Current</Badge>}
                            </div>
                            <div className="flex gap-1">
                              {!branch.current && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSwitchBranch(branch.name)}
                                  disabled={isLoading}
                                  title="Switch to this branch"
                                  className="flex items-center gap-1"
                                >
                                  <GitMerge className="h-3 w-3" />
                                  <span className="hidden sm:inline">Switch</span>
                                </Button>
                              )}
                              {!branch.current && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (window.confirm(`Are you sure you want to delete the branch "${branch.name}"?`)) {
                                      deleteBranch(branch.name);
                                    }
                                  }}
                                  disabled={isLoading}
                                  title="Delete this branch"
                                  className="flex items-center gap-1 text-red-500 hover:text-red-600"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  <span className="hidden sm:inline">Delete</span>
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Branch Visualization */}
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Branch Visualization</h4>
                    <div className="border rounded-md h-96">
                      <GitBranchVisualizer />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Remotes</CardTitle>
                <Dialog open={showRemoteDialog} onOpenChange={setShowRemoteDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Remote
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Remote</DialogTitle>
                      <DialogDescription>Add a new remote repository.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="remote-name">Remote Name</Label>
                        <Input
                          id="remote-name"
                          value={remoteName}
                          onChange={(e) => setRemoteName(e.target.value)}
                          placeholder="origin"
                        />
                      </div>
                      <div>
                        <Label htmlFor="remote-url">Remote URL</Label>
                        <Input
                          id="remote-url"
                          value={remoteUrl}
                          onChange={(e) => setRemoteUrl(e.target.value)}
                          placeholder="https://github.com/user/repo.git"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="force-remote"
                          checked={forceRemote}
                          onCheckedChange={setForceRemote}
                        />
                        <Label htmlFor="force-remote">
                          Force (overwrite if remote already exists)
                        </Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowRemoteDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddRemote} disabled={isLoading}>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Add Remote
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {remotes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No remotes configured</p>
                ) : (
                  remotes.map((remote) => (
                    <div
                      key={remote.name}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-muted"
                    >
                      <div>
                        <div className="font-mono font-medium">{remote.name}</div>
                        <div className="text-xs text-muted-foreground">{remote.url}</div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => push(remote.name)}
                          disabled={isLoading}
                          title={`Push to ${remote.name}`}
                          className="flex items-center gap-1"
                        >
                          <Upload className="h-3 w-3" />
                          <span className="hidden sm:inline">Push</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => pull(remote.name)}
                          disabled={isLoading}
                          title={`Pull from ${remote.name}`}
                          className="flex items-center gap-1"
                        >
                          <Download className="h-3 w-3" />
                          <span className="hidden sm:inline">Pull</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to remove the remote "${remote.name}"?`)) {
                              removeRemote(remote.name);
                            }
                          }}
                          disabled={isLoading}
                          title={`Remove ${remote.name} remote`}
                          className="flex items-center gap-1 text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span className="hidden sm:inline">Remove</span>
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Commit History</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {commits.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No commits yet</p>
                  ) : (
                    commits.map((commit) => (
                      <div key={commit.oid} className="border-l-2 border-muted pl-4 pb-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-medium">{commit.message}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{commit.author.name}</span>
                              <span>•</span>
                              <span>
                                {new Date(commit.author.timestamp * 1000).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <Badge variant="outline" className="font-mono text-xs">
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

        <TabsContent value="auth" className="space-y-4">
          <GitAuthManager onAuthSuccess={() => {
            // Refresh data when authentication is successful
            getGithubRepos();
          }} />

          {/* GitHub Repositories (shown when connected) */}
          {isGithubConnected && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Github className="h-5 w-5" />
                    <CardTitle className="text-sm">GitHub Repositories</CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <Dialog open={showCreateRepoDialog} onOpenChange={setShowCreateRepoDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Create Repo
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create GitHub Repository</DialogTitle>
                          <DialogDescription>Create a new repository on GitHub.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className={'space-y-2'}>
                            <Label htmlFor="repo-name">Repository Name</Label>
                            <Input
                              id="repo-name"
                              value={newRepoName}
                              onChange={(e) => setNewRepoName(e.target.value)}
                              placeholder="my-awesome-project"
                            />
                          </div>
                          <div className={'space-y-2'}>
                            <Label htmlFor="repo-description">Description (Optional)</Label>
                            <Input
                              id="repo-description"
                              value={newRepoDescription}
                              onChange={(e) => setNewRepoDescription(e.target.value)}
                              placeholder="A brief description of your project"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setShowCreateRepoDialog(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleCreateGithubRepo} disabled={isLoading}>
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Create Repository
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Button variant="outline" size="sm" onClick={getGithubRepos}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {githubRepos.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No repositories found</p>
                    ) : (
                      githubRepos.map((repo: any) => (
                        <div key={repo.id} className="p-3 border rounded-md hover:bg-muted">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium">{repo.name}</h4>
                              {repo.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {repo.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                {repo.language && (
                                  <Badge variant="outline">{repo.language}</Badge>
                                )}
                                {repo.private && <Badge variant="secondary">Private</Badge>}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setCloneUrl(repo.clone_url);
                                setShowCloneDialog(true);
                              }}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Configuration Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Git Configuration</DialogTitle>
            <DialogDescription>Configure your git user information.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="user-name">Name</Label>
              <Input
                id="user-name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Your Name"
              />
            </div>
            <div>
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="your.email@example.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveConfig}>Save Configuration</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clone Repository Dialog */}
      <Dialog open={showCloneDialog} onOpenChange={setShowCloneDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clone Repository</DialogTitle>
            <DialogDescription>
              Enter the URL of the repository you want to clone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className={"space-y-2"}>
              <Label htmlFor="clone-url">Repository URL</Label>
              <Input
                id="clone-url"
                value={cloneUrl}
                onChange={(e) => setCloneUrl(e.target.value)}
                placeholder="https://github.com/user/repo.git"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloneDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCloneRepository} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Clone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GitPanel;
