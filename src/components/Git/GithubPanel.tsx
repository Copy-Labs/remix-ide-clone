import React, { useState } from 'react';
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
  Copy,
  ExternalLink,
  Github,
  GitBranch,
  GitFork,
  Key,
  Loader2,
  Lock,
  LogOut,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
  Unlock,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { GitErrorBanner } from './GitErrorBanner';

const GithubPanel: React.FC = () => {
  const {
    // State
    config,
    isGithubConnected,
    githubRepos,
    isLoading,
    error,
    githubRepoPagination,

    // Actions
    connectGithub,
    disconnectGithub,
    getGithubRepos,
    loadMoreGithubRepos,
    createGithubRepo,
    setError,
  } = useGitStore();

  // Local state for forms
  const [githubToken, setGithubToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoDescription, setNewRepoDescription] = useState('');
  const [newRepoPrivate, setNewRepoPrivate] = useState(false);

  // Dialog states
  const [showCreateRepoDialog, setShowCreateRepoDialog] = useState(false);

  const handleConnect = async () => {
    if (!githubToken.trim()) {
      toast.error('Please enter a GitHub token');
      return;
    }

    try {
      await connectGithub(githubToken);
      toast.success('Connected to GitHub successfully');
      setGithubToken('');
    } catch (err) {
      toast.error('Failed to connect to GitHub');
    }
  };

  const handleDisconnect = () => {
    disconnectGithub();
    toast.success('Disconnected from GitHub');
  };

  const handleCreateRepo = async () => {
    if (!newRepoName.trim()) {
      toast.error('Please enter a repository name');
      return;
    }

    try {
      await createGithubRepo(newRepoName, {
        description: newRepoDescription,
        private: newRepoPrivate,
      });
      setShowCreateRepoDialog(false);
      setNewRepoName('');
      setNewRepoDescription('');
      setNewRepoPrivate(false);
      toast.success(`Repository '${newRepoName}' created successfully`);
    } catch (err) {
      toast.error('Failed to create repository');
    }
  };

  const handleRefreshRepos = async () => {
    try {
      await getGithubRepos({ resetPagination: true });
      toast.success('Repositories refreshed');
    } catch (err) {
      toast.error('Failed to refresh repositories');
    }
  };

  const handleLoadMoreRepos = async () => {
    try {
      await loadMoreGithubRepos();
    } catch (err) {
      toast.error('Failed to load more repositories');
    }
  };

  if (!isGithubConnected) {
    return (
      <div className="p-2 space-y-2">
        <Card className="shadow-none border">
          <CardHeader className="py-1.5 px-3">
            <CardTitle className="flex items-center gap-1.5 text-xs font-medium">
              <Github className="h-4 w-4" />
              GitHub Integration
            </CardTitle>
            <CardDescription className="text-xs">
              Connect to GitHub to access your repositories.
            </CardDescription>
          </CardHeader>
          <CardContent className="py-1 px-2 space-y-2">
            <div className="space-y-2">
              <div className="space-y-1">
                <Label htmlFor="github-token" className="text-xs">Personal Access Token</Label>
                <div className="flex">
                  <Input
                    id="github-token"
                    type={showToken ? 'text' : 'password'}
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="ghp_..."
                    className="text-xs h-7 flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowToken(!showToken)}
                    className="h-7 w-7 ml-1"
                  >
                    {showToken ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Create a token with 'repo' scope at{' '}
                  <a
                    href="https://github.com/settings/tokens/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline inline-flex items-center"
                  >
                    GitHub <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
                  </a>
                </p>
              </div>
              <Button onClick={handleConnect} disabled={isLoading || !githubToken.trim()} className="w-full h-7 text-xs">
                {isLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Github className="h-3 w-3 mr-1" />}
                Connect to GitHub
              </Button>
            </div>
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
          <Github className="h-4 w-4" />
          <span className="font-medium text-sm">GitHub</span>
          {config.github.username && (
            <Badge variant="secondary" className="text-xs py-0 h-5">{config.github.username}</Badge>
          )}
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefreshRepos}
            disabled={isLoading}
            className="h-7 w-7"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDisconnect}
            disabled={isLoading}
            className="h-7 w-7 text-red-500 hover:text-red-600"
          >
            <LogOut className="h-3.5 w-3.5" />
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

      <Card className="shadow-none border-0 p-0 gap-0">
        <CardHeader className="py-2 px-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-medium">Repositories</CardTitle>
            <Dialog open={showCreateRepoDialog} onOpenChange={setShowCreateRepoDialog}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Plus className="h-3 w-3" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xs">
                <DialogHeader>
                  <DialogTitle className="text-sm">Create New Repository</DialogTitle>
                  <DialogDescription className="text-xs">Create a new GitHub repository.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="repo-name" className="text-xs">Repository Name</Label>
                    <Input
                      id="repo-name"
                      value={newRepoName}
                      onChange={(e) => setNewRepoName(e.target.value)}
                      placeholder="my-new-repo"
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="repo-description" className="text-xs">Description (optional)</Label>
                    <Textarea
                      id="repo-description"
                      value={newRepoDescription}
                      onChange={(e) => setNewRepoDescription(e.target.value)}
                      placeholder="Repository description..."
                      className="text-xs min-h-[60px] resize-none"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="repo-private"
                      checked={newRepoPrivate}
                      onCheckedChange={setNewRepoPrivate}
                    />
                    <Label htmlFor="repo-private" className="text-xs">Private Repository</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateRepoDialog(false)} className="h-7 text-xs">
                    Cancel
                  </Button>
                  <Button onClick={handleCreateRepo} disabled={isLoading || !newRepoName.trim()} className="h-7 text-xs">
                    {isLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="px-2">
          <ScrollArea className="h-[calc(100vh-220px)] min-h-[200px]">
            {githubRepos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-4 text-center">
                <p className="text-xs text-muted-foreground">No repositories found</p>
                <Button
                  onClick={() => setShowCreateRepoDialog(true)}
                  variant="outline"
                  size="sm"
                  className="mt-2 h-7 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Create Repository
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {githubRepos.map((repo: any) => (
                  <Card key={repo.id} className="shadow-sm border p-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-medium text-xs">{repo.name}</h3>
                          {repo.private ? (
                            <Badge variant="outline" className="text-[10px] py-0 h-4 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                              Private
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] py-0 h-4 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                              Public
                            </Badge>
                          )}
                        </div>
                        {repo.description && (
                          <p className="text-[10px] text-muted-foreground">{repo.description}</p>
                        )}
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          {repo.language && (
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                              {repo.language}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <GitFork className="h-3 w-3" />
                            {repo.forks_count || 0}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            navigator.clipboard.writeText(repo.clone_url);
                            toast.success('Clone URL copied to clipboard');
                          }}
                          className="h-6 w-6"
                          title="Copy clone URL"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(repo.html_url, '_blank')}
                          className="h-6 w-6"
                          title="Open in GitHub"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}

                {/* Pagination */}
                {githubRepoPagination?.hasNextPage && (
                  <div className="flex justify-center mt-4">
                    <Button
                      onClick={handleLoadMoreRepos}
                      disabled={isLoading}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                    >
                      {isLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                      Load More Repositories
                    </Button>
                  </div>
                )}

                {/* Pagination info */}
                {githubRepos.length > 0 && (
                  <div className="text-center text-[10px] text-muted-foreground mt-1">
                    Showing {githubRepos.length} of {githubRepoPagination?.totalCount || githubRepos.length} repositories
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default GithubPanel;
