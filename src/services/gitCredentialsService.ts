/**
 * GitCredentialsService provides a secure way to store and retrieve Git credentials.
 * It handles different storage mechanisms based on the environment (browser vs desktop).
 */

import { debug, error, info } from '@/services/loggerService';
import { databaseService } from '@/services/databaseService';

// Define credential types
export enum CredentialType {
  BASIC = 'basic',
  SSH_KEY = 'ssh_key',
  OAUTH_TOKEN = 'oauth_token',
  PERSONAL_ACCESS_TOKEN = 'personal_access_token',
}

// Define credential interfaces
export interface BasicCredential {
  type: CredentialType.BASIC;
  username: string;
  password: string;
}

export interface SSHKeyCredential {
  type: CredentialType.SSH_KEY;
  privateKey: string;
  publicKey: string;
  passphrase?: string;
}

export interface OAuthTokenCredential {
  type: CredentialType.OAUTH_TOKEN;
  token: string;
  provider: string;
  scopes: string[];
}

export interface PersonalAccessTokenCredential {
  type: CredentialType.PERSONAL_ACCESS_TOKEN;
  token: string;
  provider: string;
}

export type GitCredential =
  | BasicCredential
  | SSHKeyCredential
  | OAuthTokenCredential
  | PersonalAccessTokenCredential;

// Define storage provider interface
interface CredentialStorageProvider {
  save(key: string, credential: GitCredential): Promise<void>;
  load(key: string): Promise<GitCredential | null>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Browser-based credential storage using IndexedDB
 */
class BrowserCredentialStorage implements CredentialStorageProvider {
  private readonly STORAGE_PREFIX = 'git:credentials:';

  async save(key: string, credential: GitCredential): Promise<void> {
    try {
      // In a real implementation, we would encrypt the credentials before storing
      // For now, we'll just store them as-is with a warning
      debug(`Storing credentials for ${key} (unencrypted - not secure for production)`);
      await databaseService.set(`${this.STORAGE_PREFIX}${key}`, credential);
    } catch (e) {
      error('Failed to save credentials:', e);
      throw e;
    }
  }

  async load(key: string): Promise<GitCredential | null> {
    try {
      const credential = await databaseService.get(`${this.STORAGE_PREFIX}${key}`);
      return (credential as GitCredential) || null;
    } catch (e) {
      error('Failed to load credentials:', e);
      throw e;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await databaseService.delete(`${this.STORAGE_PREFIX}${key}`);
    } catch (e) {
      error('Failed to delete credentials:', e);
      throw e;
    }
  }

  async clear(): Promise<void> {
    try {
      // Get all keys with the prefix
      const allKeys = await databaseService.keys();
      const credentialKeys = allKeys.filter((key) => key.startsWith(this.STORAGE_PREFIX));

      // Delete all credential keys
      for (const key of credentialKeys) {
        await databaseService.delete(key);
      }
    } catch (e) {
      error('Failed to clear credentials:', e);
      throw e;
    }
  }
}

/**
 * Desktop-based credential storage using system keychain
 */
class DesktopCredentialStorage implements CredentialStorageProvider {
  private readonly SERVICE_NAME = 'RemixIDEClone';

  async save(key: string, credential: GitCredential): Promise<void> {
    try {
      // In a real implementation, we would use the system keychain
      // For now, we'll just log a message
      info(`[Desktop] Would store credentials for ${key} in system keychain`);

      // Mock implementation - in a real app, we would use keytar or similar
      localStorage.setItem(`${this.SERVICE_NAME}:${key}`, JSON.stringify(credential));
    } catch (e) {
      error('Failed to save credentials to keychain:', e);
      throw e;
    }
  }

  async load(key: string): Promise<GitCredential | null> {
    try {
      // Mock implementation - in a real app, we would use keytar or similar
      const credentialJson = localStorage.getItem(`${this.SERVICE_NAME}:${key}`);
      if (!credentialJson) return null;

      return JSON.parse(credentialJson) as GitCredential;
    } catch (e) {
      error('Failed to load credentials from keychain:', e);
      throw e;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      // Mock implementation - in a real app, we would use keytar or similar
      localStorage.removeItem(`${this.SERVICE_NAME}:${key}`);
    } catch (e) {
      error('Failed to delete credentials from keychain:', e);
      throw e;
    }
  }

  async clear(): Promise<void> {
    try {
      // Mock implementation - in a real app, we would use keytar or similar
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`${this.SERVICE_NAME}:`)) {
          keysToRemove.push(key);
        }
      }

