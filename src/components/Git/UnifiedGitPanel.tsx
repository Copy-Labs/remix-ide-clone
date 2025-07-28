import React, { useEffect, useState } from 'react';
import { useGitStore } from '@/stores/gitStore';
import { useFileStore } from '@/stores/fileStore';
import { usePluginStore } from '@/stores/pluginStore';
import { GitPluginImplementation } from '@/plugins/gitPlugin';
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
import GitBranchVisualizer from './GitBranchVisualizer';
import { GitErrorBanner } from './GitErrorBanner';

interface UnifiedGitPanelProps {
  pluginId?: string; // Optional plugin ID for plugin mode
}

const UnifiedGitPanel: React.FC<UnifiedGitPanelProps> = ({ pluginId }) => {
  // Get store functions
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

  const { files } = useFileStore();
  const { getPlugin, updatePluginConfig } = usePluginStore();

  // Plugin implementation (for plugin mode)
  const [implementation, setImplementation] = useState<GitPluginImplementation | null>(null);

  // Local state for forms
  const [commitMessage, setCommitMessage] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [userName, setUserName] = useState(config.user.name);
  const [userEmail, setUserEmail] = useState(config.user.email);
  const [remoteUrl, setRemoteUrl] = useState('');
  const [remoteName, setRemoteName] = useState('origin');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  // Dialog states
  const [showBranchDialog, setShowBranchDialog] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showRemoteDialog, setShowRemoteDialog] = useState(false);

  // Determine if we're in plugin mode
  const isPluginMode = !!pluginId;

  // Initialize plugin implementation if in plugin mode
  useEffect(() => {
    if (isPluginMode && pluginId) {
      const plugin = getPlugin(pluginId);
      if (plugin) {
        const impl = new GitPluginImplementation(plugin.config);
        setImplementation(impl);

        // Load initial values from config
        setRemoteUrl(plugin.config.remoteUrl || '');
        setUserName(plugin.config.username || config.user.name);
        setUserEmail(plugin.config.email || config.user.email);
      }
    }
  }, [pluginId, getPlugin, isPluginMode, config.user.name, config.user.email]);

  // Effect to load data when initialized changes
  useEffect(() => {
    if (isInitialized) {
      getBranches();
      getCommits();
      getStatus();
    }
  }, [isInitialized]);

  // Effect to ensure branches are loaded on component mount
  useEffect(() => {
    if (isInitialized) {
      getBranches();
    }
  }, []);

  const handleInitRepository = async () => {
    try {
      if (isPluginMode && implementation) {
        await implementation.initRepository();
      } else {
        await initRepository();
      }
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
      if (isPluginMode && implementation) {
        await implementation.createBranch(newBranchName);
        await implementation.switchBranch(newBranchName);
      } else {
        await createBranch(newBranchName);
      }
      setShowBranchDialog(false);
      setNewBranchName('');
      toast.success(`Branch '${newBranchName}' created successfully`);
    } catch (err) {
      toast.error('Failed to create branch');
    }
  };

  const handleSwitchBranch = async (branchName: string) => {
    try {
      if (isPluginMode && implementation) {
        await implementation.switchBranch(branchName);
      } else {
        await switchBranch(branchName);
      }
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
      if (isPluginMode && implementation) {
        await implementation.commit(commitMessage);
      } else {
        await commit(commitMessage);
      }
      setCommitMessage('');
      toast.success('Changes committed successfully');
    } catch (err) {
      toast.error('Failed to commit changes');
    }
  };

  const handlePush = async () => {
    if (!isPluginMode || !implementation) {
      toast.error('Push functionality is only available in plugin mode');
      return;
    }

    try {
      await implementation.push(remoteName, currentBranch);
      toast.success('Changes pushed successfully');
    } catch (err) {
      toast.error('Failed to push changes');
    }
  };

  const handlePull = async () => {
    if (!isPluginMode || !implementation) {
      toast.error('Pull functionality is only available in plugin mode');
      return;
    }

    try {
      await implementation.pull(remoteName, currentBranch);
      toast.success('Changes pulled successfully');
    } catch (err) {
      toast.error('Failed to pull changes');
    }
  };

  const handleSaveConfig = () => {
    setConfig({
      user: {
        name: userName,
        email: userEmail,
      },
    });

    // If in plugin mode, also update plugin config
    if (isPluginMode && pluginId) {
      const plugin = getPlugin(pluginId);
      if (plugin) {
        updatePluginConfig(pluginId, {
          ...plugin.config,
          username: userName,
          email: userEmail,
        });
      }
    }

    setShowConfigDialog(false);
    toast.success('Configuration saved');
  };

  const handleSaveRemote = () => {
    if (isPluginMode && implementation && pluginId) {
      implementation.configureRemote(remoteUrl, remoteName);

      // Update plugin config
      const plugin = getPlugin(pluginId);
      if (plugin) {
        updatePluginConfig(pluginId, {
          ...plugin.config,
          remoteUrl,
          remoteName,
        });
      }

      toast.success('Remote configuration saved');
    } else {
      // For non-plugin mode, we would need to implement this in gitStore
      toast.error('Remote configuration is only available in plugin mode');
    }

    setShowRemoteDialog(false);
  };

  const handleResetGitIndex = async () => {
    try {
      await resetGitIndex();
      toast.success('Git index has been reset successfully');
    } catch (err) {
      toast.error('Failed to reset Git index');
    }
  };

  // Toggle file selection for plugin mode
  const toggleFileSelection = (filePath: string) => {
    setSelectedFiles((prev) =>
      prev.includes(filePath) ? prev.filter((path) => path !== filePath) : [...prev, filePath],
    );
  };

  // Handle adding selected files in plugin mode
  const handleAddSelectedFiles = async () => {
    if (!isPluginMode || !implementation || selectedFiles.length === 0) return;

    try {
      await implementation.addFiles(selectedFiles);
      setSelectedFiles([]);
      toast.success('Files added successfully');
    } catch (err) {
      toast.error('Failed to add files');
    }
  };

  const getStatusIcon = (file: any) => {
    const { head, workdir, stage } = file;

    if (head === 1 && workdir === 2 && stage === 0)
      return <AlertCircle className="h-4 w-4 text-orange-500" />; // Modified
    if (head === 0 && workdir === 2 && stage === 0)
      return <Plus className="h-4 w-4 text-green-500" />; // New
    if (head === 1 && workdir === 0 && stage === 0)
      return <Trash2 className="h-4 w-4 text-red-500" />; // Deleted
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
            <Button
              onClick={handleInitRepository}
              disabled={isLoading}
              className="w-full h-7 text-xs"
            >
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
          {currentBranch && (
            <Badge variant="secondary" className="text-xs py-0 h-5">
              {currentBranch}
            </Badge>
          )}
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowConfigDialog(true)}
            className="h-7 w-7"
          >
            <Settings className="h-3.5 w-3.5" />
          </Button>
          {isPluginMode && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowRemoteDialog(true)}
              className="h-7 w-7"
            >
              <Github className="h-3.5 w-3.5" />
            </Button>
          )}
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
        <TabsList className="grid w-full grid-cols-4 h-8">
          <TabsTrigger value="changes" className="text-xs py-1">
            Changes
          </TabsTrigger>
          <TabsTrigger value="branches" className="text-xs py-1">
            Branches
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs py-1">
            History
          </TabsTrigger>
          {isPluginMode && (
            <TabsTrigger value="remote" className="text-xs py-1">
              Remote
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="changes" className="space-y-2 mt-2">
          {/* Unstaged Changes */}
          <Card className="shadow-none border-0 p-0 gap-0">
            <CardHeader className="py-2 px-3">
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
            <CardContent className="px-2">
              <ScrollArea className="h-24">
                {status.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-2 text-center">
                    <Check className="h-5 w-5 text-green-500 mb-1" />
                    <p className="text-xs text-muted-foreground">No changes detected</p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {status
                      .filter((file) => file.stage !== 2)
                      .map((file, index) => (
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

          <Separator />

          {/* Staged Changes */}
          <Card className="shadow-none border-0 p-0 gap-0">
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-xs font-medium">Staged Changes</CardTitle>
            </CardHeader>
            <CardContent className="px-2">
              <ScrollArea className="h-64">
                {status.filter((file) => file.stage === 2).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-2 text-center">
                    <p className="text-xs text-muted-foreground">No staged changes</p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {status
                      .filter((file) => file.stage === 2)
                      .map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between py-1 px-2 rounded-sm hover:bg-muted text-xs"
                        >
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            <div title="Staged">{getStatusIcon(file)}</div>
                            <span className="font-mono truncate">{file.file}</span>
                            <Badge
                              variant="outline"
                              className="text-[10px] py-0 h-4 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                            >
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

          <Separator />

          {/* Commit Section */}
          <Card className="shadow-none border-0 p-0 gap-0 mt-4">
            <CardContent className="space-y-2 px-2">
              <div className="space-y-2">
                <Label htmlFor="commit-message" className="text-xs">
                  Commit Message
                </Label>
                <Textarea
                  id="commit-message"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="Enter commit message..."
                  rows={2}
                  className="text-xs min-h-[80px] resize-none"
                />
              </div>
              <Button
                onClick={handleCommit}
                disabled={
                  isLoading ||
                  !commitMessage.trim() ||
                  status.filter((file) => file.stage === 2).length === 0
                }
                className="w-full h-7 text-xs"
              >
                {isLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                <GitCommit className="h-3 w-3 mr-1" />
                Commit Changes
              </Button>
              {status.filter((file) => file.stage === 2).length === 0 && (
                <p className="text-[10px] text-center text-muted-foreground">
                  Stage changes before committing
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branches" className="space-y-2 mt-2">
          <Card className="shadow-none border-0 py-0 gap-0">
            <CardHeader className="px-3">
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
                      <DialogDescription className="text-xs">
                        Enter a name for the new branch.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                      <div>
                        <Label htmlFor="branch-name" className="text-xs">
                          Branch Name
                        </Label>
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
                      <Button
                        variant="outline"
                        onClick={() => setShowBranchDialog(false)}
                        className="h-7 text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateBranch}
                        disabled={isLoading}
                        className="h-7 text-xs"
                      >
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
                    <ScrollArea className="h-96">
                      <div className="space-y-0.5">
                        {branches.map((branch) => (
                          <div
                            key={branch.name}
                            className="flex items-center justify-between py-1 px-2 rounded-sm hover:bg-muted text-xs"
                          >
                            <div className="flex items-center gap-1.5">
                              <GitBranch className="h-3 w-3" />
                              <span
                                className={`font-mono truncate ${branch.current ? 'font-bold' : ''}`}
                              >
                                {branch.name}
                              </span>
                              {branch.current && (
                                <Badge variant="default" className="text-[10px] py-0 h-4">
                                  Current
                                </Badge>
                              )}
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
                                    if (
                                      window.confirm(
                                        `Are you sure you want to delete the branch "${branch.name}"?`,
                                      )
                                    ) {
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

                  <Separator />

                  {/* Branch Visualization */}
                  <div className="mt-2">
                    <div className="rounded-sm h-48">
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

        {isPluginMode && (
          <TabsContent value="remote" className="space-y-2 mt-2">
            <Card className="shadow-none border">
              <CardHeader className="py-1.5 px-3">
                <CardTitle className="text-xs font-medium">Remote Operations</CardTitle>
              </CardHeader>
              <CardContent className="py-2 px-3 space-y-4">
                <div className="flex flex-col gap-2">
                  <Label className="text-xs">Remote Repository</Label>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium">URL:</span>
                    <span className="truncate flex-1">{remoteUrl || 'Not configured'}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setShowRemoteDialog(true)}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      Configure Remote
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="flex flex-col gap-2">
                  <Label className="text-xs">Push & Pull</Label>
                  <div className="flex gap-2">
                    <Button
                      onClick={handlePush}
                      disabled={isLoading || !remoteUrl}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                    >
                      {isLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Upload className="h-3 w-3 mr-1" />
                      )}
                      Push
                    </Button>
                    <Button
                      onClick={handlePull}
                      disabled={isLoading || !remoteUrl}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                    >
                      {isLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Download className="h-3 w-3 mr-1" />
                      )}
                      Pull
                    </Button>
                  </div>
                </div>

                {/* File Selection for Plugin Mode */}
                {isPluginMode && (
                  <>
                    <Separator />
                    <div className="flex flex-col gap-2">
                      <Label className="text-xs">File Selection</Label>
                      <ScrollArea className="h-40 border rounded-sm p-2">
                        {Array.from(files.entries())
                          .filter(([_, file]) => file.type === 'file')
                          .map(([path, file]) => (
                            <div key={path} className="flex items-center py-1 text-xs">
                              <input
                                type="checkbox"
                                id={`file-${path}`}
                                checked={selectedFiles.includes(path)}
                                onChange={() => toggleFileSelection(path)}
                                className="mr-2 h-3 w-3"
                              />
                              <label htmlFor={`file-${path}`} className="truncate">
                                {path}
                              </label>
                            </div>
                          ))}
                      </ScrollArea>
                      <Button
                        onClick={handleAddSelectedFiles}
                        disabled={isLoading || selectedFiles.length === 0}
                        size="sm"
                        className="h-7 text-xs"
                      >
                        {isLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <Plus className="h-3 w-3 mr-1" />
                        )}
                        Add Selected Files
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Configuration Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-sm">Git Configuration</DialogTitle>
            <DialogDescription className="text-xs">
              Configure your git user information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className={'space-y-2'}>
              <Label htmlFor="user-name" className="text-xs">
                Name
              </Label>
              <Input
                id="user-name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Your Name"
                className="text-xs"
              />
            </div>
            <div className={'space-y-2'}>
              <Label htmlFor="user-email" className="text-xs">
                Email
              </Label>
              <Input
                id="user-email"
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfigDialog(false)}
              className="h-7 text-xs"
            >
              Cancel
            </Button>
            <Button onClick={handleSaveConfig} className="h-7 text-xs">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remote Configuration Dialog */}
      <Dialog open={showRemoteDialog} onOpenChange={setShowRemoteDialog}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-sm">Remote Repository</DialogTitle>
            <DialogDescription className="text-xs">
              Configure your remote repository.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className={'space-y-2'}>
              <Label htmlFor="remote-name" className="text-xs">
                Remote Name
              </Label>
              <Input
                id="remote-name"
                value={remoteName}
                onChange={(e) => setRemoteName(e.target.value)}
                placeholder="origin"
                className="text-xs"
              />
            </div>
            <div className={'space-y-2'}>
              <Label htmlFor="remote-url" className="text-xs">
                Remote URL
              </Label>
              <Input
                id="remote-url"
                value={remoteUrl}
                onChange={(e) => setRemoteUrl(e.target.value)}
                placeholder="https://github.com/username/repo.git"
                className="text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRemoteDialog(false)}
              className="h-7 text-xs"
            >
              Cancel
            </Button>
            <Button onClick={handleSaveRemote} className="h-7 text-xs">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UnifiedGitPanel;
