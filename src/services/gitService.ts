import { BrowserGitService, GitFileSystemAdapter } from './browserGitService';

// Use the real Git implementation with isomorphic-git instead of mock implementation
// Export a default git service instance using the real implementation
export const gitService = new BrowserGitService('./');

// Re-export classes for compatibility with existing tests and imports
export { GitFileSystemAdapter, BrowserGitService as GitService };
