import { Octokit } from '@octokit/rest';
import { debug, error, info, warn } from '@/services/loggerService';
import { databaseService } from '@/services/databaseService';

// Constants for OAuth configuration
// For development/demo purposes, we'll use environment variables or fallback to a demo mode
const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID || 'demo_mode';
const GITHUB_OAUTH_REDIRECT_URI = `${window.location.origin}/oauth/callback`;
const GITHUB_OAUTH_SCOPES = ['repo', 'user'];
const TOKEN_STORAGE_KEY = 'github_oauth_tokens';

// Check if we're in demo mode (no proper OAuth setup)
const IS_DEMO_MODE = GITHUB_CLIENT_ID === 'demo_mode' || GITHUB_CLIENT_ID === 'YOUR_GITHUB_CLIENT_ID';

// Types for authentication tokens
interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType: string;
  provider: 'github' | 'gitlab' | 'bitbucket';
}

interface AuthState {
  username: string;
  avatarUrl: string;
  provider: 'github' | 'gitlab' | 'bitbucket';
  tokens: OAuthTokens;
}

/**
 * GitHub Authentication Service
 *
 * Implements OAuth 2.0 Authorization Code Flow with PKCE for secure authentication
 * with GitHub and other Git providers in browser environments.
 */
export class GitHubAuthService {
  private octokit: Octokit | null = null;
  private authState: AuthState | null = null;
  private codeVerifier: string | null = null;

  constructor() {
    // Try to restore auth state from storage on initialization
    this.restoreAuthState();
  }

  /**
   * Check if the user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.authState && !!this.octokit;
  }

  /**
   * Get the authenticated user's information
   */
  getAuthenticatedUser(): { username: string; avatarUrl: string; provider: string } | null {
    if (!this.authState) return null;

    return {
      username: this.authState.username,
      avatarUrl: this.authState.avatarUrl,
      provider: this.authState.provider,
    };
  }

  /**
   * Get the Octokit instance for making GitHub API calls
   */
  getOctokit(): Octokit | null {
    return this.octokit;
  }

