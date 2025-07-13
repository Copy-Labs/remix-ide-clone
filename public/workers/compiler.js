// public/workers/compiler.js

// This is the actual web worker that will run in a separate thread
import * as browserSolc from '@agnostico/browser-solidity-compiler';

// Handle messages from the main thread
self.onmessage = async function(event) {
    const { id, action, version, sources, settings } = event.data;

    try {
        let result;

        switch (action) {
            case 'loadVersion':
                result = await loadSolcVersion(version);
                break;

            case 'compile':
                result = await compileSolidity(version, sources, settings);
                break;

            case 'getVersions':
                result = await getSolcVersions();
                break;

            default:
                throw new Error(`Unknown action: ${action}`);
        }

        // Send the result back to the main thread
        self.postMessage({
            id,
            success: true,
            data: result
        });
    } catch (error) {
        // Send the error back to the main thread
        self.postMessage({
            id,
            success: false,
            error: error.message || 'Unknown error'
        });
    }
};

// Load a specific version of the Solidity compiler
/*async function loadSolcVersion(version) {
    try {
        // Use importScripts to load the compiler from CDN
        const solcUrl = `/solc-bin/soljson-v${version}.js`;
        importScripts(solcUrl);

        // Initialize the compiler
        const solc = self.Module;

        return {
            version,
            loaded: true
        };
    } catch (error) {
        console.error('Failed to load compiler version:', error);
        throw new Error(`Failed to load compiler version ${version}: ${error.message}`);
    }
}*/

async function loadSolcVersion(version) {
    try {
        console.log("LOAD SOLC VERSION:", version);

        // Load the compiler using the browser-solidity-compiler library
        await browserSolc.loadVersion(version);

        return {
            version,
            loaded: true
        };
    } catch (error) {
        console.error('Failed to load compiler version:', error);
        throw new Error(`Failed to load compiler version ${version}: ${error.message}`);
    }
}

// Compile Solidity code
async function compileSolidity(version, sources, settings) {
    try {
        console.log("compileSolidity::args", sources, version, settings);

        // Make sure the compiler is loaded
        await loadSolcVersion(version);

        // Prepare input for the compiler
        const input = {
            language: 'Solidity',
            sources,
            settings: settings || {
                outputSelection: {
                    '*': {
                        '*': ['*']
                    }
                },
                optimizer: {
                    enabled: true,
                    runs: 200
                }
            }
        };

        // Compile the code using the browser-solidity-compiler library
        const output = await browserSolc.compile(input);

        return output;
    } catch (error) {
        console.error('Compilation error:', error);
        throw new Error(`Compilation failed: ${error.message}`);
    }
}

// Get available Solidity compiler versions
async function getSolcVersions() {
    try {
        // Get versions from the browser-solidity-compiler library
        const versions = await browserSolc.getVersions();

        // Sort versions in descending order
        return versions.sort((a, b) => {
            const aParts = a.split('.').map(Number);
            const bParts = b.split('.').map(Number);

            for (let i = 0; i < 3; i++) {
                if (aParts[i] !== bParts[i]) {
                    return bParts[i] - aParts[i]; // Descending order
                }
            }

            return 0;
        });
    } catch (error) {
        console.error('Failed to get compiler versions:', error);
        // Return hardcoded versions if API fails
        return [
            '0.8.30', '0.8.29', '0.8.28', '0.8.27', '0.8.26',
            '0.8.25', '0.8.24', '0.8.23', '0.8.22', '0.8.21', '0.8.20'
        ];
    }
}
