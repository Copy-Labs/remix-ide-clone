# Web Workers in Remix IDE Clone

This directory contains web workers used by the application for CPU-intensive tasks like Solidity compilation.

## compiler.js

The `compiler.js` worker handles Solidity compilation in a separate thread to prevent blocking the main UI thread. It supports:

1. Loading specific compiler versions
2. Compiling Solidity code
3. Retrieving available compiler versions

## Module Type Workers

The workers in this application are initialized as module type workers (`{ type: 'module' }`). This has important implications:

### Key Differences from Classic Workers

1. **No `importScripts()` Support**: Module workers don't support the `importScripts()` function that classic workers use to load external scripts.

2. **Alternative Loading Methods**: Instead of `importScripts()`, module workers must use:
   - `fetch()` + `eval()` to load and execute external scripts
   - Dynamic imports (where supported)

### Implementation Details

In `compiler.js`, we use the `fetch()` + `eval()` approach to load Solidity compiler versions:

```javascript
// For module type workers, we need to use fetch + eval instead of importScripts
const response = await fetch(solcUrl);
if (!response.ok) {
    throw new Error(`Failed to fetch compiler: ${response.status} ${response.statusText}`);
}

const solcCode = await response.text();
// This executes the Solidity compiler code
eval(solcCode);
```

## Troubleshooting

### Module Worker Errors

If you encounter errors like:

```
Failed to execute 'importScripts' on 'WorkerGlobalScope': Module scripts don't support importScripts().
```

It means the worker is trying to use `importScripts()` in a module worker context. Make sure all external script loading in module workers uses the `fetch()` + `eval()` approach shown above.

### 404 Not Found Errors

If you encounter errors like:

```
Failed to load compiler version: Error: Failed to fetch compiler: 404 Not Found
```

This indicates that the compiler worker cannot find the Solidity compiler file. Check the following:

1. Make sure the compiler file exists in the `public/solc-bin` directory
2. Verify that the `vite.config.ts` file doesn't have a proxy configuration for `/solc-bin`
3. See the README.md in the `public/solc-bin` directory for more details

## Worker Initialization

Workers are initialized in `src/services/workers/compilerWorker.ts` with:

```typescript
this.worker = new Worker(new URL('/workers/compiler.js', import.meta.url), { type: 'module' });
```

The `{ type: 'module' }` option specifies that this is a module type worker.
