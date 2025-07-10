// public/workers/compiler.js

// This is the actual web worker that will run in a separate thread

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
                result = await compileSolidity(sources, settings);
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
        // Load from your local public folder
        const solcUrl = `/solc-bin/soljson-v${version}.js`;
        console.log("LOAD SOLC VERSION::SOLC URL", solcUrl);

        // For module type workers, we need to use fetch + eval instead of importScripts
        const response = await fetch(solcUrl);
        console.log("LOAD SOLC VERSION::RESPONSE", response);
        if (!response.ok) {
            throw new Error(`Failed to fetch compiler: ${response.status} ${response.statusText}`);
        }

        const solcCode = await response.text();
        // This executes the Solidity compiler code
        eval(solcCode);

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
}

// Compile Solidity code
async function compileSolidity(sources, settings) {
    try {
        // Make sure we have the solc object
        if (!self.Module) {
            throw new Error('Solidity compiler not loaded. Call loadVersion first.');
        }

        const solc = self.Module;

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

        // Compile the code
        const output = JSON.parse(solc.compile(JSON.stringify(input)));

        return output;
    } catch (error) {
        console.error('Compilation error:', error);
        throw new Error(`Compilation failed: ${error.message}`);
    }
}

// Get available Solidity compiler versions
async function getSolcVersions() {
    try {
        const response = await fetch('https://binaries.soliditylang.org/bin/list.json');
        const data = await response.json();

        // Extract and format versions
        const versions = Object.keys(data.releases)
            .map(version => version.replace('soljson-v', '').replace('.js', ''))
            .sort((a, b) => {
                const aParts = a.split('.').map(Number);
                const bParts = b.split('.').map(Number);

                for (let i = 0; i < 3; i++) {
                    if (aParts[i] !== bParts[i]) {
                        return bParts[i] - aParts[i]; // Descending order
                    }
                }

                return 0;
            });

        return versions;
    } catch (error) {
        console.error('Failed to get compiler versions:', error);
        // Return hardcoded versions if API fails
        return [
            '0.8.30', '0.8.29', '0.8.28', '0.8.27', '0.8.26',
            '0.8.25', '0.8.24', '0.8.23', '0.8.22', '0.8.21', '0.8.20'
        ];
    }
}
