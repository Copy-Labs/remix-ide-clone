import { useGitStore } from '@/stores/gitStore';
import { debug, info, warn } from '@/services/loggerService';
import { gitHooksService, GitHookType } from '@/services/gitHooksService';

/**
 * Test result status
 */
export enum TestResultStatus {
  PASSED = 'passed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  ERROR = 'error',
}

/**
 * Test result
 */
export interface TestResult {
  id: string;
  name: string;
  status: TestResultStatus;
  duration: number;
  message?: string;
  error?: string;
  timestamp: number;
}

/**
 * Test suite result
 */
export interface TestSuiteResult {
  id: string;
  name: string;
  filepath: string;
  passed: number;
  failed: number;
  skipped: number;
  errors: number;
  duration: number;
  timestamp: number;
  tests: TestResult[];
  commitHash?: string;
}

/**
 * GitTestingIntegration
 *
 * This service integrates the testing framework with Git to track test results in commits.
 * It allows running tests before commits and storing test results with commits.
 */
class GitTestingIntegration {
  private static instance: GitTestingIntegration;
  private isInitialized: boolean = false;
  private testResults: Map<string, TestSuiteResult[]> = new Map(); // Map of commit hash to test results
  private runTestsBeforeCommit: boolean = false;
  private preventCommitOnFailedTests: boolean = false;
  private testingInProgress: boolean = false;

  private constructor() {}

  public static getInstance(): GitTestingIntegration {
    if (!GitTestingIntegration.instance) {
      GitTestingIntegration.instance = new GitTestingIntegration();
    }
    return GitTestingIntegration.instance;
  }

  /**
   * Initialize the Git testing integration
   */
  public initialize(): void {
    if (this.isInitialized) {
      return;
    }

    info('GitTestingIntegration', 'Initializing Git testing integration');

    // Register Git hooks
    this.registerGitHooks();

    this.isInitialized = true;
  }

