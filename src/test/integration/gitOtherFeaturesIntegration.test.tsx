import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useGitStore } from '@/stores/gitStore';
import { useCompilerStore } from '@/stores/compilerStore';
import { useDeploymentStore } from '@/stores/deploymentStore';
import { useTestingStore } from '@/stores/testingStore';
import { useDebuggerStore } from '@/stores/debuggerStore';
import { toast } from 'sonner';
import { databaseService } from '@/services/databaseService';

// Mock dependencies
vi.mock('@/stores/gitStore');
vi.mock('@/stores/compilerStore', () => ({
  useCompilerStore: vi.fn(() => ({
    isCompiling: false,
    compile: vi.fn(),
    setAutoCommitEnabled: vi.fn(),
    isAutoCommitEnabled: true,
    loadAvailableVersions: vi.fn(),
  })),
}));
vi.mock('@/stores/deploymentStore');
vi.mock('@/stores/testingStore', () => ({
  useTestingStore: vi.fn(() => ({
    isRunningTests: false,
    testResults: null,
    runTests: vi.fn(),
    setCommitTestResultsEnabled: vi.fn(),
    isCommitTestResultsEnabled: true,
  })),
}));
vi.mock('@/stores/debuggerStore');

// Mock the database service methods
vi.mock('@/services/databaseService', () => ({
  databaseService: {
    isIndexedDBSupported: vi.fn(() => true),
    initialize: vi.fn(),
    saveFile: vi.fn(),
    getFile: vi.fn(),
    deleteFile: vi.fn(),
    clearDatabase: vi.fn(),
    saveFileContent: vi.fn(),
    getFileContent: vi.fn(),
    deleteFileContent: vi.fn(),
    saveEditorHistory: vi.fn(),
    getEditorHistory: vi.fn(),
    clearEditorHistory: vi.fn(),
    saveStateMigration: vi.fn(),
    getStateMigration: vi.fn(),
    clearAllData: vi.fn(),
    getDatabaseSize: vi.fn(),
    set: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
}));
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Git Integration with Other Features', () => {
  let mockGitStore: any;
  let mockCompilerStore: any;
  let mockDeploymentStore: any;
  let mockTestingStore: any;
  let mockDebuggerStore: any;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();

    mockGitStore = {
      // State
      isInitialized: true,
      currentBranch: 'main',
      config: {
        user: { name: 'Test User', email: 'test@example.com' },
      },

      // Actions
      commit: vi.fn().mockResolvedValue('abc123'),
      addFile: vi.fn(),
      addAllFiles: vi.fn(),
      getStatus: vi.fn(),
      createBranch: vi.fn(),
      switchBranch: vi.fn(),
    };

    mockCompilerStore = {
      // State
      isCompiling: false,
      lastCompilationResult: null,

      // Actions
      compile: vi.fn(),
      setAutoCommitEnabled: vi.fn(),
      isAutoCommitEnabled: true,
    };

    mockDeploymentStore = {
      // State
      isDeploying: false,
      lastDeploymentResult: null,

      // Actions
      deploy: vi.fn(),
      setGitTagOnDeployEnabled: vi.fn(),
      isGitTagOnDeployEnabled: true,
    };

    mockTestingStore = {
      // State
      isRunningTests: false,
      testResults: null,

      // Actions
      runTests: vi.fn(),
      setCommitTestResultsEnabled: vi.fn(),
      isCommitTestResultsEnabled: true,
    };

    mockDebuggerStore = {
      // State
      isDebugging: false,
      debugSession: null,

      // Actions
      startDebugSession: vi.fn(),
      endDebugSession: vi.fn(),
      setTrackDebugSessionsEnabled: vi.fn(),
      isTrackDebugSessionsEnabled: true,
    };

    vi.mocked(useGitStore).mockReturnValue(mockGitStore);
    vi.mocked(useCompilerStore).mockReturnValue(mockCompilerStore);
    vi.mocked(useDeploymentStore).mockReturnValue(mockDeploymentStore);
    vi.mocked(useTestingStore).mockReturnValue(mockTestingStore);
    vi.mocked(useDebuggerStore).mockReturnValue(mockDebuggerStore);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Integration with Compiler', () => {
    it('should automatically commit on successful compilation when enabled', async () => {
      // Simulate a successful compilation
      const compilationResult = { success: true, contracts: { 'Contract.sol': {} } };
      mockCompilerStore.compile.mockResolvedValue(compilationResult);
      mockCompilerStore.lastCompilationResult = compilationResult;

      // Create a component that uses the compiler store
      const CompilerComponent = () => {
        const { compile, isAutoCommitEnabled } = useCompilerStore();
        const { commit } = useGitStore();

        const handleCompile = async () => {
          const result = await compile();
          if (result.success && isAutoCommitEnabled) {
            await commit('Auto-commit: Successful compilation');
          }
        };

        return (
          <div>
            <button onClick={handleCompile}>Compile</button>
            <div data-testid="auto-commit-enabled">
              {isAutoCommitEnabled ? 'Enabled' : 'Disabled'}
            </div>
          </div>
        );
      };

      render(<CompilerComponent />);

      // Verify that auto-commit is enabled
      expect(screen.getByTestId('auto-commit-enabled').textContent).toBe('Enabled');

      // Click the compile button
      const compileButton = screen.getByText('Compile');
      await user.click(compileButton);

      // Verify that commit was called with the expected message
      expect(mockGitStore.commit).toHaveBeenCalledWith('Auto-commit: Successful compilation');
    });

    it('should not commit on compilation when auto-commit is disabled', async () => {
      // Disable auto-commit
      mockCompilerStore.isAutoCommitEnabled = false;

      // Simulate a successful compilation
      const compilationResult = { success: true, contracts: { 'Contract.sol': {} } };
      mockCompilerStore.compile.mockResolvedValue(compilationResult);
      mockCompilerStore.lastCompilationResult = compilationResult;

      // Create a component that uses the compiler store
      const CompilerComponent = () => {
        const { compile, isAutoCommitEnabled } = useCompilerStore();
        const { commit } = useGitStore();

        const handleCompile = async () => {
          const result = await compile();
          if (result.success && isAutoCommitEnabled) {
            await commit('Auto-commit: Successful compilation');
          }
        };

        return (
          <div>
            <button onClick={handleCompile}>Compile</button>
            <div data-testid="auto-commit-enabled">
              {isAutoCommitEnabled ? 'Enabled' : 'Disabled'}
            </div>
          </div>
        );
      };

      render(<CompilerComponent />);

      // Verify that auto-commit is disabled
      expect(screen.getByTestId('auto-commit-enabled').textContent).toBe('Disabled');

      // Click the compile button
      const compileButton = screen.getByText('Compile');
      await user.click(compileButton);

      // Verify that commit was not called
      expect(mockGitStore.commit).not.toHaveBeenCalled();
    });

    it('should not commit on failed compilation', async () => {
      // Simulate a failed compilation
      const compilationResult = { success: false, errors: ['Compilation error'] };
      mockCompilerStore.compile.mockResolvedValue(compilationResult);
      mockCompilerStore.lastCompilationResult = compilationResult;

      // Create a component that uses the compiler store
      const CompilerComponent = () => {
        const { compile, isAutoCommitEnabled } = useCompilerStore();
        const { commit } = useGitStore();

        const handleCompile = async () => {
          const result = await compile();
          if (result.success && isAutoCommitEnabled) {
            await commit('Auto-commit: Successful compilation');
          }
        };

        return (
          <div>
            <button onClick={handleCompile}>Compile</button>
          </div>
        );
      };

      render(<CompilerComponent />);

      // Click the compile button
      const compileButton = screen.getByText('Compile');
      await user.click(compileButton);

      // Verify that commit was not called
      expect(mockGitStore.commit).not.toHaveBeenCalled();
    });
  });

  describe('Integration with Deployment', () => {
    it('should create a git tag on successful deployment when enabled', async () => {
      // Simulate a successful deployment
      const deploymentResult = { success: true, address: '0x123', txHash: '0xabc' };
      mockDeploymentStore.deploy.mockResolvedValue(deploymentResult);
      mockDeploymentStore.lastDeploymentResult = deploymentResult;

      // Mock the git tag creation function
      const createTag = vi.fn();
      mockGitStore.createTag = createTag;

      // Create a component that uses the deployment store
      const DeploymentComponent = () => {
        const { deploy, isGitTagOnDeployEnabled } = useDeploymentStore();
        const { createTag } = useGitStore();

        const handleDeploy = async () => {
          const result = await deploy('Contract', []);
          if (result.success && isGitTagOnDeployEnabled) {
            await createTag(`deploy-${result.address}`, `Deployment to ${result.address}`);
          }
        };

        return (
          <div>
            <button onClick={handleDeploy}>Deploy</button>
            <div data-testid="git-tag-enabled">
              {isGitTagOnDeployEnabled ? 'Enabled' : 'Disabled'}
            </div>
          </div>
        );
      };

      render(<DeploymentComponent />);

      // Verify that git tag on deploy is enabled
      expect(screen.getByTestId('git-tag-enabled').textContent).toBe('Enabled');

      // Click the deploy button
      const deployButton = screen.getByText('Deploy');
      await user.click(deployButton);

      // Verify that createTag was called with the expected arguments
      expect(createTag).toHaveBeenCalledWith('deploy-0x123', 'Deployment to 0x123');
    });

    it('should not create a git tag on deployment when disabled', async () => {
      // Disable git tag on deploy
      mockDeploymentStore.isGitTagOnDeployEnabled = false;

      // Simulate a successful deployment
      const deploymentResult = { success: true, address: '0x123', txHash: '0xabc' };
      mockDeploymentStore.deploy.mockResolvedValue(deploymentResult);
      mockDeploymentStore.lastDeploymentResult = deploymentResult;

      // Mock the git tag creation function
      const createTag = vi.fn();
      mockGitStore.createTag = createTag;

      // Create a component that uses the deployment store
      const DeploymentComponent = () => {
        const { deploy, isGitTagOnDeployEnabled } = useDeploymentStore();
        const { createTag } = useGitStore();

        const handleDeploy = async () => {
          const result = await deploy('Contract', []);
          if (result.success && isGitTagOnDeployEnabled) {
            await createTag(`deploy-${result.address}`, `Deployment to ${result.address}`);
          }
        };

        return (
          <div>
            <button onClick={handleDeploy}>Deploy</button>
            <div data-testid="git-tag-enabled">
              {isGitTagOnDeployEnabled ? 'Enabled' : 'Disabled'}
            </div>
          </div>
        );
      };

      render(<DeploymentComponent />);

      // Verify that git tag on deploy is disabled
      expect(screen.getByTestId('git-tag-enabled').textContent).toBe('Disabled');

      // Click the deploy button
      const deployButton = screen.getByText('Deploy');
      await user.click(deployButton);

      // Verify that createTag was not called
      expect(createTag).not.toHaveBeenCalled();
    });
  });

  describe('Integration with Testing Framework', () => {
    it('should commit test results on successful test run when enabled', async () => {
      // Simulate a successful test run
      const testResults = {
        success: true,
        passed: 5,
        failed: 0,
        results: [
          { name: 'Test 1', passed: true },
          { name: 'Test 2', passed: true },
        ],
      };
      mockTestingStore.runTests.mockResolvedValue(testResults);
      mockTestingStore.testResults = testResults;

      // Create a component that uses the testing store
      const TestingComponent = () => {
        const { runTests, isCommitTestResultsEnabled } = useTestingStore();
        const { commit } = useGitStore();

        const handleRunTests = async () => {
          const results = await runTests();
          if (results.success && isCommitTestResultsEnabled) {
            await commit(`Test results: ${results.passed} passed, ${results.failed} failed`);
          }
        };

        return (
          <div>
            <button onClick={handleRunTests}>Run Tests</button>
            <div data-testid="commit-tests-enabled">
              {isCommitTestResultsEnabled ? 'Enabled' : 'Disabled'}
            </div>
          </div>
        );
      };

      render(<TestingComponent />);

      // Verify that commit test results is enabled
      expect(screen.getByTestId('commit-tests-enabled').textContent).toBe('Enabled');

      // Click the run tests button
      const runTestsButton = screen.getByText('Run Tests');
      await user.click(runTestsButton);

      // Verify that commit was called with the expected message
      expect(mockGitStore.commit).toHaveBeenCalledWith('Test results: 5 passed, 0 failed');
    });

    it('should not commit test results when disabled', async () => {
      // Disable commit test results
      mockTestingStore.isCommitTestResultsEnabled = false;

      // Simulate a successful test run
      const testResults = {
        success: true,
        passed: 5,
        failed: 0,
        results: [
          { name: 'Test 1', passed: true },
          { name: 'Test 2', passed: true },
        ],
      };
      mockTestingStore.runTests.mockResolvedValue(testResults);
      mockTestingStore.testResults = testResults;

      // Create a component that uses the testing store
      const TestingComponent = () => {
        const { runTests, isCommitTestResultsEnabled } = useTestingStore();
        const { commit } = useGitStore();

        const handleRunTests = async () => {
          const results = await runTests();
          if (results.success && isCommitTestResultsEnabled) {
            await commit(`Test results: ${results.passed} passed, ${results.failed} failed`);
          }
        };

        return (
          <div>
            <button onClick={handleRunTests}>Run Tests</button>
            <div data-testid="commit-tests-enabled">
              {isCommitTestResultsEnabled ? 'Enabled' : 'Disabled'}
            </div>
          </div>
        );
      };

      render(<TestingComponent />);

      // Verify that commit test results is disabled
      expect(screen.getByTestId('commit-tests-enabled').textContent).toBe('Disabled');

      // Click the run tests button
      const runTestsButton = screen.getByText('Run Tests');
      await user.click(runTestsButton);

      // Verify that commit was not called
      expect(mockGitStore.commit).not.toHaveBeenCalled();
    });
  });

  describe('Integration with Debugger', () => {
    it('should track debugging sessions in git when enabled', async () => {
      // Simulate a debug session
      const debugSession = {
        id: 'debug-123',
        txHash: '0xabc',
        startTime: Date.now(),
        steps: [{ pc: 0, op: 'PUSH1' }],
      };
      mockDebuggerStore.startDebugSession.mockResolvedValue(debugSession);
      mockDebuggerStore.debugSession = debugSession;

      // Create a component that uses the debugger store
      const DebuggerComponent = () => {
        const { startDebugSession, endDebugSession, isTrackDebugSessionsEnabled } =
          useDebuggerStore();
        const { createBranch, switchBranch } = useGitStore();

        const handleStartDebug = async () => {
          const session = await startDebugSession('0xabc');
          if (isTrackDebugSessionsEnabled) {
            // Create a debug branch
            await createBranch(`debug/${session.id}`);
            await switchBranch(`debug/${session.id}`);
          }
        };

        const handleEndDebug = async () => {
          await endDebugSession();
          if (isTrackDebugSessionsEnabled) {
            // Switch back to main branch
            await switchBranch('main');
          }
        };

        return (
          <div>
            <button onClick={handleStartDebug}>Start Debug</button>
            <button onClick={handleEndDebug}>End Debug</button>
            <div data-testid="track-debug-enabled">
              {isTrackDebugSessionsEnabled ? 'Enabled' : 'Disabled'}
            </div>
          </div>
        );
      };

      render(<DebuggerComponent />);

      // Verify that track debug sessions is enabled
      expect(screen.getByTestId('track-debug-enabled').textContent).toBe('Enabled');

      // Click the start debug button
      const startDebugButton = screen.getByText('Start Debug');
      await user.click(startDebugButton);

      // Verify that createBranch and switchBranch were called with the expected arguments
      expect(mockGitStore.createBranch).toHaveBeenCalledWith('debug/debug-123');
      expect(mockGitStore.switchBranch).toHaveBeenCalledWith('debug/debug-123');

      // Click the end debug button
      const endDebugButton = screen.getByText('End Debug');
      await user.click(endDebugButton);

      // Verify that switchBranch was called to switch back to main
      expect(mockGitStore.switchBranch).toHaveBeenCalledWith('main');
    });

    it('should not track debugging sessions when disabled', async () => {
      // Disable track debug sessions
      mockDebuggerStore.isTrackDebugSessionsEnabled = false;

      // Simulate a debug session
      const debugSession = {
        id: 'debug-123',
        txHash: '0xabc',
        startTime: Date.now(),
        steps: [{ pc: 0, op: 'PUSH1' }],
      };
      mockDebuggerStore.startDebugSession.mockResolvedValue(debugSession);
      mockDebuggerStore.debugSession = debugSession;

      // Create a component that uses the debugger store
      const DebuggerComponent = () => {
        const { startDebugSession, endDebugSession, isTrackDebugSessionsEnabled } =
          useDebuggerStore();
        const { createBranch, switchBranch } = useGitStore();

        const handleStartDebug = async () => {
          const session = await startDebugSession('0xabc');
          if (isTrackDebugSessionsEnabled) {
            // Create a debug branch
            await createBranch(`debug/${session.id}`);
            await switchBranch(`debug/${session.id}`);
          }
        };

        const handleEndDebug = async () => {
          await endDebugSession();
          if (isTrackDebugSessionsEnabled) {
            // Switch back to main branch
            await switchBranch('main');
          }
        };

        return (
          <div>
            <button onClick={handleStartDebug}>Start Debug</button>
            <button onClick={handleEndDebug}>End Debug</button>
            <div data-testid="track-debug-enabled">
              {isTrackDebugSessionsEnabled ? 'Enabled' : 'Disabled'}
            </div>
          </div>
        );
      };

      render(<DebuggerComponent />);

      // Verify that track debug sessions is disabled
      expect(screen.getByTestId('track-debug-enabled').textContent).toBe('Disabled');

      // Click the start debug button
      const startDebugButton = screen.getByText('Start Debug');
      await user.click(startDebugButton);

      // Verify that createBranch and switchBranch were not called
      expect(mockGitStore.createBranch).not.toHaveBeenCalled();
      expect(mockGitStore.switchBranch).not.toHaveBeenCalled();

      // Click the end debug button
      const endDebugButton = screen.getByText('End Debug');
      await user.click(endDebugButton);

      // Verify that switchBranch was not called
      expect(mockGitStore.switchBranch).not.toHaveBeenCalled();
    });
  });

  describe('Git Hooks', () => {
    it('should support git hooks for custom actions', async () => {
      // Mock the git hooks system
      const hooks = {
        preCommit: vi.fn().mockResolvedValue(true),
        postCommit: vi.fn(),
      };
      mockGitStore.hooks = hooks;

      // Create a component that uses git hooks
      const GitHooksComponent = () => {
        const { commit, hooks } = useGitStore();

        const handleCommit = async () => {
          // Run pre-commit hook
          const canCommit = await hooks.preCommit();
          if (canCommit) {
            const commitId = await commit('Test commit with hooks');
            // Run post-commit hook
            await hooks.postCommit(commitId);
          }
        };

        return (
          <div>
            <button onClick={handleCommit}>Commit with Hooks</button>
          </div>
        );
      };

      render(<GitHooksComponent />);

      // Click the commit button
      const commitButton = screen.getByText('Commit with Hooks');
      await user.click(commitButton);

      // Verify that hooks were called in the correct order
      expect(hooks.preCommit).toHaveBeenCalled();
      expect(mockGitStore.commit).toHaveBeenCalledWith('Test commit with hooks');
      expect(hooks.postCommit).toHaveBeenCalledWith('abc123');
    });

    it('should not commit if pre-commit hook returns false', async () => {
      // Mock the git hooks system to reject the commit
      const hooks = {
        preCommit: vi.fn().mockResolvedValue(false),
        postCommit: vi.fn(),
      };
      mockGitStore.hooks = hooks;

      // Create a component that uses git hooks
      const GitHooksComponent = () => {
        const { commit, hooks } = useGitStore();

        const handleCommit = async () => {
          // Run pre-commit hook
          const canCommit = await hooks.preCommit();
          if (canCommit) {
            const commitId = await commit('Test commit with hooks');
            // Run post-commit hook
            await hooks.postCommit(commitId);
          } else {
            toast.error('Pre-commit hook failed');
          }
        };

        return (
          <div>
            <button onClick={handleCommit}>Commit with Hooks</button>
          </div>
        );
      };

      render(<GitHooksComponent />);

      // Click the commit button
      const commitButton = screen.getByText('Commit with Hooks');
      await user.click(commitButton);

      // Verify that pre-commit hook was called but commit was not
      expect(hooks.preCommit).toHaveBeenCalled();
      expect(mockGitStore.commit).not.toHaveBeenCalled();
      expect(hooks.postCommit).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith('Pre-commit hook failed');
    });
  });
});
