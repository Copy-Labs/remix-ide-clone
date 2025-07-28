import { debug, info, warn, error } from '@/services/loggerService';

/**
 * Options for the state debugger
 */
export interface StateDebuggerOptions {
  // Name of the store for logging
  name: string;

  // Whether to enable the debugger (defaults to process.env.NODE_ENV === 'development')
  enabled?: boolean;

  // Whether to log all state changes
  logChanges?: boolean;

  // Whether to log action calls
  logActions?: boolean;

  // Whether to log performance metrics
  logPerformance?: boolean;

  // Whether to save state history
  saveHistory?: boolean;

  // Maximum number of history entries to keep
  maxHistoryLength?: number;
}

/**
 * State change entry for history
 */
interface StateChangeEntry<T> {
  timestamp: number;
  previousState: T;
  nextState: T;
  actionName?: string;
  duration?: number;
}

/**
 * State debugger class
 */
export class StateDebugger<T> {
  private options: Required<StateDebuggerOptions>;
  private history: StateChangeEntry<T>[] = [];
  private actionStartTime: number | null = null;
  private currentActionName: string | null = null;

  constructor(options: StateDebuggerOptions) {
    // Set default options
    this.options = {
      name: options.name,
      enabled: options.enabled ?? process.env.NODE_ENV === 'development',
      logChanges: options.logChanges ?? true,
      logActions: options.logActions ?? true,
      logPerformance: options.logPerformance ?? true,
      saveHistory: options.saveHistory ?? true,
      maxHistoryLength: options.maxHistoryLength ?? 50,
    };

    if (this.options.enabled) {
      info('StateDebugger', `Debugger enabled for store: ${this.options.name}`);
    }
  }

  /**
   * Start tracking an action
   * @param actionName Name of the action being performed
   */
  startAction(actionName: string): void {
    if (!this.options.enabled || !this.options.logActions) return;

    this.actionStartTime = performance.now();
    this.currentActionName = actionName;
    debug('StateDebugger', `[${this.options.name}] Action started: ${actionName}`);
  }

  /**
   * End tracking an action
   */
  endAction(): void {
    if (!this.options.enabled || !this.options.logActions || !this.actionStartTime) return;

    const duration = performance.now() - this.actionStartTime;

    if (this.options.logPerformance) {
      debug(
        'StateDebugger',
        `[${this.options.name}] Action completed: ${this.currentActionName} (${duration.toFixed(2)}ms)`,
      );
    } else {
      debug('StateDebugger', `[${this.options.name}] Action completed: ${this.currentActionName}`);
    }

    this.actionStartTime = null;
    this.currentActionName = null;
  }

  /**
   * Track a state change
   * @param previousState Previous state
   * @param nextState Next state
   */
  trackStateChange(previousState: T, nextState: T): void {
    if (!this.options.enabled) return;

    const duration = this.actionStartTime ? performance.now() - this.actionStartTime : undefined;

    if (this.options.logChanges) {
      if (this.options.logPerformance && duration) {
        debug(
          'StateDebugger',
          `[${this.options.name}] State changed${this.currentActionName ? ` (${this.currentActionName})` : ''} (${duration.toFixed(2)}ms)`,
        );
      } else {
        debug(
          'StateDebugger',
          `[${this.options.name}] State changed${this.currentActionName ? ` (${this.currentActionName})` : ''}`,
        );
      }

      // Log the diff between previous and next state
      this.logStateDiff(previousState, nextState);
    }

    if (this.options.saveHistory) {
      this.addToHistory({
        timestamp: Date.now(),
        previousState,
        nextState,
        actionName: this.currentActionName || undefined,
        duration,
      });
    }
  }

  /**
   * Add a state change to the history
   * @param entry State change entry
   */
  private addToHistory(entry: StateChangeEntry<T>): void {
    this.history.push(entry);

    // Trim history if it exceeds the maximum length
    if (this.history.length > this.options.maxHistoryLength) {
      this.history = this.history.slice(this.history.length - this.options.maxHistoryLength);
    }
  }

  /**
   * Log the difference between previous and next state
   * @param previousState Previous state
   * @param nextState Next state
   */
  private logStateDiff(previousState: T, nextState: T): void {
    const diff: Record<string, { from: any; to: any }> = {};

    // Find all changed properties
    for (const key in nextState) {
      if (Object.prototype.hasOwnProperty.call(nextState, key)) {
        const prevValue = (previousState as any)[key];
        const nextValue = (nextState as any)[key];

        if (JSON.stringify(prevValue) !== JSON.stringify(nextValue)) {
          diff[key] = { from: prevValue, to: nextValue };
        }
      }
    }

    if (Object.keys(diff).length > 0) {
      debug('StateDebugger', `[${this.options.name}] State diff:`, diff);
    }
  }

  /**
   * Get the state change history
   */
  getHistory(): StateChangeEntry<T>[] {
    return [...this.history];
  }

  /**
   * Clear the state change history
   */
  clearHistory(): void {
    this.history = [];
    debug('StateDebugger', `[${this.options.name}] History cleared`);
  }

  /**
   * Get a specific state from history by index
   * @param index Index in the history (negative indices count from the end)
   */
  getStateFromHistory(index: number): T | null {
    if (index < 0) {
      index = this.history.length + index;
    }

    if (index >= 0 && index < this.history.length) {
      return this.history[index].nextState;
    }

    return null;
  }
}

/**
 * Higher-order function to add debugging to a store
 * @param options Debugger options
 * @returns A middleware function for Zustand
 */
export const withDebugger =
  <T>(options: StateDebuggerOptions) =>
  (config: any) =>
  (set: any, get: any, api: any) => {
    const stateDebugger = new StateDebugger<T>(options);

    // Create a wrapped set function that tracks state changes
    const debugSet = (fn: (state: T) => void, actionName?: string) => {
      if (actionName) {
        stateDebugger.startAction(actionName);
      }

      const previousState = get();

      // Call the original set function
      set((state: T) => {
        fn(state);
      });

      const nextState = get();
      stateDebugger.trackStateChange(previousState, nextState);

      if (actionName) {
        stateDebugger.endAction();
      }
    };

    // Add the debugger to the API
    api.stateDebugger = stateDebugger;

    // Call the original config function with our wrapped set
    const state = config(debugSet, get, api);

    // Wrap all functions to track actions
    const wrappedState: any = { ...state };

    for (const key in state) {
      if (typeof state[key] === 'function') {
        wrappedState[key] = (...args: any[]) => {
          stateDebugger.startAction(key);
          const result = state[key](...args);

          // If the result is a promise, wait for it to complete
          if (result instanceof Promise) {
            return result.finally(() => {
              stateDebugger.endAction();
            });
          }

          stateDebugger.endAction();
          return result;
        };
      }
    }

    return wrappedState;
  };

/**
 * Example usage:
 *
 * const useMyStore = create<MyState & MyActions>()(
 *   devtools(
 *     immer(
 *       withDebugger<MyState>({ name: 'my-store' })(
 *         (set) => ({
 *           // State
 *           count: 0,
 *
 *           // Actions
 *           increment: () => set((state) => { state.count++ }, 'increment'),
 *           decrement: () => set((state) => { state.count-- }, 'decrement'),
 *         })
 *       )
 *     )
 *   )
 * );
 */