  /**
   * Set whether to run tests before commit
   * @param enabled Whether to run tests before commit
   */
  public setRunTestsBeforeCommit(enabled: boolean): void {
    this.runTestsBeforeCommit = enabled;
    info('GitTestingIntegration', `Run tests before commit ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get whether to run tests before commit
   * @returns Whether to run tests before commit
   */
  public getRunTestsBeforeCommit(): boolean {
    return this.runTestsBeforeCommit;
  }

  /**
   * Set whether to prevent commit on failed tests
   * @param enabled Whether to prevent commit on failed tests
   */
  public setPreventCommitOnFailedTests(enabled: boolean): void {
    this.preventCommitOnFailedTests = enabled;
    info(
      'GitTestingIntegration',
      `Prevent commit on failed tests ${enabled ? 'enabled' : 'disabled'}`,
    );
  }

  /**
   * Get whether to prevent commit on failed tests
   * @returns Whether to prevent commit on failed tests
   */
  public getPreventCommitOnFailedTests(): boolean {
    return this.preventCommitOnFailedTests;
  }

  /**
   * Store test results for a commit
   * @param commitHash The commit hash
   * @param testResults The test results
   */
  public storeTestResults(commitHash: string, testResults: TestSuiteResult[]): void {
    // Add commit hash to each test suite
    const resultsWithCommit = testResults.map((result) => ({
      ...result,
      commitHash,
    }));

    this.testResults.set(commitHash, resultsWithCommit);

    info(
      'GitTestingIntegration',
      `Stored test results for commit ${commitHash}: ${testResults.length} test suites`,
    );
  }

  /**
   * Get test results for a commit
   * @param commitHash The commit hash
   * @returns The test results for the commit
   */
  public getTestResults(commitHash: string): TestSuiteResult[] {
    return this.testResults.get(commitHash) || [];
  }

  /**
   * Get all test results
   * @returns All test results
   */
  public getAllTestResults(): Map<string, TestSuiteResult[]> {
    return new Map(this.testResults);
  }

  /**
   * Run tests for files
   * @param files The files to run tests for
   * @returns The test results
   */
  public async runTests(files: string[]): Promise<TestSuiteResult[]> {
    if (this.testingInProgress) {
      warn('GitTestingIntegration', 'Tests are already running');
      return [];
    }

    this.testingInProgress = true;

    try {
      info('GitTestingIntegration', `Running tests for ${files.length} files`);

      // In a real implementation, this would run the tests using the testing framework
      // For now, we'll just simulate test results
      const results = this.simulateTestResults(files);

      info('GitTestingIntegration', `Tests completed: ${results.length} test suites`);

      return results;
    } finally {
      this.testingInProgress = false;
    }
  }

  /**
   * Run tests before commit
   * @returns Whether the tests passed
   */
  public async runTestsBeforeCommitHook(): Promise<boolean> {
    if (!this.runTestsBeforeCommit) {
      debug('GitTestingIntegration', 'Run tests before commit is disabled, skipping tests');
      return true;
    }

    info('GitTestingIntegration', 'Running tests before commit');

    // Get the list of staged files
    const gitStore = useGitStore.getState();
    await gitStore.getStatus();
    const { status } = gitStore;

    if (!status || status.files.length === 0) {
      debug('GitTestingIntegration', 'No staged files, skipping tests');
      return true;
    }

    // Get the list of test files related to the staged files
    const stagedFiles = status.files.map((file) => file.file);
    const testFiles = this.findRelatedTestFiles(stagedFiles);

    if (testFiles.length === 0) {
      debug('GitTestingIntegration', 'No related test files found, skipping tests');
      return true;
    }

    // Run the tests
    const results = await this.runTests(testFiles);

    // Check if any tests failed
    const anyFailed = results.some((suite) => suite.failed > 0 || suite.errors > 0);

    if (anyFailed && this.preventCommitOnFailedTests) {
      warn('GitTestingIntegration', 'Tests failed, preventing commit');
      return false;
    }

    return true;
  }

  /**
   * Register Git hooks
   */
  private registerGitHooks(): void {
    // Register a pre-commit hook to run tests before commit
    gitHooksService.registerHook({
      type: GitHookType.PRE_COMMIT,
      name: 'run-tests-before-commit',
      description: 'Runs tests before commit and can prevent commit if tests fail',
      callback: async () => {
        return this.runTestsBeforeCommitHook();
      },
    });

    // Register a post-commit hook to store test results with the commit
    gitHooksService.registerHook({
      type: GitHookType.POST_COMMIT,
      name: 'store-test-results-with-commit',
      description: 'Stores test results with the commit',
      callback: async (data) => {
        if (!data || !data.commitHash) {
          return true;
        }

        const commitHash = data.commitHash;

        // Get the list of files in the commit
        const gitStore = useGitStore.getState();
        const files = await gitStore.getCommitFiles(commitHash);

        if (!files || files.length === 0) {
          debug(
            'GitTestingIntegration',
            `No files in commit ${commitHash}, skipping test result storage`,
          );
          return true;
        }

        // Get the list of test files related to the committed files
        const committedFiles = files.map((file) => file.file);
        const testFiles = this.findRelatedTestFiles(committedFiles);

        if (testFiles.length === 0) {
          debug(
            'GitTestingIntegration',
            `No related test files found for commit ${commitHash}, skipping test result storage`,
          );
          return true;
        }

        // Run the tests
        const results = await this.runTests(testFiles);

        // Store the test results with the commit
        this.storeTestResults(commitHash, results);

        return true;
      },
    });

    debug('GitTestingIntegration', 'Registered Git hooks');
  }

  /**
   * Find test files related to the given files
   * @param files The files to find related test files for
   * @returns The related test files
   */
  private findRelatedTestFiles(files: string[]): string[] {
    // In a real implementation, this would find test files related to the given files
    // For now, we'll just return test files that match the pattern
    const testFiles: string[] = [];

    for (const file of files) {
      // If the file is already a test file, add it
      if (file.includes('test') || file.includes('spec')) {
        testFiles.push(file);
        continue;
      }

      // Otherwise, try to find a related test file
      const fileWithoutExt = file.replace(/\.[^/.]+$/, '');
      const possibleTestFiles = [
        `${fileWithoutExt}.test.js`,
        `${fileWithoutExt}.spec.js`,
        `${fileWithoutExt}.test.ts`,
        `${fileWithoutExt}.spec.ts`,
        `tests/${fileWithoutExt.split('/').pop()}.test.js`,
        `tests/${fileWithoutExt.split('/').pop()}.spec.js`,
        `tests/${fileWithoutExt.split('/').pop()}.test.ts`,
        `tests/${fileWithoutExt.split('/').pop()}.spec.ts`,
      ];

      // In a real implementation, we would check if these files exist
      // For now, we'll just add them to the list
      testFiles.push(...possibleTestFiles);
    }

    return [...new Set(testFiles)]; // Remove duplicates
  }

  /**
   * Simulate test results for files
   * @param files The files to simulate test results for
   * @returns The simulated test results
   */
  private simulateTestResults(files: string[]): TestSuiteResult[] {
    const results: TestSuiteResult[] = [];

    for (const file of files) {
      // Generate a random number of tests
      const numTests = Math.floor(Math.random() * 10) + 1;

      // Generate test results
      const tests: TestResult[] = [];
      let passed = 0;
      let failed = 0;
      let skipped = 0;
      let errors = 0;

      for (let i = 0; i < numTests; i++) {
        // Randomly determine test status
        const statusRandom = Math.random();
        let status: TestResultStatus;

        if (statusRandom < 0.7) {
          status = TestResultStatus.PASSED;
          passed++;
        } else if (statusRandom < 0.9) {
          status = TestResultStatus.FAILED;
          failed++;
        } else if (statusRandom < 0.95) {
          status = TestResultStatus.SKIPPED;
          skipped++;
        } else {
          status = TestResultStatus.ERROR;
          errors++;
        }

        // Generate a test result
        tests.push({
          id: this.generateId(),
          name: `Test ${i + 1}`,
          status,
          duration: Math.random() * 100,
          message: status === TestResultStatus.PASSED ? 'Test passed' : 'Test failed',
          error: status === TestResultStatus.ERROR ? 'Error: Something went wrong' : undefined,
          timestamp: Date.now(),
        });
      }

      // Generate a test suite result
      results.push({
        id: this.generateId(),
        name: file.split('/').pop() || file,
        filepath: file,
        passed,
        failed,
        skipped,
        errors,
        duration: tests.reduce((sum, test) => sum + test.duration, 0),
        timestamp: Date.now(),
        tests,
      });
    }

    return results;
  }

  /**
   * Generate a unique ID
   * @returns A unique ID
   */
  private generateId(): string {
    return (
      Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    );
  }
}

export const gitTestingIntegration = GitTestingIntegration.getInstance();
