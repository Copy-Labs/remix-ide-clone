import { useGitStore } from '@/stores/gitStore';
import { debug, info, warn } from '@/services/loggerService';
import { gitHooksService, GitHookType } from '@/services/gitHooksService';

/**
 * Collaboration user
 */
export interface CollaborationUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  lastActive?: number;
  isOnline?: boolean;
}

/**
 * Collaboration comment
 */
export interface CollaborationComment {
  id: string;
  userId: string;
  text: string;
  filepath: string;
  lineNumber?: number;
  commitHash?: string;
  timestamp: number;
  replies: CollaborationComment[];
  resolved?: boolean;
}

/**
 * Collaboration review
 */
export interface CollaborationReview {
  id: string;
  userId: string;
  commitHash: string;
  status: 'pending' | 'approved' | 'rejected' | 'changes-requested';
  comments: CollaborationComment[];
  timestamp: number;
}

/**
 * Collaboration session
 */
export interface CollaborationSession {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: number;
  activeUsers: string[];
  branch: string;
  isActive: boolean;
}

/**
 * GitCollaborationIntegration
 *
 * This service provides support for Git-based collaboration features.
 * It allows users to collaborate on code, leave comments, and review changes.
 */
class GitCollaborationIntegration {
  private static instance: GitCollaborationIntegration;
  private isInitialized: boolean = false;
  private currentUser: CollaborationUser | null = null;
  private users: Map<string, CollaborationUser> = new Map();
  private comments: CollaborationComment[] = [];
  private reviews: Map<string, CollaborationReview[]> = new Map(); // Map of commit hash to reviews
  private sessions: Map<string, CollaborationSession> = new Map(); // Map of session ID to session
  private activeSession: string | null = null;

  private constructor() {}

  public static getInstance(): GitCollaborationIntegration {
    if (!GitCollaborationIntegration.instance) {
      GitCollaborationIntegration.instance = new GitCollaborationIntegration();
    }
    return GitCollaborationIntegration.instance;
  }

  /**
   * Initialize the Git collaboration integration
   */
  public initialize(): void {
    if (this.isInitialized) {
      return;
    }

    info('GitCollaborationIntegration', 'Initializing Git collaboration integration');

    // Load saved data
    this.loadData();

    // Register Git hooks
    this.registerGitHooks();

    this.isInitialized = true;
  }

  /**
   * Set the current user
   * @param user The user to set as current
   */
  public setCurrentUser(user: CollaborationUser): void {
    this.currentUser = user;
    this.users.set(user.id, user);
    info('GitCollaborationIntegration', `Set current user: ${user.name} (${user.email})`);
  }

  /**
   * Get the current user
   * @returns The current user
   */
  public getCurrentUser(): CollaborationUser | null {
    return this.currentUser;
  }

  /**
   * Add a user
   * @param user The user to add
   */
  public addUser(user: CollaborationUser): void {
    this.users.set(user.id, user);
    info('GitCollaborationIntegration', `Added user: ${user.name} (${user.email})`);
  }

  /**
   * Get a user by ID
   * @param userId The user ID
   * @returns The user
   */
  public getUser(userId: string): CollaborationUser | undefined {
    return this.users.get(userId);
  }

  /**
   * Get all users
   * @returns All users
   */
  public getUsers(): CollaborationUser[] {
    return Array.from(this.users.values());
  }

  /**
   * Add a comment
   * @param comment The comment to add
   * @returns The added comment
   */
  public addComment(
    comment: Omit<CollaborationComment, 'id' | 'timestamp' | 'replies'>,
  ): CollaborationComment {
    if (!this.currentUser) {
      throw new Error('No current user set');
    }

    const id = this.generateId();
    const newComment: CollaborationComment = {
      ...comment,
      id,
      userId: this.currentUser.id,
      timestamp: Date.now(),
      replies: [],
    };

    this.comments.push(newComment);

    info('GitCollaborationIntegration', `Added comment: ${newComment.id}`);

    return newComment;
  }

