import { debug, warn, error } from '@/services/loggerService';

/**
 * Type for an optimistic update operation
 */
export type OptimisticUpdateOperation<T, R = any> = {
  // The async operation to perform
  asyncOperation: () => Promise<R>;

  // Function to apply the optimistic update to the state
  optimisticUpdate: (state: T) => void;

  // Function to revert the optimistic update if the operation fails
  rollback: (state: T) => void;

  // Optional function to update the state with the actual result
  onSuccess?: (state: T, result: R) => void;

  // Optional function to handle errors
  onError?: (err: any) => void;
};

/**
 * Higher-order function to add optimistic update capability to a store
 * @param setState The setState function from a Zustand store
 * @returns A function to perform optimistic updates
 */
export function withOptimisticUpdates<T>(setState: (fn: (state: T) => void) => void) {
  return async <R = any>({
    asyncOperation,
    optimisticUpdate,
    rollback,
    onSuccess,
    onError,
  }: OptimisticUpdateOperation<T, R>): Promise<R | undefined> => {
    // Apply the optimistic update immediately
    setState((state) => {
      optimisticUpdate(state);
      debug('OptimisticUpdate', 'Applied optimistic update');
    });

    try {
      // Perform the async operation
      const result = await asyncOperation();

      // Apply the success update if provided
      if (onSuccess) {
        setState((state) => {
          onSuccess(state, result);
          debug('OptimisticUpdate', 'Applied success update');
        });
      }

      return result;
    } catch (err) {
      // Log the error
      error('OptimisticUpdate', 'Operation failed, rolling back', err);

      // Roll back the optimistic update
      setState((state) => {
        rollback(state);
        debug('OptimisticUpdate', 'Rolled back optimistic update');
      });

      // Call the error handler if provided
      if (onError) {
        onError(err);
      }

      return undefined;
    }
  };
}

/**
 * Example usage:
 *
 * const useMyStore = create<MyState & MyActions>((set) => {
 *   const optimisticUpdate = withOptimisticUpdates<MyState>(set);
 *
 *   return {
 *     // State
 *     items: [],
 *
 *     // Actions
 *     addItem: async (item) => {
 *       return optimisticUpdate({
 *         asyncOperation: () => api.addItem(item),
 *         optimisticUpdate: (state) => {
 *           state.items.push({ ...item, id: 'temp-id' });
 *         },
 *         rollback: (state) => {
 *           state.items = state.items.filter(i => i.id !== 'temp-id');
 *         },
 *         onSuccess: (state, result) => {
 *           // Replace the temporary item with the real one
 *           const index = state.items.findIndex(i => i.id === 'temp-id');
 *           if (index !== -1) {
 *             state.items[index] = result;
 *           }
 *         }
 *       });
 *     }
 *   };
 * });
 */
