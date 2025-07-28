import { useGitStore } from '@/stores/gitStore';
import { debug, info, warn } from '@/services/loggerService';
import { gitHooksService, GitHookType } from '@/services/gitHooksService';

/**
 * Debug session type
 */
export enum DebugSessionType {
  STEP_BY_STEP = 'step-by-step',
  BREAKPOINT = 'breakpoint',
  WATCH = 'watch',
  CUSTOM = 'custom',
}

/**
 * Debug session state
 */
export enum DebugSessionState {
  STARTED = 'started',
  PAUSED = 'paused',
  STOPPED = 'stopped',
  COMPLETED = 'completed',
  ERROR = 'error',
}

/**
 * Debug breakpoint
 */
export interface DebugBreakpoint {
  id: string;
  filepath: string;
  lineNumber: number;
  condition?: string;
  hitCount?: number;
}

/**
 * Debug watch expression
 */
export interface DebugWatchExpression {
  id: string;
  expression: string;
  result?: string;
}

/**
 * Debug step
 */
export interface DebugStep {
  id: string;
  timestamp: number;
  filepath: string;
  lineNumber: number;
  stackTrace: string[];
  variables: Record<string, string>;
  output?: string;
}

/**
 * Debug session
 */
export interface DebugSession {
  id: string;
  type: DebugSessionType;
  state: DebugSessionState;
  startTimestamp: number;
  endTimestamp?: number;
  commitHash?: string;
  branch?: string;
  filepath: string;
  breakpoints: DebugBreakpoint[];
  watchExpressions: DebugWatchExpression[];
  steps: DebugStep[];
  error?: string;
}

/**
 * GitDebuggerIntegration
 *
 * This service integrates the debugger with Git to track debugging sessions.
 * It allows tracking debugging sessions and associating them with Git commits.
 */
class GitDebuggerIntegration {
  private static instance: GitDebuggerIntegration;
  private isInitialized: boolean = false;
  private debugSessions: Map<string, DebugSession> = new Map(); // Map of session ID to session
  private activeSession: string | null = null;
  private commitToSessions: Map<string, string[]> = new Map(); // Map of commit hash to session IDs

  private constructor() {}

  public static getInstance(): GitDebuggerIntegration {
    if (!GitDebuggerIntegration.instance) {
      GitDebuggerIntegration.instance = new GitDebuggerIntegration();
    }
    return GitDebuggerIntegration.instance;
  }

  /**
   * Initialize the Git debugger integration
   */
  public initialize(): void {
    if (this.isInitialized) {
      return;
    }

    info('GitDebuggerIntegration', 'Initializing Git debugger integration');

    // Register Git hooks
    this.registerGitHooks();

    this.isInitialized = true;
  }

  /**
   * Start a debug session
   * @param session The debug session to start
   * @returns The started debug session
   */
  public startDebugSession(
    session: Omit<DebugSession, 'id' | 'state' | 'startTimestamp' | 'steps'>,
  ): DebugSession {
    const id = this.generateId();
    const newSession: DebugSession = {
      ...session,
      id,
      state: DebugSessionState.STARTED,
      startTimestamp: Date.now(),
      steps: [],
    };

    this.debugSessions.set(id, newSession);
    this.activeSession = id;

    // If the session is associated with a commit, add it to the commit-to-sessions map
    if (newSession.commitHash) {
      if (!this.commitToSessions.has(newSession.commitHash)) {
        this.commitToSessions.set(newSession.commitHash, []);
      }
      this.commitToSessions.get(newSession.commitHash)!.push(id);
    }

    info('GitDebuggerIntegration', `Started debug session: ${id}`);

    return newSession;
  }

  /**
   * Pause a debug session
   * @param sessionId The ID of the session to pause
   */
  public pauseDebugSession(sessionId: string): void {
    const session = this.debugSessions.get(sessionId);
    if (!session) {
      throw new Error(`Debug session with ID ${sessionId} not found`);
    }

    session.state = DebugSessionState.PAUSED;

    info('GitDebuggerIntegration', `Paused debug session: ${sessionId}`);
  }

  /**
   * Resume a debug session
   * @param sessionId The ID of the session to resume
   */
  public resumeDebugSession(sessionId: string): void {
    const session = this.debugSessions.get(sessionId);
    if (!session) {
      throw new Error(`Debug session with ID ${sessionId} not found`);
    }

    if (session.state !== DebugSessionState.PAUSED) {
      throw new Error(`Debug session with ID ${sessionId} is not paused`);
    }

    session.state = DebugSessionState.STARTED;

    info('GitDebuggerIntegration', `Resumed debug session: ${sessionId}`);
  }

