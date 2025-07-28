import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useGitStore } from '@/stores/gitStore';
import { gitService } from '@/services/gitService';
import { useFileStore } from '@/stores/fileStore';

// Mock dependencies
vi.mock('@/services/gitService');
vi.mock('@/stores/fileStore');
vi.mock('@/services/loggerService', () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));
vi.mock('@octokit/rest');

describe('Git Integration - End-to-End Workflows', () => {
  let gitStore: ReturnType<typeof useGitStore>;
  let mockGitService: any;
  let mockFileStore: any;

  beforeEach(() => {
    // Reset git store
    useGitStore.setState({
      isInitialized: false,
      currentBranch: '',
      branches: [],
      remotes: [],
      commits: [],
      status: [],
      config: {
        user: { name: 'Test User', email: 'test@example.com' },
        github: { token: undefined, username: undefined },
      },
      isLoading: false,
      error: null,
      githubRepos: [],
      isGithubConnected: false,
    });

    gitStore = useGitStore.getState();
    mockGitService = vi.mocked(gitService);
    mockFileStore = {
      createFile: vi.fn(),
      updateFileContent: vi.fn(),
      getFileContent: vi.fn(),
      files: new Map(),
    };
    vi.mocked(useFileStore.getState).mockReturnValue(mockFileStore);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Repository Initialization Workflow', () => {
    it('should complete full repository initialization workflow', async () => {
      // Mock git service responses
      mockGitService.init.mockResolvedValue(undefined);
      mockGitService.listBranches.mockResolvedValue(['main']);
      mockGitService.currentBranch.mockResolvedValue('main');
      mockGitService.status.mockResolvedValue([]);
      mockGitService.log.mockResolvedValue([]);

      // Step 1: Initialize repository
      await gitStore.initRepository();

      expect(gitStore.isInitialized).toBe(true);
      expect(gitStore.currentBranch).toBe('main');
      expect(mockGitService.init).toHaveBeenCalledWith('main');

      // Step 2: Get initial state
      await gitStore.getBranches();
      await gitStore.getStatus();
      await gitStore.getCommits();

      expect(mockGitService.listBranches).toHaveBeenCalled();
      expect(mockGitService.status).toHaveBeenCalled();
      expect(mockGitService.log).toHaveBeenCalled();
      expect(gitStore.branches).toHaveLength(1);
      expect(gitStore.branches[0].name).toBe('main');
      expect(gitStore.branches[0].current).toBe(true);
    });

    it('should handle initialization failure gracefully', async () => {
      const error = new Error('Permission denied');
      mockGitService.init.mockRejectedValue(error);

      await gitStore.initRepository();

      expect(gitStore.isInitialized).toBe(false);
      expect(gitStore.error).toBe('Permission denied');
      expect(gitStore.isLoading).toBe(false);
    });
  });

  describe('File Management and Commit Workflow', () => {
    beforeEach(async () => {
      // Initialize repository first
      gitStore.isInitialized = true;
      gitStore.currentBranch = 'main';
      mockGitService.init.mockResolvedValue(undefined);
      mockGitService.listBranches.mockResolvedValue(['main']);
      mockGitService.currentBranch.mockResolvedValue('main');
    });

    it('should complete full file creation and commit workflow', async () => {
      // Step 1: Create a file
      const fileName = 'test.sol';
      const fileContent = 'pragma solidity ^0.8.0;\n\ncontract Test {}';

      mockFileStore.createFile.mockResolvedValue(undefined);
      await mockFileStore.createFile(fileName, fileContent);

      // Step 2: Check status (file should appear as new)
      mockGitService.status.mockResolvedValue([
        { file: fileName, head: 0, workdir: 2, stage: 0 }, // New file
      ]);

      await gitStore.getStatus();
      expect(gitStore.status).toHaveLength(1);
      expect(gitStore.status[0].file).toBe(fileName);

      // Step 3: Stage the file
      mockGitService.add.mockResolvedValue(undefined);
      mockGitService.status.mockResolvedValue([
        { file: fileName, head: 0, workdir: 2, stage: 2 }, // Staged file
      ]);

      await gitStore.addFile(fileName);
      expect(mockGitService.add).toHaveBeenCalledWith(fileName);

      // Step 4: Commit the file
      const commitMessage = 'Add test contract';
      const commitOid = 'abc123def456';

      mockGitService.commit.mockResolvedValue(commitOid);
      mockGitService.log.mockResolvedValue([
        {
          oid: commitOid,
          commit: {
            message: commitMessage,
            author: { name: 'Test User', email: 'test@example.com', timestamp: Date.now() },
            committer: { name: 'Test User', email: 'test@example.com', timestamp: Date.now() },
          },
        },
      ]);
      mockGitService.status.mockResolvedValue([]); // Clean working directory

      await gitStore.commit(commitMessage);

      expect(mockGitService.commit).toHaveBeenCalledWith(commitMessage, {
        name: 'Test User',
        email: 'test@example.com',
      });
      expect(gitStore.commits).toHaveLength(1);
      expect(gitStore.commits[0].message).toBe(commitMessage);
      expect(gitStore.commits[0].oid).toBe(commitOid);
      expect(gitStore.status).toHaveLength(0); // Clean after commit
    });

    it('should handle staging multiple files and committing', async () => {
      const files = ['contract1.sol', 'contract2.sol', 'README.md'];

      // Mock status with multiple files
      mockGitService.status.mockResolvedValue(
        files.map((file) => ({ file, head: 0, workdir: 2, stage: 0 })),
      );

      await gitStore.getStatus();
      expect(gitStore.status).toHaveLength(3);

      // Stage all files
      mockGitService.add.mockResolvedValue(undefined);
      mockGitService.status.mockResolvedValue(
        files.map((file) => ({ file, head: 0, workdir: 2, stage: 2 })),
      );

      await gitStore.addAllFiles();
      expect(mockGitService.add).toHaveBeenCalledWith('.');

      // Commit all files
      const commitMessage = 'Add multiple contracts and documentation';
      const commitOid = 'def456ghi789';

      mockGitService.commit.mockResolvedValue(commitOid);
      mockGitService.log.mockResolvedValue([
        {
          oid: commitOid,
          commit: {
            message: commitMessage,
            author: { name: 'Test User', email: 'test@example.com', timestamp: Date.now() },
            committer: { name: 'Test User', email: 'test@example.com', timestamp: Date.now() },
          },
        },
      ]);
      mockGitService.status.mockResolvedValue([]);

      await gitStore.commit(commitMessage);

      expect(gitStore.commits).toHaveLength(1);
      expect(gitStore.commits[0].message).toBe(commitMessage);
      expect(gitStore.status).toHaveLength(0);
    });
  });

  describe('Branch Management Workflow', () => {
    beforeEach(() => {
      gitStore.isInitialized = true;
      gitStore.currentBranch = 'main';
      gitStore.branches = [{ name: 'main', oid: 'abc123', current: true }];
    });

    it('should complete full branch creation and switching workflow', async () => {
      const newBranchName = 'feature/new-feature';

      // Step 1: Create new branch
      mockGitService.branch.mockResolvedValue(undefined);
      mockGitService.listBranches.mockResolvedValue(['main', newBranchName]);
      mockGitService.currentBranch.mockResolvedValue('main');

      await gitStore.createBranch(newBranchName);

      expect(mockGitService.branch).toHaveBeenCalledWith(newBranchName);
      expect(gitStore.branches).toHaveLength(2);
      expect(gitStore.branches.find((b) => b.name === newBranchName)).toBeDefined();

      // Step 2: Switch to new branch
      mockGitService.checkout.mockResolvedValue(undefined);
      mockGitService.listBranches.mockResolvedValue(['main', newBranchName]);
      mockGitService.currentBranch.mockResolvedValue(newBranchName);
      mockGitService.status.mockResolvedValue([]);

      await gitStore.switchBranch(newBranchName);

      expect(mockGitService.checkout).toHaveBeenCalledWith(newBranchName);
      expect(gitStore.currentBranch).toBe(newBranchName);
      expect(gitStore.branches.find((b) => b.name === newBranchName)?.current).toBe(true);
      expect(gitStore.branches.find((b) => b.name === 'main')?.current).toBe(false);

      // Step 3: Make changes and commit on new branch
      mockGitService.status.mockResolvedValue([
        { file: 'feature.sol', head: 0, workdir: 2, stage: 0 },
      ]);

      await gitStore.getStatus();

      mockGitService.add.mockResolvedValue(undefined);
      await gitStore.addFile('feature.sol');

      const commitMessage = 'Add new feature';
      const commitOid = 'feature123';

      mockGitService.commit.mockResolvedValue(commitOid);
      mockGitService.log.mockResolvedValue([
        {
          oid: commitOid,
          commit: {
            message: commitMessage,
            author: { name: 'Test User', email: 'test@example.com', timestamp: Date.now() },
            committer: { name: 'Test User', email: 'test@example.com', timestamp: Date.now() },
          },
        },
      ]);
      mockGitService.status.mockResolvedValue([]);

      await gitStore.commit(commitMessage);

      expect(gitStore.commits).toHaveLength(1);
      expect(gitStore.commits[0].message).toBe(commitMessage);
    });

    it('should handle branch deletion workflow', async () => {
      const branchToDelete = 'feature/old-feature';

      // Setup: Add branch to delete
      gitStore.branches = [
        { name: 'main', oid: 'abc123', current: true },
        { name: branchToDelete, oid: 'def456', current: false },
      ];

      // Delete branch
      mockGitService.deleteBranch.mockResolvedValue(undefined);
      mockGitService.listBranches.mockResolvedValue(['main']);
      mockGitService.currentBranch.mockResolvedValue('main');

      await gitStore.deleteBranch(branchToDelete);

      expect(mockGitService.deleteBranch).toHaveBeenCalledWith(branchToDelete);
      expect(gitStore.branches).toHaveLength(1);
      expect(gitStore.branches.find((b) => b.name === branchToDelete)).toBeUndefined();
    });
  });

  describe('Remote Repository Workflow', () => {
    beforeEach(() => {
      gitStore.isInitialized = true;
      gitStore.currentBranch = 'main';
    });

    it('should complete full remote setup and push workflow', async () => {
      const remoteName = 'origin';
      const remoteUrl = 'https://github.com/user/repo.git';

      // Step 1: Add remote
      mockGitService.addRemote.mockResolvedValue(undefined);
      mockGitService.listRemotes.mockResolvedValue([{ remote: remoteName, url: remoteUrl }]);

      await gitStore.addRemote(remoteName, remoteUrl);

      expect(mockGitService.addRemote).toHaveBeenCalledWith(remoteName, remoteUrl);
      expect(gitStore.remotes).toHaveLength(1);
      expect(gitStore.remotes[0].name).toBe(remoteName);
      expect(gitStore.remotes[0].url).toBe(remoteUrl);

      // Step 2: Push to remote
      mockGitService.push.mockResolvedValue(undefined);

      await gitStore.push(remoteName);

      expect(mockGitService.push).toHaveBeenCalledWith(remoteName, 'main');

      // Step 3: Fetch from remote
      mockGitService.fetch.mockResolvedValue(undefined);

      await gitStore.fetch(remoteName);

      expect(mockGitService.fetch).toHaveBeenCalledWith(remoteName);

      // Step 4: Pull from remote
      mockGitService.pull.mockResolvedValue(undefined);
      mockGitService.log.mockResolvedValue([]);
      mockGitService.status.mockResolvedValue([]);

      await gitStore.pull(remoteName);

      expect(mockGitService.pull).toHaveBeenCalledWith(remoteName, 'main');
    });

    it('should handle clone repository workflow', async () => {
      const repoUrl = 'https://github.com/user/existing-repo.git';

      // Reset to uninitialized state
      gitStore.isInitialized = false;

      mockGitService.clone.mockResolvedValue(undefined);
      mockGitService.listBranches.mockResolvedValue(['main', 'develop']);
      mockGitService.currentBranch.mockResolvedValue('main');
      mockGitService.status.mockResolvedValue([
        { file: 'existing.sol', head: 1, workdir: 1, stage: 1 },
      ]);

      await gitStore.cloneRepository(repoUrl);

      expect(mockGitService.clone).toHaveBeenCalledWith(repoUrl, '/');
      expect(gitStore.isInitialized).toBe(true);
      expect(gitStore.branches).toHaveLength(2);
      expect(gitStore.currentBranch).toBe('main');
      expect(gitStore.status).toHaveLength(1);
    });
  });

  describe('Error Recovery Workflows', () => {
    beforeEach(() => {
      gitStore.isInitialized = true;
      gitStore.currentBranch = 'main';
    });

    it('should recover from commit failure and retry', async () => {
      const commitMessage = 'Test commit';

      // First attempt fails
      mockGitService.commit.mockRejectedValueOnce(new Error('Commit failed'));

      await gitStore.commit(commitMessage);

      expect(gitStore.error).toBe('Commit failed');
      expect(gitStore.isLoading).toBe(false);

      // Clear error and retry
      gitStore.setError(null);

      // Second attempt succeeds
      const commitOid = 'success123';
      mockGitService.commit.mockResolvedValue(commitOid);
      mockGitService.log.mockResolvedValue([
        {
          oid: commitOid,
          commit: {
            message: commitMessage,
            author: { name: 'Test User', email: 'test@example.com', timestamp: Date.now() },
            committer: { name: 'Test User', email: 'test@example.com', timestamp: Date.now() },
          },
        },
      ]);
      mockGitService.status.mockResolvedValue([]);

      await gitStore.commit(commitMessage);

      expect(gitStore.error).toBe(null);
      expect(gitStore.commits).toHaveLength(1);
      expect(gitStore.commits[0].oid).toBe(commitOid);
    });

    it('should handle network errors during remote operations', async () => {
      const remoteName = 'origin';
      const remoteUrl = 'https://github.com/user/repo.git';

      // Setup remote
      gitStore.remotes = [{ name: remoteName, url: remoteUrl }];

      // Push fails due to network error
      mockGitService.push.mockRejectedValue(new Error('Network error'));

      await gitStore.push(remoteName);

      expect(gitStore.error).toBe('Network error');
      expect(gitStore.isLoading).toBe(false);

      // Clear error and retry with success
      gitStore.setError(null);
      mockGitService.push.mockResolvedValue(undefined);

      await gitStore.push(remoteName);

      expect(gitStore.error).toBe(null);
      expect(gitStore.isLoading).toBe(false);
    });
  });

  describe('Complex Multi-Step Workflows', () => {
    it('should handle complete feature development workflow', async () => {
      // Initialize repository
      gitStore.isInitialized = true;
      gitStore.currentBranch = 'main';
      gitStore.config.user.name = 'Developer';
      gitStore.config.user.email = 'dev@example.com';

      // Step 1: Create feature branch
      const featureBranch = 'feature/token-contract';
      mockGitService.branch.mockResolvedValue(undefined);
      mockGitService.listBranches.mockResolvedValue(['main', featureBranch]);
      mockGitService.currentBranch.mockResolvedValue('main');

      await gitStore.createBranch(featureBranch);

      // Step 2: Switch to feature branch
      mockGitService.checkout.mockResolvedValue(undefined);
      mockGitService.currentBranch.mockResolvedValue(featureBranch);
      mockGitService.status.mockResolvedValue([]);

      await gitStore.switchBranch(featureBranch);

      // Step 3: Add multiple files
      const files = ['Token.sol', 'TokenTest.sol', 'deploy.js'];
      mockGitService.status.mockResolvedValue(
        files.map((file) => ({ file, head: 0, workdir: 2, stage: 0 })),
      );

      await gitStore.getStatus();

      // Step 4: Stage and commit files
      mockGitService.add.mockResolvedValue(undefined);
      mockGitService.status.mockResolvedValue(
        files.map((file) => ({ file, head: 0, workdir: 2, stage: 2 })),
      );

      await gitStore.addAllFiles();

      const commitMessage = 'Implement ERC20 token contract with tests';
      const commitOid = 'token123';

      mockGitService.commit.mockResolvedValue(commitOid);
      mockGitService.log.mockResolvedValue([
        {
          oid: commitOid,
          commit: {
            message: commitMessage,
            author: { name: 'Developer', email: 'dev@example.com', timestamp: Date.now() },
            committer: { name: 'Developer', email: 'dev@example.com', timestamp: Date.now() },
          },
        },
      ]);
      mockGitService.status.mockResolvedValue([]);

      await gitStore.commit(commitMessage);

      // Step 5: Push to remote
      const remoteName = 'origin';
      gitStore.remotes = [{ name: remoteName, url: 'https://github.com/user/repo.git' }];
      mockGitService.push.mockResolvedValue(undefined);

      await gitStore.push(remoteName, featureBranch);

      // Verify final state
      expect(gitStore.currentBranch).toBe(featureBranch);
      expect(gitStore.commits).toHaveLength(1);
      expect(gitStore.commits[0].message).toBe(commitMessage);
      expect(gitStore.status).toHaveLength(0);
      expect(mockGitService.push).toHaveBeenCalledWith(remoteName, featureBranch);
    });

    it('should handle repository synchronization workflow', async () => {
      gitStore.isInitialized = true;
      gitStore.currentBranch = 'main';
      const remoteName = 'origin';
      gitStore.remotes = [{ name: remoteName, url: 'https://github.com/user/repo.git' }];

      // Step 1: Fetch latest changes
      mockGitService.fetch.mockResolvedValue(undefined);
      await gitStore.fetch(remoteName);
      // Step 2: Pull changes
      mockGitService.pull.mockResolvedValue(undefined);
      mockGitService.log.mockResolvedValue([
        {
          oid: 'remote123',
          commit: {
            message: 'Remote changes',
            author: { name: 'Other Dev', email: 'other@example.com', timestamp: Date.now() },
            committer: { name: 'Other Dev', email: 'other@example.com', timestamp: Date.now() },
          },
        },
      ]);
      mockGitService.status.mockResolvedValue([]);

      await gitStore.pull(remoteName);

      // Step 3: Make local changes
      mockGitService.status.mockResolvedValue([
        { file: 'local-change.sol', head: 0, workdir: 2, stage: 0 },
      ]);

      await gitStore.getStatus();

      mockGitService.add.mockResolvedValue(undefined);
      await gitStore.addFile('local-change.sol');

      // Step 4: Commit local changes
      const localCommitMessage = 'Add local improvements';
      const localCommitOid = 'local456';

      mockGitService.commit.mockResolvedValue(localCommitOid);
      mockGitService.log.mockResolvedValue([
        {
          oid: 'remote123',
          commit: {
            message: 'Remote changes',
            author: { name: 'Other Dev', email: 'other@example.com', timestamp: Date.now() },
            committer: { name: 'Other Dev', email: 'other@example.com', timestamp: Date.now() },
          },
        },
        {
          oid: localCommitOid,
          commit: {
            message: localCommitMessage,
            author: { name: 'Test User', email: 'test@example.com', timestamp: Date.now() },
            committer: { name: 'Test User', email: 'test@example.com', timestamp: Date.now() },
          },
        },
      ]);
      mockGitService.status.mockResolvedValue([]);

      await gitStore.commit(localCommitMessage);

      // Step 5: Push combined changes
      mockGitService.push.mockResolvedValue(undefined);
      await gitStore.push(remoteName);

      // Verify final state
      expect(gitStore.commits).toHaveLength(2);
      expect(gitStore.commits[0].message).toBe('Remote changes');
      expect(gitStore.commits[1].message).toBe(localCommitMessage);
      expect(mockGitService.push).toHaveBeenCalledWith(remoteName, 'main');
    });
  });
});
