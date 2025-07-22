import React, { useState } from 'react';
import { useGitStore } from '@/stores/gitStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Github, Gitlab, Key, Lock, LogIn } from 'lucide-react';
import { toast } from 'sonner';

// Custom GitlabIcon since it's not in lucide-react
const GitlabIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="lucide lucide-gitlab"
  >
    <path d="m22 13.29-3.33-10a.42.42 0 0 0-.14-.18.38.38 0 0 0-.22-.11.39.39 0 0 0-.23.07.42.42 0 0 0-.14.18l-2.26 6.67H8.32L6.1 3.26a.42.42 0 0 0-.1-.18.38.38 0 0 0-.26-.08.39.39 0 0 0-.23.07.42.42 0 0 0-.14.18L2 13.29a.74.74 0 0 0 .27.83L12 21l9.69-6.88a.71.71 0 0 0 .31-.83Z" />
  </svg>
);

interface GitAuthManagerProps {
  onAuthSuccess?: () => void;
}

const GitAuthManager: React.FC<GitAuthManagerProps> = ({ onAuthSuccess }) => {
  const {
    connectGithub,
    connectGitlab,
    connectWithToken,
    isGithubConnected,
    isGitlabConnected,
    isTokenConnected,
    disconnectGithub,
    disconnectGitlab,
    disconnectToken,
    config
  } = useGitStore();

  const [githubToken, setGithubToken] = useState('');
  const [githubCode, setGithubCode] = useState('');
  const [gitlabToken, setGitlabToken] = useState('');
  const [gitlabCode, setGitlabCode] = useState('');
  const [genericToken, setGenericToken] = useState('');
  const [tokenName, setTokenName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Handle GitHub OAuth flow
  const handleGithubOAuth = () => {
    // Show a warning about browser limitations
    toast.warning('GitHub OAuth integration is limited in browser environments');

    // In a real implementation, this would redirect to GitHub's OAuth page
    // For now, we'll simulate it with a code input
    window.open('https://github.com/login/oauth/authorize?client_id=YOUR_CLIENT_ID&scope=repo', '_blank');
  };

  // Handle GitHub token authentication
  const handleGithubTokenAuth = async () => {
    if (!githubToken.trim()) {
      toast.error('Please enter a GitHub token');
      return;
    }

    // Show a warning about browser limitations
    toast.warning('GitHub API integration is limited in browser environments. Using mock implementation.');

    setIsLoading(true);
    try {
      await connectGithub(githubToken);
      toast.success('Connected to GitHub successfully (browser-compatible mock)');
      setGithubToken('');
      if (onAuthSuccess) onAuthSuccess();
    } catch (err) {
      toast.error('Failed to connect to GitHub');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle GitHub OAuth code authentication
  const handleGithubCodeAuth = async () => {
    if (!githubCode.trim()) {
      toast.error('Please enter the OAuth code');
      return;
    }

    // Show a warning about browser limitations
    toast.warning('GitHub OAuth integration is limited in browser environments. Using mock implementation.');

    setIsLoading(true);
    try {
      // In a real implementation, this would exchange the code for a token
      // For now, we'll simulate it
      await connectGithub(`simulated_token_from_code_${githubCode}`);
      toast.success('Connected to GitHub successfully via OAuth (browser-compatible mock)');
      setGithubCode('');
      if (onAuthSuccess) onAuthSuccess();
    } catch (err) {
      toast.error('Failed to connect to GitHub via OAuth');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle GitLab OAuth flow
  const handleGitlabOAuth = () => {
    // Show a warning about browser limitations
    toast.warning('GitLab OAuth integration is limited in browser environments');

    // In a real implementation, this would redirect to GitLab's OAuth page
    window.open('https://gitlab.com/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&response_type=code&scope=api', '_blank');
  };

  // Handle GitLab token authentication
  const handleGitlabTokenAuth = async () => {
    if (!gitlabToken.trim()) {
      toast.error('Please enter a GitLab token');
      return;
    }

    // Show a warning about browser limitations
    toast.warning('GitLab API integration is limited in browser environments. Using mock implementation.');

    setIsLoading(true);
    try {
      await connectGitlab(gitlabToken);
      toast.success('Connected to GitLab successfully (browser-compatible mock)');
      setGitlabToken('');
      if (onAuthSuccess) onAuthSuccess();
    } catch (err) {
      toast.error('Failed to connect to GitLab');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle GitLab OAuth code authentication
  const handleGitlabCodeAuth = async () => {
    if (!gitlabCode.trim()) {
      toast.error('Please enter the OAuth code');
      return;
    }

    // Show a warning about browser limitations
    toast.warning('GitLab OAuth integration is limited in browser environments. Using mock implementation.');

    setIsLoading(true);
    try {
      // In a real implementation, this would exchange the code for a token
      await connectGitlab(`simulated_token_from_code_${gitlabCode}`);
      toast.success('Connected to GitLab successfully via OAuth (browser-compatible mock)');
      setGitlabCode('');
      if (onAuthSuccess) onAuthSuccess();
    } catch (err) {
      toast.error('Failed to connect to GitLab via OAuth');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle generic token authentication
  const handleGenericTokenAuth = async () => {
    if (!genericToken.trim() || !tokenName.trim()) {
      toast.error('Please enter both token name and value');
      return;
    }

    // Show a warning about browser limitations
    toast.warning('Token-based Git integration is limited in browser environments. Using mock implementation.');

    setIsLoading(true);
    try {
      await connectWithToken(tokenName, genericToken);
      toast.success(`Connected with ${tokenName} token successfully (browser-compatible mock)`);
      setGenericToken('');
      setTokenName('');
      if (onAuthSuccess) onAuthSuccess();
    } catch (err) {
      toast.error('Failed to connect with token');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Git Authentication</CardTitle>
        <CardDescription>
          Connect to Git providers using OAuth or personal access tokens
        </CardDescription>
        <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
          <div className="flex items-center text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
            <p className="text-xs">
              <strong>Browser Environment Notice:</strong> Git functionality is limited in browser environments.
              Remote operations like clone, push, pull, and fetch are simulated. GitHub and GitLab integrations use mock implementations.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="github" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="github">GitHub</TabsTrigger>
            <TabsTrigger value="gitlab">GitLab</TabsTrigger>
            <TabsTrigger value="generic">Generic</TabsTrigger>
          </TabsList>

          {/* GitHub Authentication */}
          <TabsContent value="github" className="space-y-4">
            {isGithubConnected ? (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Github className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="font-medium">Connected to GitHub</p>
                      <p className="text-sm text-muted-foreground">
                        Logged in as {config.github.username || 'Unknown user'}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={disconnectGithub}>
                    Disconnect
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">OAuth Authentication (Recommended)</h3>
                    <div className="space-y-2">
                      <Button
                        className="w-full"
                        onClick={handleGithubOAuth}
                        disabled={isLoading}
                      >
                        <Github className="h-4 w-4 mr-2" />
                        Sign in with GitHub
                      </Button>
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Enter OAuth code"
                          value={githubCode}
                          onChange={(e) => setGithubCode(e.target.value)}
                          disabled={isLoading}
                        />
                        <Button
                          onClick={handleGithubCodeAuth}
                          disabled={isLoading || !githubCode.trim()}
                        >
                          <LogIn className="h-4 w-4 mr-2" />
                          Verify
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium mb-2">Personal Access Token</h3>
                    <div className="space-y-2">
                      <Label htmlFor="github-token">GitHub Token</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="github-token"
                          type="password"
                          placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                          value={githubToken}
                          onChange={(e) => setGithubToken(e.target.value)}
                          disabled={isLoading}
                        />
                        <Button
                          onClick={handleGithubTokenAuth}
                          disabled={isLoading || !githubToken.trim()}
                        >
                          <Key className="h-4 w-4 mr-2" />
                          Connect
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Create a token with 'repo' scope at{' '}
                        <a
                          href="https://github.com/settings/tokens"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline"
                        >
                          GitHub Settings
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* GitLab Authentication */}
          <TabsContent value="gitlab" className="space-y-4">
            {isGitlabConnected ? (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GitlabIcon />
                    <div>
                      <p className="font-medium">Connected to GitLab</p>
                      <p className="text-sm text-muted-foreground">
                        Logged in as {config.gitlab?.username || 'Unknown user'}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={disconnectGitlab}>
                    Disconnect
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">OAuth Authentication (Recommended)</h3>
                    <div className="space-y-2">
                      <Button
                        className="w-full"
                        onClick={handleGitlabOAuth}
                        disabled={isLoading}
                      >
                        <GitlabIcon />
                        <span className="ml-2">Sign in with GitLab</span>
                      </Button>
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Enter OAuth code"
                          value={gitlabCode}
                          onChange={(e) => setGitlabCode(e.target.value)}
                          disabled={isLoading}
                        />
                        <Button
                          onClick={handleGitlabCodeAuth}
                          disabled={isLoading || !gitlabCode.trim()}
                        >
                          <LogIn className="h-4 w-4 mr-2" />
                          Verify
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium mb-2">Personal Access Token</h3>
                    <div className="space-y-2">
                      <Label htmlFor="gitlab-token">GitLab Token</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="gitlab-token"
                          type="password"
                          placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
                          value={gitlabToken}
                          onChange={(e) => setGitlabToken(e.target.value)}
                          disabled={isLoading}
                        />
                        <Button
                          onClick={handleGitlabTokenAuth}
                          disabled={isLoading || !gitlabToken.trim()}
                        >
                          <Key className="h-4 w-4 mr-2" />
                          Connect
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Create a token with 'api' scope at{' '}
                        <a
                          href="https://gitlab.com/-/profile/personal_access_tokens"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline"
                        >
                          GitLab Settings
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* Generic Token Authentication */}
          <TabsContent value="generic" className="space-y-4">
            {isTokenConnected ? (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="font-medium">Connected with Token</p>
                      <p className="text-sm text-muted-foreground">
                        Using {config.token?.name || 'Unknown'} token
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={disconnectToken}>
                    Disconnect
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Generic Token Authentication</h3>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="token-name">Token Name</Label>
                        <Input
                          id="token-name"
                          placeholder="e.g., Bitbucket, Azure DevOps"
                          value={tokenName}
                          onChange={(e) => setTokenName(e.target.value)}
                          disabled={isLoading}
                        />
                      </div>
                      <div>
                        <Label htmlFor="generic-token">Token Value</Label>
                        <Input
                          id="generic-token"
                          type="password"
                          placeholder="Your access token"
                          value={genericToken}
                          onChange={(e) => setGenericToken(e.target.value)}
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                    <Button
                      className="w-full"
                      onClick={handleGenericTokenAuth}
                      disabled={isLoading || !genericToken.trim() || !tokenName.trim()}
                    >
                      <Key className="h-4 w-4 mr-2" />
                      Connect with Token
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Use this for any Git provider that supports token-based authentication
                    </p>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default GitAuthManager;
