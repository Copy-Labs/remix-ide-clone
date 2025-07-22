# Git Branch Storage Migration to IndexedDB

## Overview

This implementation migrates the storage of Git branches from localStorage to IndexedDB for improved persistence and reliability. The change provides several benefits:

1. **More Storage Space**: IndexedDB provides significantly more storage space than localStorage (typically 50MB+ vs 5MB).
2. **Better Performance**: IndexedDB is designed for storing larger amounts of data efficiently.
3. **Asynchronous API**: IndexedDB operations don't block the main thread, improving application responsiveness.
4. **Structured Data**: IndexedDB allows storing complex data structures more naturally.

## Implementation Details

### 1. Custom Storage Adapter

Created a custom storage adapter for Zustand that uses IndexedDB via the application's existing databaseService:

```typescript
// src/utils/indexedDBStorage.ts
import { StateStorage } from 'zustand/middleware';
import { databaseService } from '@/services/databaseService';
import { debug, error } from '@/services/loggerService';

export const createIndexedDBStorage = (storeName: string): StateStorage => {
  return {
    getItem: async (key: string): Promise<string | null> => {
      try {
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
    
    setItem: async (key: string, value: string): Promise<void> => {
      try {
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
    
    removeItem: async (key: string): Promise<void> => {
      try {
        const fileId = `${storeName}-${key}`;
        
        await databaseService.deleteFile(fileId);
        
        debug('IndexedDBStorage', `Removed state for ${fileId}`);
      } catch (err) {
        error('IndexedDBStorage', `Failed to remove state for ${key}`, err);
      }
    }
  };
};
```

### 2. Updated Git Store

Modified the Git store to use the custom IndexedDB storage adapter:

```typescript
// src/stores/gitStore.ts
import { createIndexedDBStorage } from '@/utils/indexedDBStorage';

// ...

export const useGitStore = create<GitStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        // ...
      })),
      {
        name: 'git-store',
        storage: createIndexedDBStorage('git-store'),
        partialize: (state) => ({
          config: state.config,
          isInitialized: state.isInitialized,
          branches: state.branches,
          currentBranch: state.currentBranch,
        }),
        // ...
      },
    ),
    {
      name: 'git-store',
    },
  ),
);
```

### 3. Testing

Created a test HTML file to verify that branches are being correctly persisted in IndexedDB:

```html
<!-- test_indexeddb_branch_persistence.html -->
<!DOCTYPE html>
<html lang="en">
<head>
    <!-- ... -->
    <script>
        async function checkIndexedDB() {
            try {
                const dbRequest = indexedDB.open('RemixIDEClone', 1);
                
                dbRequest.onsuccess = function(event) {
                    const db = event.target.result;
                    const transaction = db.transaction(['fileContents'], 'readonly');
                    const store = transaction.objectStore('fileContents');
                    const request = store.get('git-store-state');
                    
                    request.onsuccess = function(event) {
                        const data = event.target.result;
                        
                        if (data && data.content) {
                            const parsedData = JSON.parse(data.content);
                            
                            if (parsedData.state && parsedData.state.branches) {
                                // Display branches from IndexedDB
                                // ...
                            }
                        }
                    };
                };
            } catch (err) {
                // Handle errors
            }
        }
    </script>
</head>
<body>
    <!-- ... -->
</body>
</html>
```

## Verification

To verify that the implementation is working correctly:

1. Open the main application
2. Initialize a Git repository if not already done
3. Create a new branch (e.g., "test-branch")
4. Verify that the branch appears in the UI
5. Refresh the browser
6. Verify that the branch still appears in the UI after refresh
7. Open the test_indexeddb_branch_persistence.html file in a new tab to confirm branches are stored in IndexedDB

## Benefits

This implementation provides several benefits:

1. **Improved Reliability**: IndexedDB is more reliable for storing larger amounts of data than localStorage.
2. **Better Performance**: IndexedDB operations are asynchronous and don't block the main thread.
3. **More Storage Space**: IndexedDB provides significantly more storage space than localStorage.
4. **Future Scalability**: As the application grows and more data needs to be persisted, IndexedDB will be better equipped to handle it.
