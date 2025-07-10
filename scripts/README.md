# Solidity Compiler Setup Script

This directory contains scripts for setting up the Solidity compiler in the Remix IDE clone.

## copy-solc.ts

The `copy-solc.ts` script downloads Solidity compiler binaries from the official repository and makes them available to the application. It performs the following tasks:

1. Cleans up any existing compiler files in the `public/solc-bin` directory
2. Copies the solc.js wrapper from node_modules
3. Fetches the list of available compiler versions from the official repository
4. Downloads the specified compiler versions
5. Creates a versions.json file with the list of available versions
6. Creates a compiler-loader.js helper script
7. Updates the compiler.js worker to use local files

### Usage

To run the script:

```bash
npx ts-node scripts/copy-solc.ts
```

### Troubleshooting

If you encounter errors like:

```
Failed to load compiler version: NetworkError: Failed to execute 'importScripts' on 'WorkerGlobalScope': The script at 'http://localhost:3000/solc-bin/soljson-v0.8.26.js' failed to load.
```

It means the compiler binaries are either missing or corrupted. Run the `copy-solc.ts` script to download the correct compiler files.

### How It Works

The script:

1. Fetches the list of available compiler versions from `https://binaries.soliditylang.org/bin/list.json`
2. Maps the simple version numbers (e.g., "0.8.26") to their full paths (e.g., "soljson-v0.8.26+commit.8a97fa7a.js")
3. Downloads the compiler binaries from the correct URLs
4. Saves them with simplified names (e.g., "soljson-v0.8.26.js") for easier reference in the application

### Adding New Compiler Versions

To add support for new compiler versions, edit the `compilerVersions` array in `copy-solc.ts` and run the script again.