  /**
   * Add a reply to a comment
   * @param commentId The ID of the comment to reply to
   * @param reply The reply to add
   * @returns The added reply
   */
  public addReply(
    commentId: string,
    reply: Omit<CollaborationComment, 'id' | 'timestamp' | 'replies'>,
  ): CollaborationComment {
    if (!this.currentUser) {
      throw new Error('No current user set');
    }

    const comment = this.findComment(commentId);
    if (!comment) {
      throw new Error(`Comment with ID ${commentId} not found`);
    }

    const id = this.generateId();
    const newReply: CollaborationComment = {
      ...reply,
      id,
      userId: this.currentUser.id,
      timestamp: Date.now(),
      replies: [],
    };

    comment.replies.push(newReply);

    info('GitCollaborationIntegration', `Added reply to comment ${commentId}: ${newReply.id}`);

    return newReply;
  }

  /**
   * Resolve or unresolve a comment
   * @param commentId The ID of the comment to resolve or unresolve
   * @param resolved Whether the comment should be resolved
   */
  public resolveComment(commentId: string, resolved: boolean): void {
    const comment = this.findComment(commentId);
    if (!comment) {
      throw new Error(`Comment with ID ${commentId} not found`);
    }

    comment.resolved = resolved;

    info(
      'GitCollaborationIntegration',
      `${resolved ? 'Resolved' : 'Unresolved'} comment: ${commentId}`,
    );
  }

  /**
   * Get comments for a file
   * @param filepath The file path
   * @returns Comments for the file
   */
  public getCommentsForFile(filepath: string): CollaborationComment[] {
    return this.comments.filter((comment) => comment.filepath === filepath);
  }

  /**
   * Get comments for a commit
   * @param commitHash The commit hash
   * @returns Comments for the commit
   */
  public getCommentsForCommit(commitHash: string): CollaborationComment[] {
    return this.comments.filter((comment) => comment.commitHash === commitHash);
  }

  /**
   * Create a review for a commit
   * @param review The review to create
   * @returns The created review
   */
  public createReview(review: Omit<CollaborationReview, 'id' | 'timestamp'>): CollaborationReview {
    if (!this.currentUser) {
      throw new Error('No current user set');
    }

    const id = this.generateId();
    const newReview: CollaborationReview = {
      ...review,
      id,
      userId: this.currentUser.id,
      timestamp: Date.now(),
    };

    if (!this.reviews.has(review.commitHash)) {
      this.reviews.set(review.commitHash, []);
    }

    this.reviews.get(review.commitHash)!.push(newReview);

    info(
      'GitCollaborationIntegration',
      `Created review for commit ${review.commitHash}: ${newReview.id}`,
    );

    return newReview;
  }

  /**
   * Get reviews for a commit
   * @param commitHash The commit hash
   * @returns Reviews for the commit
   */
  public getReviewsForCommit(commitHash: string): CollaborationReview[] {
    return this.reviews.get(commitHash) || [];
  }

  /**
   * Create a collaboration session
   * @param session The session to create
   * @returns The created session
   */
  public createSession(
    session: Omit<CollaborationSession, 'id' | 'createdAt' | 'activeUsers' | 'isActive'>,
  ): CollaborationSession {
    if (!this.currentUser) {
      throw new Error('No current user set');
    }

    const id = this.generateId();
    const newSession: CollaborationSession = {
      ...session,
      id,
      createdBy: this.currentUser.id,
      createdAt: Date.now(),
      activeUsers: [this.currentUser.id],
      isActive: true,
    };

    this.sessions.set(id, newSession);

    info(
      'GitCollaborationIntegration',
      `Created collaboration session: ${newSession.name} (${newSession.id})`,
    );

    return newSession;
  }

  /**
   * Join a collaboration session
   * @param sessionId The ID of the session to join
   */
  public joinSession(sessionId: string): void {
    if (!this.currentUser) {
      throw new Error('No current user set');
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session with ID ${sessionId} not found`);
    }

    if (!session.isActive) {
      throw new Error(`Session with ID ${sessionId} is not active`);
    }

    if (!session.activeUsers.includes(this.currentUser.id)) {
      session.activeUsers.push(this.currentUser.id);
    }

    this.activeSession = sessionId;

    info(
      'GitCollaborationIntegration',
      `Joined collaboration session: ${session.name} (${session.id})`,
    );
  }

  /**
   * Leave a collaboration session
   * @param sessionId The ID of the session to leave
   */
  public leaveSession(sessionId: string): void {
    if (!this.currentUser) {
      throw new Error('No current user set');
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session with ID ${sessionId} not found`);
    }

