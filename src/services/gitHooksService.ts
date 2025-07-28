import { debug, info, warn } from '@/services/loggerService';
import { gitEventEmitter, GitEventType } from '@/services/gitEventEmitter';

/**
 * Git hook types
 */
export enum GitHookType {
  PRE_COMMIT = 'pre-commit',
  POST_COMMIT = 'post-commit',
  PRE_PUSH = 'pre-push',
  POST_PUSH = 'post-push',
  PRE_MERGE = 'pre-merge',
  POST_MERGE = 'post-merge',
  PRE_REBASE = 'pre-rebase',
  POST_REBASE = 'post-rebase',
  PRE_CHECKOUT = 'pre-checkout',
  POST_CHECKOUT = 'post-checkout',
  CUSTOM = 'custom',
}

/**
 * Git hook callback function type
 */
export type GitHookCallback = (data: any) => Promise<boolean>;

/**
 * Git hook registration
 */
export interface GitHook {
  id: string;
  type: GitHookType;
  name: string;
  description: string;
  callback: GitHookCallback;
  enabled: boolean;
}

/**
 * GitHooksService
 *
 * This service provides support for Git hooks to trigger custom actions.
 * It allows registering hooks for various Git events and executing them when the events occur.
 */
class GitHooksService {
  private static instance: GitHooksService;
  private hooks: Map<GitHookType, GitHook[]> = new Map();
  private isInitialized: boolean = false;

  private constructor() {}

  public static getInstance(): GitHooksService {
    if (!GitHooksService.instance) {
      GitHooksService.instance = new GitHooksService();
    }
    return GitHooksService.instance;
  }

  /**
   * Initialize the Git hooks service
   */
  public initialize(): void {
    if (this.isInitialized) {
      return;
    }

    info('GitHooksService', 'Initializing Git hooks service');

    // Subscribe to Git events
    this.subscribeToGitEvents();

    this.isInitialized = true;
  }

  /**
   * Register a Git hook
   * @param hook The hook to register
   * @returns The registered hook ID
   */
  public registerHook(hook: Omit<GitHook, 'id'>): string {
    const id = this.generateId();
    const newHook: GitHook = {
      ...hook,
      id,
      enabled: true,
    };

    // Get existing hooks for this type or create a new array
    const existingHooks = this.hooks.get(hook.type) || [];

    // Add the new hook
    this.hooks.set(hook.type, [...existingHooks, newHook]);

    info('GitHooksService', `Registered Git hook: ${hook.name} (${hook.type})`);

    return id;
  }

  /**
   * Unregister a Git hook
   * @param id The hook ID to unregister
   */
  public unregisterHook(id: string): void {
    // Find the hook type
    for (const [type, hooks] of this.hooks.entries()) {
      const hookIndex = hooks.findIndex((h) => h.id === id);
      if (hookIndex !== -1) {
        // Remove the hook
        const updatedHooks = [...hooks];
        const removedHook = updatedHooks.splice(hookIndex, 1)[0];
        this.hooks.set(type, updatedHooks);

        info('GitHooksService', `Unregistered Git hook: ${removedHook.name} (${removedHook.type})`);
        return;
      }
    }

    warn('GitHooksService', `Failed to unregister Git hook: Hook with ID ${id} not found`);
  }

  /**
   * Enable or disable a Git hook
   * @param id The hook ID
   * @param enabled Whether the hook should be enabled
   */
  public setHookEnabled(id: string, enabled: boolean): void {
    // Find the hook
    for (const [type, hooks] of this.hooks.entries()) {
      const hookIndex = hooks.findIndex((h) => h.id === id);
      if (hookIndex !== -1) {
        // Update the hook
        const updatedHooks = [...hooks];
        updatedHooks[hookIndex] = {
          ...updatedHooks[hookIndex],
          enabled,
        };
        this.hooks.set(type, updatedHooks);

        info(
          'GitHooksService',
          `${enabled ? 'Enabled' : 'Disabled'} Git hook: ${updatedHooks[hookIndex].name}`,
        );
        return;
      }
    }

    warn(
      'GitHooksService',
      `Failed to ${enabled ? 'enable' : 'disable'} Git hook: Hook with ID ${id} not found`,
    );
  }

