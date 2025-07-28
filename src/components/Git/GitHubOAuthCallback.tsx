import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { githubAuthService } from '@/services/githubAuthService';
import { useGitStore } from '@/stores/gitStore';
import { Alert, Spin, Typography, Button, Result } from 'antd';
import styled from 'styled-components';

const { Title, Text } = Typography;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  padding: 20px;
  text-align: center;
`;

const SpinnerContainer = styled.div`
  margin: 40px 0;
`;

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
  const navigate = useNavigate();
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

        // Redirect to the Git panel after a short delay
        setTimeout(() => {
          navigate('/git');
        }, 2000);
      } catch (err) {
        console.error('OAuth callback error:', err);
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'Failed to authenticate with GitHub');
      }
    };

    handleCallback();
  }, [connectGithub, navigate]);

  // Render loading state
  if (status === 'loading') {
    return (
      <Container>
        <Title level={2}>Authenticating with GitHub</Title>
        <Text>Please wait while we complete the authentication process...</Text>
        <SpinnerContainer>
          <Spin size="large" />
        </SpinnerContainer>
      </Container>
    );
  }

  // Render success state
  if (status === 'success') {
    return (
      <Container>
        <Result
          status="success"
          title="Successfully authenticated with GitHub!"
          subTitle="You will be redirected to the Git panel in a moment."
          extra={[
            <Button type="primary" key="git" onClick={() => navigate('/git')}>
              Go to Git Panel
            </Button>,
          ]}
        />
      </Container>
    );
  }

  // Render error state
  return (
    <Container>
      <Result
        status="error"
        title="Authentication Failed"
        subTitle="There was a problem authenticating with GitHub."
        extra={[
          <Button type="primary" key="retry" onClick={() => githubAuthService.startOAuthFlow()}>
            Try Again
          </Button>,
          <Button key="home" onClick={() => navigate('/')}>
            Go Home
          </Button>,
        ]}
      >
        <Alert message="Error Details" description={errorMessage} type="error" showIcon />
      </Result>
    </Container>
  );
};

export default GitHubOAuthCallback;