  /**
   * Stop a debug session
   * @param sessionId The ID of the session to stop
   * @param error Optional error message
   */
  public stopDebugSession(sessionId: string, error?: string): void {
    const session = this.debugSessions.get(sessionId);
    if (!session) {
      throw new Error(`Debug session with ID ${sessionId} not found`);
    }

    session.state = error ? DebugSessionState.ERROR : DebugSessionState.STOPPED;
    session.endTimestamp = Date.now();
    session.error = error;

    if (this.activeSession === sessionId) {
      this.activeSession = null;
    }

    info('GitDebuggerIntegration', `Stopped debug session: ${sessionId}`);
  }

  /**
   * Complete a debug session
   * @param sessionId The ID of the session to complete
   */
  public completeDebugSession(sessionId: string): void {
    const session = this.debugSessions.get(sessionId);
    if (!session) {
      throw new Error(`Debug session with ID ${sessionId} not found`);
    }

    session.state = DebugSessionState.COMPLETED;
    session.endTimestamp = Date.now();

    if (this.activeSession === sessionId) {
      this.activeSession = null;
    }

    info('GitDebuggerIntegration', `Completed debug session: ${sessionId}`);
  }

  /**
   * Add a debug step to a session
   * @param sessionId The ID of the session
   * @param step The debug step to add
   * @returns The added debug step
   */
  public addDebugStep(sessionId: string, step: Omit<DebugStep, 'id' | 'timestamp'>): DebugStep {
    const session = this.debugSessions.get(sessionId);
    if (!session) {
      throw new Error(`Debug session with ID ${sessionId} not found`);
    }

    if (session.state !== DebugSessionState.STARTED) {
      throw new Error(`Debug session with ID ${sessionId} is not started`);
    }

    const id = this.generateId();
    const newStep: DebugStep = {
      ...step,
      id,
      timestamp: Date.now(),
    };

    session.steps.push(newStep);

    debug('GitDebuggerIntegration', `Added debug step to session ${sessionId}: ${newStep.id}`);

    return newStep;
  }

  /**
   * Add a breakpoint to a session
   * @param sessionId The ID of the session
   * @param breakpoint The breakpoint to add
   * @returns The added breakpoint
   */
  public addBreakpoint(
    sessionId: string,
    breakpoint: Omit<DebugBreakpoint, 'id'>,
  ): DebugBreakpoint {
    const session = this.debugSessions.get(sessionId);
    if (!session) {
      throw new Error(`Debug session with ID ${sessionId} not found`);
    }

    const id = this.generateId();
    const newBreakpoint: DebugBreakpoint = {
      ...breakpoint,
      id,
    };

    session.breakpoints.push(newBreakpoint);

    debug(
      'GitDebuggerIntegration',
      `Added breakpoint to session ${sessionId}: ${newBreakpoint.id}`,
    );

    return newBreakpoint;
  }

  /**
   * Remove a breakpoint from a session
   * @param sessionId The ID of the session
   * @param breakpointId The ID of the breakpoint to remove
   */
  public removeBreakpoint(sessionId: string, breakpointId: string): void {
    const session = this.debugSessions.get(sessionId);
    if (!session) {
      throw new Error(`Debug session with ID ${sessionId} not found`);
    }

    const index = session.breakpoints.findIndex((b) => b.id === breakpointId);
    if (index === -1) {
      throw new Error(`Breakpoint with ID ${breakpointId} not found in session ${sessionId}`);
    }

    session.breakpoints.splice(index, 1);

    debug(
      'GitDebuggerIntegration',
      `Removed breakpoint from session ${sessionId}: ${breakpointId}`,
    );
  }

  /**
   * Add a watch expression to a session
   * @param sessionId The ID of the session
   * @param watchExpression The watch expression to add
   * @returns The added watch expression
   */
  public addWatchExpression(
    sessionId: string,
    watchExpression: Omit<DebugWatchExpression, 'id'>,
  ): DebugWatchExpression {
    const session = this.debugSessions.get(sessionId);
    if (!session) {
      throw new Error(`Debug session with ID ${sessionId} not found`);
    }

    const id = this.generateId();
    const newWatchExpression: DebugWatchExpression = {
      ...watchExpression,
      id,
    };

    session.watchExpressions.push(newWatchExpression);

    debug(
      'GitDebuggerIntegration',
      `Added watch expression to session ${sessionId}: ${newWatchExpression.id}`,
    );

    return newWatchExpression;
  }