      for (const key of keysToRemove) {
        localStorage.removeItem(key);
      }
    } catch (e) {
      error('Failed to clear credentials from keychain:', e);
      throw e;
    }
  }
}

/**
 * Determine if we're running in a browser or desktop environment
 */
const isDesktopEnvironment = () => {
  try {
    // Check if we're in a Node.js environment
    return (
      typeof process !== 'undefined' &&
      typeof process.versions !== 'undefined' &&
      typeof process.versions.node !== 'undefined' &&
      typeof window === 'undefined'
    );
  } catch (e) {
    // If there's an error, we're likely in a browser environment
    return false;
  }
};

/**
 * GitCredentialsService class for managing Git credentials
 */
export class GitCredentialsService {
  private storage: CredentialStorageProvider;
  private static instance: GitCredentialsService;

  // Private constructor to enforce singleton pattern
  private constructor() {
    this.storage = isDesktopEnvironment()
      ? new DesktopCredentialStorage()
      : new BrowserCredentialStorage();
  }

  /**
   * Get the singleton instance of GitCredentialsService
   */
  public static getInstance(): GitCredentialsService {
    if (!GitCredentialsService.instance) {
      GitCredentialsService.instance = new GitCredentialsService();
    }
    return GitCredentialsService.instance;
  }

  /**
   * Save credentials for a remote repository
   * @param remoteUrl The URL of the remote repository
   * @param credential The credentials to save
   */
  public async saveCredential(remoteUrl: string, credential: GitCredential): Promise<void> {
    await this.storage.save(this.normalizeUrl(remoteUrl), credential);
  }

  /**
   * Load credentials for a remote repository
   * @param remoteUrl The URL of the remote repository
   * @returns The credentials or null if not found
   */
  public async loadCredential(remoteUrl: string): Promise<GitCredential | null> {
    return this.storage.load(this.normalizeUrl(remoteUrl));
  }

  /**
   * Delete credentials for a remote repository
   * @param remoteUrl The URL of the remote repository
   */
  public async deleteCredential(remoteUrl: string): Promise<void> {
    await this.storage.delete(this.normalizeUrl(remoteUrl));
  }

  /**
   * Clear all stored credentials
   */
  public async clearAllCredentials(): Promise<void> {
    await this.storage.clear();
  }

  /**
   * Create a basic credential
   * @param username Username
   * @param password Password
   * @returns Basic credential object
   */
  public createBasicCredential(username: string, password: string): BasicCredential {
    return {
      type: CredentialType.BASIC,
      username,
      password,
    };
  }

  /**
   * Create an SSH key credential
   * @param privateKey Private key
   * @param publicKey Public key
   * @param passphrase Optional passphrase
   * @returns SSH key credential object
   */
  public createSSHKeyCredential(
    privateKey: string,
    publicKey: string,
    passphrase?: string,
  ): SSHKeyCredential {
    return {
      type: CredentialType.SSH_KEY,
      privateKey,
      publicKey,
      passphrase,
    };
  }

  /**
   * Create an OAuth token credential
   * @param token OAuth token
   * @param provider Provider name (e.g., 'github', 'gitlab')
   * @param scopes Token scopes
   * @returns OAuth token credential object
   */
  public createOAuthTokenCredential(
    token: string,
    provider: string,
    scopes: string[],
  ): OAuthTokenCredential {
    return {
      type: CredentialType.OAUTH_TOKEN,
      token,
      provider,
      scopes,
    };
  }

  /**
   * Create a personal access token credential
   * @param token Personal access token
   * @param provider Provider name (e.g., 'github', 'gitlab')
   * @returns Personal access token credential object
   */
  public createPersonalAccessTokenCredential(
    token: string,
    provider: string,
  ): PersonalAccessTokenCredential {
    return {
      type: CredentialType.PERSONAL_ACCESS_TOKEN,
      token,
      provider,
    };
  }

  /**
   * Normalize a repository URL for use as a storage key
   * @param url Repository URL
   * @returns Normalized URL
   */
  private normalizeUrl(url: string): string {
    // Remove protocol
    let normalized = url.replace(/^(https?|git|ssh):\/\//, '');

    // Remove username and password if present
    normalized = normalized.replace(/^[^@]+@/, '');

    // Remove .git suffix if present
    normalized = normalized.replace(/\.git$/, '');

    return normalized;
  }
}

// Export a singleton instance
export const gitCredentialsService = GitCredentialsService.getInstance();