  /**
   * Start the OAuth flow by redirecting to GitHub's authorization page
   */
  async startOAuthFlow(): Promise<void> {
    try {
      // Check if we're in demo mode
      if (IS_DEMO_MODE) {
        throw new Error(
          'GitHub OAuth is not configured. Please set VITE_GITHUB_CLIENT_ID environment variable or use personal access token authentication instead.'
        );
      }

      // Generate a code verifier and challenge for PKCE
      this.codeVerifier = this.generateCodeVerifier();
      const codeChallenge = await this.generateCodeChallenge(this.codeVerifier);

      // Store the code verifier in session storage for the callback
      sessionStorage.setItem('github_code_verifier', this.codeVerifier);

      // Build the authorization URL
      const authUrl = new URL('https://github.com/login/oauth/authorize');
      authUrl.searchParams.append('client_id', GITHUB_CLIENT_ID);
      authUrl.searchParams.append('redirect_uri', GITHUB_OAUTH_REDIRECT_URI);
      authUrl.searchParams.append('scope', GITHUB_OAUTH_SCOPES.join(' '));
      authUrl.searchParams.append('state', this.generateRandomState());
      authUrl.searchParams.append('code_challenge', codeChallenge);
      authUrl.searchParams.append('code_challenge_method', 'S256');

      info('GitHubAuthService', 'Starting OAuth flow, redirecting to GitHub...');

      // Redirect to GitHub's authorization page
      window.location.href = authUrl.toString();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start OAuth flow';
      error('GitHubAuthService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Handle the OAuth callback from GitHub
   * @param code Authorization code from GitHub
   * @param state State parameter for security validation
   */
  async handleOAuthCallback(code: string, state: string): Promise<AuthState> {
    try {
      // Verify the state parameter
      const savedState = sessionStorage.getItem('github_oauth_state');
      if (!savedState || savedState !== state) {
        throw new Error('Invalid state parameter');
      }

      // Get the code verifier from session storage
      const codeVerifier = sessionStorage.getItem('github_code_verifier');
      if (!codeVerifier) {
        throw new Error('Code verifier not found');
      }

      // Exchange the authorization code for an access token
      const tokenResponse = await this.exchangeCodeForToken(code, codeVerifier);

      // Create an Octokit instance with the access token
      this.octokit = new Octokit({ auth: tokenResponse.accessToken });

      // Get the authenticated user's information
      const { data } = await this.octokit.rest.users.getAuthenticated();

      // Create the auth state
      this.authState = {
        username: data.login,
        avatarUrl: data.avatar_url,
        provider: 'github',
        tokens: tokenResponse,
      };

      // Store the auth state securely
      await this.storeAuthState();

      info('GitHubAuthService', `Authenticated as ${this.authState.username} using OAuth`);

      // Clean up session storage
      sessionStorage.removeItem('github_code_verifier');
      sessionStorage.removeItem('github_oauth_state');

      return this.authState;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to handle OAuth callback';
      error('GitHubAuthService', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Refresh the access token if it's expired
   */
  async refreshTokenIfNeeded(): Promise<boolean> {
    if (!this.authState || !this.authState.tokens.refreshToken) {
      return false;
    }

    // Check if the token is expired or about to expire (within 5 minutes)
    const now = Date.now();
    const expiresAt = this.authState.tokens.expiresAt || 0;

    if (expiresAt > now + 5 * 60 * 1000) {
      // Token is still valid
      return false;
    }

    try {
      // Refresh the token
      const refreshToken = this.authState.tokens.refreshToken;

      // Note: GitHub doesn't support refresh tokens for OAuth Apps, only for GitHub Apps
      // This is a placeholder for the actual implementation
      warn('GitHubAuthService', 'Token refresh not implemented for GitHub OAuth Apps');

      // For GitHub, we'll need to re-authenticate the user
      // For other providers that support refresh tokens, we would implement the refresh flow here

      return false;
    } catch (err) {
      warn('GitHubAuthService', 'Failed to refresh token, user needs to re-authenticate');
      return false;
    }
  }

  /**
   * Logout the user
   */
  async logout(): Promise<void> {
    this.octokit = null;
    this.authState = null;

    // Remove the auth state from storage
    await databaseService.delete(TOKEN_STORAGE_KEY);

    info('GitHubAuthService', 'Logged out');
  }

  /**
   * Exchange the authorization code for an access token
   * @param code Authorization code from GitHub
   * @param codeVerifier Code verifier for PKCE
   */
  private async exchangeCodeForToken(code: string, codeVerifier: string): Promise<OAuthTokens> {
    // Check if we're in demo mode
    if (IS_DEMO_MODE) {
      throw new Error(
        'GitHub OAuth token exchange is not available in demo mode. Please configure a proper OAuth app or use personal access token authentication.'
      );
    }

    // In a real implementation, this would be handled by a server-side endpoint
    // to keep the client secret secure. For now, we'll throw an error indicating
    // that proper server-side implementation is needed.

    throw new Error(
      'OAuth token exchange requires a server-side endpoint to securely handle the client secret. ' +
      'Please implement a server endpoint for token exchange or use personal access token authentication instead. ' +
      'See GitHub documentation: https://docs.github.com/en/developers/apps/building-oauth-apps/authorizing-oauth-apps'
    );
  }

  /**
   * Generate a random code verifier for PKCE
   */
  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return this.base64UrlEncode(array);
  }

  /**
   * Generate a code challenge from the code verifier
   * @param codeVerifier Code verifier
   */
  private async generateCodeChallenge(codeVerifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return this.base64UrlEncode(new Uint8Array(digest));
  }

  /**
   * Generate a random state parameter for CSRF protection
   */
  private generateRandomState(): string {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    const state = this.base64UrlEncode(array);

    // Store the state in session storage for validation
    sessionStorage.setItem('github_oauth_state', state);

    return state;
  }

  /**
   * Base64Url encode a Uint8Array
   * @param array Uint8Array to encode
   */
  private base64UrlEncode(array: Uint8Array): string {
    return btoa(String.fromCharCode.apply(null, Array.from(array)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Store the auth state securely
   */
  private async storeAuthState(): Promise<void> {
    if (!this.authState) return;

    try {
      await databaseService.set(TOKEN_STORAGE_KEY, this.authState);
    } catch (err) {
      warn('GitHubAuthService', 'Failed to store auth state');
    }
  }

  /**
   * Restore the auth state from storage
   */
  private async restoreAuthState(): Promise<void> {
    try {
      const storedState = await databaseService.get(TOKEN_STORAGE_KEY);

      if (storedState) {
        this.authState = storedState as AuthState;

        // Check if the token is expired
        if (await this.refreshTokenIfNeeded()) {
          // Token was refreshed, update the stored state
          await this.storeAuthState();
        }

        // Create an Octokit instance with the access token
        this.octokit = new Octokit({ auth: this.authState.tokens.accessToken });

        info('GitHubAuthService', `Restored authentication for ${this.authState.username}`);
      }
    } catch (err) {
      warn('GitHubAuthService', 'Failed to restore auth state');
    }
  }
}

// Export a singleton instance
export const githubAuthService = new GitHubAuthService();