  /**
   * Remove a watch expression from a session
   * @param sessionId The ID of the session
   * @param watchExpressionId The ID of the watch expression to remove
   */
  public removeWatchExpression(sessionId: string, watchExpressionId: string): void {
    const session = this.debugSessions.get(sessionId);
    if (!session) {
      throw new Error(`Debug session with ID ${sessionId} not found`);
    }

    const index = session.watchExpressions.findIndex((w) => w.id === watchExpressionId);
    if (index === -1) {
      throw new Error(
        `Watch expression with ID ${watchExpressionId} not found in session ${sessionId}`,
      );
    }

    session.watchExpressions.splice(index, 1);

    debug(
      'GitDebuggerIntegration',
      `Removed watch expression from session ${sessionId}: ${watchExpressionId}`,
    );
  }

  /**
   * Update a watch expression result
   * @param sessionId The ID of the session
   * @param watchExpressionId The ID of the watch expression
   * @param result The result of the watch expression
   */
  public updateWatchExpressionResult(
    sessionId: string,
    watchExpressionId: string,
    result: string,
  ): void {
    const session = this.debugSessions.get(sessionId);
    if (!session) {
      throw new Error(`Debug session with ID ${sessionId} not found`);
    }

    const watchExpression = session.watchExpressions.find((w) => w.id === watchExpressionId);
    if (!watchExpression) {
      throw new Error(
        `Watch expression with ID ${watchExpressionId} not found in session ${sessionId}`,
      );
    }

    watchExpression.result = result;

    debug(
      'GitDebuggerIntegration',
      `Updated watch expression result in session ${sessionId}: ${watchExpressionId}`,
    );
  }

  /**
   * Get a debug session by ID
   * @param sessionId The ID of the session
   * @returns The debug session
   */
  public getDebugSession(sessionId: string): DebugSession | undefined {
    return this.debugSessions.get(sessionId);
  }

  /**
   * Get all debug sessions
   * @returns All debug sessions
   */
  public getAllDebugSessions(): DebugSession[] {
    return Array.from(this.debugSessions.values());
  }

  /**
   * Get debug sessions for a commit
   * @param commitHash The commit hash
   * @returns Debug sessions for the commit
   */
  public getDebugSessionsForCommit(commitHash: string): DebugSession[] {
    const sessionIds = this.commitToSessions.get(commitHash) || [];
    return sessionIds.map((id) => this.debugSessions.get(id)!).filter(Boolean);
  }

  /**
   * Get the active debug session
   * @returns The active debug session
   */
  public getActiveDebugSession(): DebugSession | null {
    if (!this.activeSession) {
      return null;
    }

    return this.debugSessions.get(this.activeSession) || null;
  }

  /**
   * Associate a debug session with a commit
   * @param sessionId The ID of the session
   * @param commitHash The commit hash
   */
  public associateSessionWithCommit(sessionId: string, commitHash: string): void {
    const session = this.debugSessions.get(sessionId);
    if (!session) {
      throw new Error(`Debug session with ID ${sessionId} not found`);
    }

    // Update the session
    session.commitHash = commitHash;

    // Update the commit-to-sessions map
    if (!this.commitToSessions.has(commitHash)) {
      this.commitToSessions.set(commitHash, []);
    }

    if (!this.commitToSessions.get(commitHash)!.includes(sessionId)) {
      this.commitToSessions.get(commitHash)!.push(sessionId);
    }

    info(
      'GitDebuggerIntegration',
      `Associated debug session ${sessionId} with commit ${commitHash}`,
    );
  }

  /**
   * Register Git hooks
   */
  private registerGitHooks(): void {
    // Register a post-checkout hook to associate debug sessions with the current branch
    gitHooksService.registerHook({
      type: GitHookType.POST_CHECKOUT,
      name: 'associate-debug-sessions-with-branch',
      description: 'Associates debug sessions with the current branch',
      callback: async (data) => {
        if (!data || !data.branch) {
          return true;
        }

        const branch = data.branch;
        const activeSession = this.getActiveDebugSession();

        if (activeSession) {
          activeSession.branch = branch;
          info(
            'GitDebuggerIntegration',
            `Associated active debug session ${activeSession.id} with branch ${branch}`,
          );
        }

        return true;
      },
    });

    debug('GitDebuggerIntegration', 'Registered Git hooks');
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

export const gitDebuggerIntegration = GitDebuggerIntegration.getInstance();
