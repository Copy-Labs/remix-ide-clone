import React, { useEffect, useState } from 'react';
import { githubAuthService } from '@/services/githubAuthService';
import { useGitStore } from '@/stores/gitStore';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';

/**
 * GitHubOAuthCallback component
 *
 * This component handles the OAuth callback from GitHub after the user authorizes the application.
 * It extracts the code and state parameters from the URL, validates them, and exchanges the code
 * for an access token.
 */
const GitHubOAuthCallback: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const { connectGithub } = useGitStore();


  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the code and state parameters from the URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');

        // Check if code and state are present
        if (!code || !state) {
          throw new Error('Missing code or state parameter');
        }

        // Handle the OAuth callback
        const authState = await githubAuthService.handleOAuthCallback(code, state);

        // Connect GitHub in the Git store
        await connectGithub(authState.tokens.accessToken);

        // Set success status
        setStatus('success');
      } catch (err) {
        console.error('OAuth callback error:', err);
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'Failed to authenticate with GitHub');
      }
    };

    handleCallback();
  }, [connectGithub]);

  // Render loading state
  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-5 text-center">
        <h2 className="text-2xl font-semibold mb-4">Authenticating with GitHub</h2>
        <p className="text-gray-600 mb-10">
          Please wait while we complete the authentication process...
        </p>
        <div className="my-10">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  // Render success state
  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-5 text-center">
        <div className="flex flex-col items-center space-y-4">
          <CheckCircle className="h-16 w-16 text-green-500" />
          <h2 className="text-2xl font-semibold">Successfully authenticated with GitHub!</h2>
          <p className="text-gray-600">You can now use Git features in the sidebar panels.</p>
        </div>
      </div>
    );
  }

  // Render error state
  return (
    <div className="flex flex-col items-center justify-center h-screen p-5 text-center">
      <div className="flex flex-col items-center space-y-4">
        <XCircle className="h-16 w-16 text-red-500" />
        <h2 className="text-2xl font-semibold">Authentication Failed</h2>
        <p className="text-gray-600">There was a problem authenticating with GitHub.</p>

        <Alert className="mt-4 max-w-md">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Error Details:</strong> {errorMessage}
          </AlertDescription>
        </Alert>

        <div className="flex space-x-4 mt-6">
          <Button onClick={() => githubAuthService.startOAuthFlow()}>Try Again</Button>
        </div>
      </div>
    </div>
  );
};

export default GitHubOAuthCallback;
