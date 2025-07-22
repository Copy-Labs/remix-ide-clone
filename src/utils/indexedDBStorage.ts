import { type StateStorage } from 'zustand/middleware';
import { databaseService } from '@/services/databaseService';
import { debug, error } from '@/services/loggerService';

/**
 * Custom storage adapter for Zustand that uses IndexedDB via databaseService
 * This provides more robust persistence than localStorage
 */
export const createIndexedDBStorage = (storeName: string): StateStorage => {
  return {
    /**
     * Get state from IndexedDB
     * @param key Storage key
     * @returns Serialized state or null if not found
     */
    getItem: async (key: string): Promise<string | null> => {
      try {
        // Use the storeName as part of the key to avoid collisions
        const fileId = `${storeName}-${key}`;
        const file = await databaseService.getFile(fileId);

        if (file && file.content) {
          debug('IndexedDBStorage', `Retrieved state for ${fileId}`);
          return file.content;
        }

        return null;
      } catch (err) {
        error('IndexedDBStorage', `Failed to get state for ${key}`, err);
        return null;
      }
    },

    /**
     * Set state in IndexedDB
     * @param key Storage key
     * @param value Serialized state
     */
    setItem: async (key: string, value: string): Promise<void> => {
      try {
        // Use the storeName as part of the key to avoid collisions
        const fileId = `${storeName}-${key}`;

        await databaseService.saveFile({
          id: fileId,
          content: value,
          lastModified: Date.now(),
          type: 'store-state'
        });

        debug('IndexedDBStorage', `Saved state for ${fileId}`);
      } catch (err) {
        error('IndexedDBStorage', `Failed to save state for ${key}`, err);
      }
    },

    /**
     * Remove state from IndexedDB
     * @param key Storage key
     */
    removeItem: async (key: string): Promise<void> => {
      try {
        // Use the storeName as part of the key to avoid collisions
        const fileId = `${storeName}-${key}`;

        await databaseService.deleteFile(fileId);

        debug('IndexedDBStorage', `Removed state for ${fileId}`);
      } catch (err) {
        error('IndexedDBStorage', `Failed to remove state for ${key}`, err);
      }
    }
  };
};
