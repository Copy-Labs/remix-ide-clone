# Git Integration Fix

## Issue
The Git integration was failing with the following error when initializing a repository:
```
ENOENT: no such file or directory, lstat '.'
```

This error occurred because the Git service was not properly handling relative paths like `.` (current directory) when performing file system operations.

## Root Causes

1. **Working Directory Path**: The Git service was initialized with `/workspace` as the working directory, but the actual file system was using a different root.

2. **Path Handling in `lstat`**: The `lstat` method in the `GitFileSystemAdapter` had special case handling for `.` and `..` paths, but it wasn't working correctly in all scenarios.

3. **Path Inconsistency**: In the `createInitialCommit` method, there was an inconsistency between the path used for writing the `.gitkeep` file (`/.gitkeep`) and the path used for adding it to Git (`.gitkeep`).

4. **Add All Files Method**: The `addAllFiles` method was using the problematic `.` path directly, which was causing the error.

## Fixes Implemented

1. **Updated Working Directory**: Changed the Git service initialization to use `/` as the working directory:
   ```javascript
   export const gitService = new GitService('/');
   ```

2. **Enhanced `lstat` Method**: Improved the special case handling for `.` and `..` paths in the `lstat` method to ensure it always returns a valid directory stat object:
   ```javascript
   if (filepath === '.' || filepath === '..') {
     debug(`lstat called for special directory ('${filepath}')`);
     
     // Always return a valid directory stat object for special directories
     // This ensures Git operations that use '.' work correctly
     return {
       isFile: () => false,
       isDirectory: () => true,
       isSymbolicLink: () => false,
       size: 0,
       mtime: new Date(),
       ctime: new Date(),
       mode: 16877, // 0o040755 for directories
     };
   }
   ```

3. **Fixed Path Inconsistency**: Updated the `createInitialCommit` method to use consistent paths:
   ```javascript
   const gitkeepPath = `${this.dir === '/' ? '' : this.dir}/.gitkeep`;
   await this.fs.writeFile(gitkeepPath, '', { encoding: 'utf8' });
   ```

4. **Improved `addAllFiles` Method**: Rewrote the `addAllFiles` method to avoid using the problematic `.` path:
   ```javascript
   addAllFiles: async () => {
     try {
       // Use a more robust approach to add all files
       // First get the status to find all unstaged files
       const status = await gitService.status();
       
       // If there are no files to add, just return
       if (status.length === 0) {
         info('No files to add to staging area');
         return;
       }
       
       // Add each file individually instead of using '.'
       for (const item of status) {
         // Only add files that are not already staged
         if (item.stage !== 2) {
           await gitService.add(item.file);
         }
       }

       await get().getStatus();
       info('All files added to staging area');
     } catch (err) {
       const errorMessage = err instanceof Error ? err.message : 'Failed to add all files';
       error('Failed to add all files:', errorMessage);
       set((state) => {
         state.error = errorMessage;
       });
     }
   }
   ```

## Testing

A new test script (`test_git_add_all.js`) has been created to verify that the `addAllFiles` method now works correctly. This script:

1. Initializes a Git repository
2. Creates a test file
3. Calls the `addAllFiles` method (which was previously failing)
4. Verifies that the file was added to the staging area
5. Commits the changes
6. Verifies that the commit was created successfully

## How to Verify

To verify that the fix works:

1. Run the application
2. Initialize a Git repository
3. Create some files
4. Use the "Add All Files" functionality
5. Verify that the files are added to the staging area without errors

Alternatively, you can run the `test_git_add_all.js` script to automatically verify the fix.

## Additional Improvements

The changes made not only fix the specific error but also improve the robustness of the Git integration:

1. The `addAllFiles` method now handles each file individually, which is more reliable than using the `.` path.
2. The path handling in the `createInitialCommit` method is now more consistent.
3. The `lstat` method now handles special directories more robustly.

These improvements should make the Git integration more reliable and less prone to errors in the future.
