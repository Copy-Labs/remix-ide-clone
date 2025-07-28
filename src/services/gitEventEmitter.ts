/**
 * GitEventEmitter provides a standardized way to emit and listen for Git-related events.
 * This allows UI components to be notified of Git operations without tightly coupling them to the gitStore.
 */
import { useEffect } from 'react';

// Define all possible Git event types
export enum GitEventType {
  // Repository events
  REPOSITORY_INITIALIZED = 'repository:initialized',
  REPOSITORY_CLONED = 'repository:cloned',

  // Branch events
  BRANCH_CREATED = 'branch:created',
  BRANCH_SWITCHED = 'branch:switched',
  BRANCH_DELETED = 'branch:deleted',
  BRANCHES_UPDATED = 'branches:updated',

  // Commit events
  COMMIT_CREATED = 'commit:created',
  COMMITS_UPDATED = 'commits:updated',

  // File events
  FILE_STAGED = 'file:staged',
  FILE_UNSTAGED = 'file:unstaged',
  FILES_STAGED = 'files:staged',
  STATUS_UPDATED = 'status:updated',

  // Remote events
  REMOTE_ADDED = 'remote:added',
  REMOTE_REMOVED = 'remote:removed',
  PUSH_COMPLETED = 'push:completed',
  PUSH_ERROR = 'push:error',
  PULL_COMPLETED = 'pull:completed',
  PULL_ERROR = 'pull:error',

  // GitHub events
  GITHUB_CONNECTED = 'github:connected',
  GITHUB_DISCONNECTED = 'github:disconnected',
  GITHUB_REPOS_UPDATED = 'github:repos:updated',

  // Error events
  ERROR_OCCURRED = 'error:occurred',

  // Other events
  LOADING_STARTED = 'loading:started',
  LOADING_FINISHED = 'loading:finished',
}

// Define the structure of a Git event
export interface GitEvent<T = any> {
  type: GitEventType;
  payload: T;
  timestamp: number;
}

// Define the structure of an event listener
type GitEventListener<T = any> = (event: GitEvent<T>) => void;

/**
 * GitEventEmitter class for emitting and listening to Git events
 */
export class GitEventEmitter {
  private listeners: Map<GitEventType, Set<GitEventListener>> = new Map();
  private static instance: GitEventEmitter;

  // Private constructor to enforce singleton pattern
  private constructor() {}

  /**
   * Get the singleton instance of GitEventEmitter
   */
  public static getInstance(): GitEventEmitter {
    if (!GitEventEmitter.instance) {
      GitEventEmitter.instance = new GitEventEmitter();
    }
    return GitEventEmitter.instance;
  }

  /**
   * Add an event listener for a specific event type
   * @param type The event type to listen for
   * @param listener The callback function to execute when the event occurs
   * @returns A function to remove the listener
   */
  public on<T = any>(type: GitEventType, listener: GitEventListener<T>): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }

    this.listeners.get(type)!.add(listener as GitEventListener);

    // Return a function to remove this listener
    return () => {
      this.off(type, listener);
    };
  }

  /**
   * Remove an event listener for a specific event type
   * @param type The event type to stop listening for
   * @param listener The callback function to remove
   */
  public off<T = any>(type: GitEventType, listener: GitEventListener<T>): void {
    if (!this.listeners.has(type)) {
      return;
    }

    this.listeners.get(type)!.delete(listener as GitEventListener);

    // Clean up if there are no more listeners for this type
    if (this.listeners.get(type)!.size === 0) {
      this.listeners.delete(type);
    }
  }

  /**
   * Add a one-time event listener for a specific event type
   * @param type The event type to listen for
   * @param listener The callback function to execute when the event occurs
   * @returns A function to remove the listener
   */
  public once<T = any>(type: GitEventType, listener: GitEventListener<T>): () => void {
    const onceListener: GitEventListener<T> = (event) => {
      this.off(type, onceListener);
      listener(event);
    };

    return this.on(type, onceListener);
  }

  /**
   * Emit an event of a specific type with optional payload
   * @param type The event type to emit
   * @param payload Optional data to include with the event
   */
  public emit<T = any>(type: GitEventType, payload?: T): void {
    if (!this.listeners.has(type)) {
      return;
    }

    const event: GitEvent<T> = {
      type,
      payload: payload as T,
      timestamp: Date.now(),
    };

    this.listeners.get(type)!.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error(`Error in Git event listener for ${type}:`, error);
      }
    });
  }

  /**
   * Remove all listeners for a specific event type, or all listeners if no type is specified
   * @param type Optional event type to clear listeners for
   */
  public removeAllListeners(type?: GitEventType): void {
    if (type) {
      this.listeners.delete(type);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get the number of listeners for a specific event type
   * @param type The event type to count listeners for
   * @returns The number of listeners
   */
  public listenerCount(type: GitEventType): number {
    if (!this.listeners.has(type)) {
      return 0;
    }

    return this.listeners.get(type)!.size;
  }

  /**
   * Get all event types that have listeners
   * @returns Array of event types
   */
  public eventTypes(): GitEventType[] {
    return Array.from(this.listeners.keys());
  }
}

// Export a singleton instance
export const gitEventEmitter = GitEventEmitter.getInstance();

/**
 * Hook for React components to listen for Git events
 * @param type The event type to listen for
 * @param callback The callback function to execute when the event occurs
 */
export function useGitEvent<T = any>(type: GitEventType, callback: (payload: T) => void): void {
  useEffect(() => {
    const listener = (event: GitEvent<T>) => {
      callback(event.payload);
    };

    const unsubscribe = gitEventEmitter.on(type, listener);

    // Clean up when the component unmounts
    return unsubscribe;
  }, [type, callback]);
}
