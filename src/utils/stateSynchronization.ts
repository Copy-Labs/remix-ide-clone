import { debug, info, warn, error } from '@/services/loggerService';

/**
 * Options for state synchronization
 */
export interface StateSyncOptions {
  // Key prefix for localStorage/BroadcastChannel
  key: string;

  // Whether to enable synchronization
  enabled?: boolean;

  // Whether to merge partial state updates (default: true)
  mergeUpdates?: boolean;

  // Custom merge function for state updates
  customMerge?: <T>(oldState: T, newState: Partial<T>) => T;

  // Filter function to determine which parts of state to synchronize
  filter?: <T>(state: T) => Partial<T>;

  // Callback when state is received from another tab
  onReceiveState?: <T>(state: T) => void;
}

/**
 * State synchronization message
 */
interface SyncMessage<T = any> {
  type: 'STATE_SYNC';
  key: string;
  state: T;
  timestamp: number;
}

/**
 * Class for synchronizing state across browser tabs
 */
export class StateSync<T> {
  private options: Required<StateSyncOptions>;
  private broadcastChannel: BroadcastChannel | null = null;
  private lastBroadcastTime: number = 0;
  private readonly BROADCAST_THROTTLE = 50; // ms

  constructor(options: StateSyncOptions) {
    // Set default options
    this.options = {
      key: options.key,
      enabled: options.enabled ?? true,
      mergeUpdates: options.mergeUpdates ?? true,
      customMerge: options.customMerge ?? this.defaultMerge,
      filter: options.filter ?? ((state) => state as Partial<T>),
      onReceiveState: options.onReceiveState ?? (() => {}),
    };

    if (this.options.enabled) {
      this.initBroadcastChannel();
    }
  }

  /**
   * Initialize the BroadcastChannel for cross-tab communication
   */
  private initBroadcastChannel(): void {
    try {
      this.broadcastChannel = new BroadcastChannel(`state-sync-${this.options.key}`);
      this.broadcastChannel.onmessage = this.handleMessage.bind(this);
      info('StateSync', `Initialized state synchronization for key: ${this.options.key}`);
    } catch (err) {
      error('StateSync', 'Failed to initialize BroadcastChannel', err);
      this.broadcastChannel = null;
    }
  }

  /**
   * Handle incoming messages from other tabs
   */
  private handleMessage(event: MessageEvent): void {
    const message = event.data as SyncMessage<Partial<T>>;

    if (message && message.type === 'STATE_SYNC' && message.key === this.options.key) {
      debug('StateSync', `Received state update from another tab`, message.state);
      this.options.onReceiveState(message.state as T);
    }
  }

  /**
   * Default merge function for state updates
   */
  private defaultMerge<S>(oldState: S, newState: Partial<S>): S {
    return { ...oldState, ...newState };
  }

  /**
   * Broadcast state to other tabs
   */
  public broadcastState(state: T): void {
    if (!this.options.enabled || !this.broadcastChannel) {
      return;
    }

    const now = Date.now();

    // Throttle broadcasts to avoid overwhelming the channel
    if (now - this.lastBroadcastTime < this.BROADCAST_THROTTLE) {
      return;
    }

    this.lastBroadcastTime = now;

    // Apply filter if provided
    const filteredState = this.options.filter(state);

    const message: SyncMessage<Partial<T>> = {
      type: 'STATE_SYNC',
      key: this.options.key,
      state: filteredState,
      timestamp: now,
    };

    try {
      this.broadcastChannel.postMessage(message);
      debug('StateSync', `Broadcasted state update`, filteredState);
    } catch (err) {
      error('StateSync', 'Failed to broadcast state', err);
    }
  }

  /**
   * Apply received state to current state
   */
  public applyReceivedState(currentState: T, receivedState: Partial<T>): T {
    if (this.options.mergeUpdates) {
      return this.options.customMerge(currentState, receivedState);
    }

    // Replace entire state if not merging
    return receivedState as T;
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
      debug('StateSync', `Closed state synchronization for key: ${this.options.key}`);
    }
  }
}

/**
 * Higher-order function to add state synchronization to a store
 * @param options Synchronization options
 * @returns A middleware function for Zustand
 */
export const withStateSync =
  <T>(options: StateSyncOptions) =>
  (config: any) =>
  (set: any, get: any, api: any) => {
    const stateSync = new StateSync<T>(options);

    // Create a wrapped set function that broadcasts state changes
    const syncSet = (fn: (state: T) => void) => {
      set((state: T) => {
        fn(state);

        // Broadcast the updated state
        stateSync.broadcastState(get());
      });
    };

    // Set up listener for state changes from other tabs
    const handleExternalStateChange = (receivedState: Partial<T>) => {
      set((state: T) => {
        // Apply the received state
        const newState = stateSync.applyReceivedState(state, receivedState);
        Object.assign(state, newState);
      });
    };

    // Register the handler
    stateSync.options.onReceiveState = handleExternalStateChange;

    // Add the sync instance to the API
    api.stateSync = stateSync;

    // Call the original config function with our wrapped set
    const state = config(syncSet, get, api);

    return state;
  };

/**
 * Example usage:
 *
 * const useMyStore = create<MyState & MyActions>()(
 *   devtools(
 *     immer(
 *       withStateSync<MyState>({
 *         key: 'my-store',
 *         // Only sync specific parts of the state
 *         filter: (state) => ({
 *           count: state.count,
 *           // Don't sync sensitive or temporary data
 *           // user: state.user
 *         })
 *       })(
 *         (set) => ({
 *           // State
 *           count: 0,
 *           user: null,
 *
 *           // Actions
 *           increment: () => set((state) => { state.count++ }),
 *           decrement: () => set((state) => { state.count-- }),
 *         })
 *       )
 *     )
 *   )
 * );
 */
