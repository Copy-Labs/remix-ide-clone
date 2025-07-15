# Solidity Compiler Binaries

This directory contains Solidity compiler binaries that are used by the application for compiling Solidity code.

## Overview

The compiler files are named in the format `soljson-v{version}.js` (e.g., `soljson-v0.8.27.js`). These files are downloaded from the official Solidity compiler repository using the `copy-solc.ts` script in the `scripts` directory.

## Server Configuration

### Important: Vite Server Configuration

The application is configured to serve these files locally. In the `vite.config.ts` file, make sure there is **no proxy configuration** for the `/solc-bin` path. The files should be served directly from this directory.

❌ **Incorrect Configuration (will cause 404 errors):**
```javascript
server: {
  proxy: {
    '/solc-bin': {
      target: 'https://binaries.soliditylang.org/bin',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/solc-bin/, '')
    }
  }
}
```

✅ **Correct Configuration:**
```javascript
server: {
  port: 3000,
  open: true,
  fs: {
    allow: ['..'],
  }
}
```

## Troubleshooting

If you encounter errors like:

```
Failed to load compiler version: Error: Failed to fetch compiler: 404 Not Found
```

Check the following:

1. Make sure the compiler file exists in this directory
2. Verify that the vite.config.ts file doesn't have a proxy configuration for `/solc-bin`
3. Run the `copy-solc.ts` script to download the compiler files again:

```bash
npx ts-node scripts/copy-solc.ts
```

## Adding New Compiler Versions

To add support for new compiler versions, edit the `compilerVersions` array in `scripts/copy-solc.ts` and run the script again.