  /**
   * Get all registered hooks
   * @returns All registered hooks
   */
  public getAllHooks(): GitHook[] {
    const allHooks: GitHook[] = [];
    for (const hooks of this.hooks.values()) {
      allHooks.push(...hooks);
    }
    return allHooks;
  }

  /**
   * Get hooks of a specific type
   * @param type The hook type
   * @returns Hooks of the specified type
   */
  public getHooksByType(type: GitHookType): GitHook[] {
    return this.hooks.get(type) || [];
  }

  /**
   * Trigger hooks of a specific type
   * @param type The hook type to trigger
   * @param data Data to pass to the hooks
   * @returns Whether all hooks succeeded
   */
  public async triggerHooks(type: GitHookType, data: any = {}): Promise<boolean> {
    const hooks = this.hooks.get(type) || [];
    const enabledHooks = hooks.filter((h) => h.enabled);

    if (enabledHooks.length === 0) {
      debug('GitHooksService', `No enabled hooks found for type: ${type}`);
      return true;
    }

    info('GitHooksService', `Triggering ${enabledHooks.length} hooks for type: ${type}`);

    let allSucceeded = true;

    // Execute all hooks in sequence
    for (const hook of enabledHooks) {
      try {
        const success = await hook.callback(data);
        if (!success) {
          warn('GitHooksService', `Hook ${hook.name} returned false`);
          allSucceeded = false;
        }
      } catch (error) {
        warn('GitHooksService', `Error executing hook ${hook.name}: ${error}`);
        allSucceeded = false;
      }
    }

    return allSucceeded;
  }

  /**
   * Trigger a custom hook
   * @param customType The custom hook type
   * @param data Data to pass to the hooks
   * @returns Whether all hooks succeeded
   */
  public async triggerCustomHook(customType: string, data: any = {}): Promise<boolean> {
    // For custom hooks, we'll use the CUSTOM type and filter by name
    const customHooks = (this.hooks.get(GitHookType.CUSTOM) || []).filter(
      (h) => h.name === customType && h.enabled,
    );

    if (customHooks.length === 0) {
      debug('GitHooksService', `No enabled custom hooks found for type: ${customType}`);
      return true;
    }

    info(
      'GitHooksService',
      `Triggering ${customHooks.length} custom hooks for type: ${customType}`,
    );

    let allSucceeded = true;

    // Execute all hooks in sequence
    for (const hook of customHooks) {
      try {
        const success = await hook.callback(data);
        if (!success) {
          warn('GitHooksService', `Custom hook ${hook.name} returned false`);
          allSucceeded = false;
        }
      } catch (error) {
        warn('GitHooksService', `Error executing custom hook ${hook.name}: ${error}`);
        allSucceeded = false;
      }
    }

    return allSucceeded;
  }

  /**
   * Subscribe to Git events
   */
  private subscribeToGitEvents(): void {
    // Listen for Git events and trigger corresponding hooks
    gitEventEmitter.on(GitEventType.BEFORE_COMMIT, async (data) => {
      const success = await this.triggerHooks(GitHookType.PRE_COMMIT, data);
      if (!success) {
        warn('GitHooksService', 'Pre-commit hooks failed, commit may be aborted');
      }
    });

    gitEventEmitter.on(GitEventType.COMMIT_CREATED, async (data) => {
      await this.triggerHooks(GitHookType.POST_COMMIT, data);
    });

    gitEventEmitter.on(GitEventType.BEFORE_CHECKOUT, async (data) => {
      const success = await this.triggerHooks(GitHookType.PRE_CHECKOUT, data);
      if (!success) {
        warn('GitHooksService', 'Pre-checkout hooks failed, checkout may be aborted');
      }
    });

    gitEventEmitter.on(GitEventType.BRANCH_SWITCHED, async (data) => {
      await this.triggerHooks(GitHookType.POST_CHECKOUT, data);
    });

    debug('GitHooksService', 'Subscribed to Git events');
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

export const gitHooksService = GitHooksService.getInstance();
