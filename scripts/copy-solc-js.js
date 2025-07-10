const fs = require('fs');
const path = require('path');

// Create directory if it doesn't exist
const solcDir = path.join(__dirname, '../public/solc-bin');
if (!fs.existsSync(solcDir)) {
    fs.mkdirSync(solcDir, { recursive: true });
}

// Copy the main solc.js file
const solcPath = require.resolve('solc/solc.js');
fs.copyFileSync(solcPath, path.join(solcDir, 'solc.js'));

// Copy specific versions you need
const versions = ['0.8.29', '0.8.30']; // Add versions you need
const solcBinPath = path.dirname(require.resolve('solc/package.json')) + '/soljson.js';
versions.forEach(version => {
    try {
        const versionPath = path.join(solcDir, `soljson-v${version}.js`);
        fs.copyFileSync(solcBinPath, versionPath);
    } catch (err) {
        console.error(`Failed to copy version ${version}:`, err);
    }
});

console.log('Solidity compiler files copied successfully!');