    const index = session.activeUsers.indexOf(this.currentUser.id);
    if (index !== -1) {
      session.activeUsers.splice(index, 1);
    }

    if (this.activeSession === sessionId) {
      this.activeSession = null;
    }

    info(
      'GitCollaborationIntegration',
      `Left collaboration session: ${session.name} (${session.id})`,
    );
  }

  /**
   * End a collaboration session
   * @param sessionId The ID of the session to end
   */
  public endSession(sessionId: string): void {
    if (!this.currentUser) {
      throw new Error('No current user set');
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session with ID ${sessionId} not found`);
    }

    if (session.createdBy !== this.currentUser.id) {
      throw new Error(`Only the creator of the session can end it`);
    }

    session.isActive = false;
    session.activeUsers = [];

    if (this.activeSession === sessionId) {
      this.activeSession = null;
    }

    info(
      'GitCollaborationIntegration',
      `Ended collaboration session: ${session.name} (${session.id})`,
    );
  }

  /**
   * Get all collaboration sessions
   * @returns All collaboration sessions
   */
  public getSessions(): CollaborationSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get active collaboration sessions
   * @returns Active collaboration sessions
   */
  public getActiveSessions(): CollaborationSession[] {
    return Array.from(this.sessions.values()).filter((session) => session.isActive);
  }

  /**
   * Get the active collaboration session
   * @returns The active collaboration session
   */
  public getActiveSession(): CollaborationSession | null {
    if (!this.activeSession) {
      return null;
    }

    return this.sessions.get(this.activeSession) || null;
  }

  /**
   * Register Git hooks
   */
  private registerGitHooks(): void {
    // Register a post-commit hook to notify collaborators of new commits
    gitHooksService.registerHook({
      type: GitHookType.POST_COMMIT,
      name: 'notify-collaborators-of-commit',
      description: 'Notifies collaborators when a new commit is created',
      callback: async (data) => {
        if (!data || !data.commitHash) {
          return true;
        }

        const commitHash = data.commitHash;
        const activeSession = this.getActiveSession();

        if (!activeSession) {
          debug(
            'GitCollaborationIntegration',
            'No active collaboration session, skipping notification',
          );
          return true;
        }

        info('GitCollaborationIntegration', `Notifying collaborators of new commit: ${commitHash}`);

        // In a real implementation, this would send a notification to collaborators
        // For now, we'll just log it
        const collaborators = activeSession.activeUsers
          .filter((userId) => userId !== this.currentUser?.id)
          .map((userId) => this.users.get(userId)?.name || userId)
          .join(', ');

        info('GitCollaborationIntegration', `Notified collaborators: ${collaborators}`);

        return true;
      },
    });

    debug('GitCollaborationIntegration', 'Registered Git hooks');
  }

  /**
   * Find a comment by ID
   * @param commentId The comment ID
   * @returns The comment
   */
  private findComment(commentId: string): CollaborationComment | undefined {
    // Check top-level comments
    const comment = this.comments.find((c) => c.id === commentId);
    if (comment) {
      return comment;
    }

    // Check replies
    for (const c of this.comments) {
      const reply = c.replies.find((r) => r.id === commentId);
      if (reply) {
        return reply;
      }
    }

    return undefined;
  }

  /**
   * Load saved data
   */
  private loadData(): void {
    // In a real implementation, this would load data from persistent storage
    // For now, we'll just initialize with some sample data

    // Add sample users
    const user1: CollaborationUser = {
      id: this.generateId(),
      name: 'John Doe',
      email: 'john.doe@example.com',
      avatarUrl: 'https://example.com/avatar1.png',
      lastActive: Date.now(),
      isOnline: true,
    };

    const user2: CollaborationUser = {
      id: this.generateId(),
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      avatarUrl: 'https://example.com/avatar2.png',
      lastActive: Date.now() - 3600000, // 1 hour ago
      isOnline: false,
    };

    this.users.set(user1.id, user1);
    this.users.set(user2.id, user2);

    // Set current user
    this.currentUser = user1;

    debug('GitCollaborationIntegration', `Loaded ${this.users.size} users`);
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

export const gitCollaborationIntegration = GitCollaborationIntegration.getInstance();
