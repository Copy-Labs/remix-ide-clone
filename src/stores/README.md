# Compiler Store

This directory contains the Zustand store for managing the Solidity compiler state and actions.

## Key Files

- `compilerStore.ts`: The main store for compiler-related state and actions

## Compiler Initialization

The compiler store is responsible for initializing the Solidity compiler when the application
starts. This is done in two steps:

1. Loading the list of available compiler versions
2. Loading the default compiler version

```typescript
// Initialize versions and load the default compiler when the store is created
(async () => {
  const store = useCompilerStore.getState();
  await store.loadAvailableVersions();
  // Load the default compiler version to ensure it's ready for use
  await store.setCompilerVersion(store.compilerVersion);
})();
```

### Why This Is Important

Loading the compiler at application startup is crucial because:

1. It ensures the compiler is ready for use when a new file is created and compiled
2. It prevents the "Solidity compiler not loaded. Call loadVersion first" error
3. It provides a better user experience by avoiding delays when compiling for the first time

## Troubleshooting

If you encounter errors like:

```
Compilation error: Error: Solidity compiler not loaded. Call loadVersion first.
```

It means the compiler wasn't properly loaded before compilation was attempted. This can happen if:

1. The initialization code fails to run
2. The compiler version is changed but not loaded
3. The compiler worker is terminated unexpectedly

The fix is to ensure the compiler is loaded before compilation by calling:

```typescript
await compilerService.setVersion(version);
```

or by ensuring the initialization code runs correctly.
