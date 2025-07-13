# Solidity Compiler Scripts

## Note on Compiler Scripts

The scripts `copy-solc.ts` and `copy-solc-js.js` are no longer used in this project. 

These scripts were previously used to copy Solidity compiler files from node_modules/solc to the public directory. However, the project now uses the `@agnostico/browser-solidity-compiler` library, which handles loading and using Solidity compilers directly in the browser without needing to copy files.

The scripts have been kept for reference but are no longer part of the build process.

## Current Compiler Implementation

The project now uses `@agnostico/browser-solidity-compiler` which:

1. Loads compiler versions directly from the Solidity CDN
2. Provides a simple API for compiling Solidity code
3. Handles version management automatically

This change simplifies the build process and reduces the need for custom scripts to manage compiler versions.
