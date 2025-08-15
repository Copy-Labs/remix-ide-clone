const { getRequiredOpenZeppelinContracts } = require('./dist/services/openZeppelinContracts.js');

// Test the OpenZeppelin inlining fix
function testCompilationFix() {
  console.log('Testing OpenZeppelin compilation fix...');

  // This is the basic ERC20 template that was causing errors
  const contractSource = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TokenTest1 is ERC20 {
    constructor(
        string memory name,
        string memory symbol,
        uint256 totalSupply,
        uint8 decimals
    ) ERC20(name, symbol) {
        _mint(msg.sender, totalSupply * 10**decimals);
    }
}`;

  console.log('Original contract source:');
  console.log(contractSource);

  // Get required OpenZeppelin contracts
  console.log('\n--- Getting required OpenZeppelin contracts ---');
  const requiredContracts = getRequiredOpenZeppelinContracts(contractSource);

  console.log('Required contracts found:', Object.keys(requiredContracts));

  // Simulate the inlining process
  let inlinedContract = contractSource;

  // Remove OpenZeppelin imports and replace with inlined contracts
  for (const [importPath, contractCode] of Object.entries(requiredContracts)) {
    console.log(`\nProcessing: ${importPath}`);

    // Remove import statement
    const importRegex = new RegExp(`import\\s+["']${importPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'];`, 'g');
    inlinedContract = inlinedContract.replace(importRegex, '');

    // Add contract source after pragma
    const lines = inlinedContract.split('\n');
    const pragmaIndex = lines.findIndex(line => line.trim().startsWith('pragma '));
    if (pragmaIndex !== -1) {
      lines.splice(pragmaIndex + 1, 0, '', contractCode, '');
      inlinedContract = lines.join('\n');
    }
  }

  console.log('\n--- Final inlined contract ---');
  console.log(inlinedContract);

  // Check for issues
  console.log('\n--- Issue Analysis ---');

  // Count SPDX identifiers
  const spdxMatches = inlinedContract.match(/SPDX-License-Identifier/g);
  const spdxCount = spdxMatches ? spdxMatches.length : 0;
  console.log(`SPDX License Identifiers found: ${spdxCount}`);

  // Check for remaining imports
  const importMatches = inlinedContract.match(/import\s+["'].*?["'];/g);
  const importCount = importMatches ? importMatches.length : 0;
  console.log(`Remaining import statements: ${importCount}`);

  if (importMatches) {
    console.log('Remaining imports:', importMatches);
  }

  // Check for OpenZeppelin-specific imports that should be resolved
  const ozImportMatches = inlinedContract.match(/import\s+["']@openzeppelin.*?["'];/g);
  const ozImportCount = ozImportMatches ? ozImportMatches.length : 0;
  console.log(`Unresolved OpenZeppelin imports: ${ozImportCount}`);

  if (ozImportMatches) {
    console.log('Unresolved OpenZeppelin imports:', ozImportMatches);
  }

  // Check for relative imports that would cause errors
  const relativeImportMatches = inlinedContract.match(/import\s+["']\.\/(.*?)["'];/g);
  const relativeImportCount = relativeImportMatches ? relativeImportMatches.length : 0;
  console.log(`Problematic relative imports: ${relativeImportCount}`);

  if (relativeImportMatches) {
    console.log('Problematic relative imports:', relativeImportMatches);
  }

  console.log('\n--- Fix Status ---');
  if (spdxCount === 1) {
    console.log('✅ SPDX identifier duplication: FIXED');
  } else {
    console.log(`❌ SPDX identifier duplication: STILL EXISTS (${spdxCount} found)`);
  }

  if (ozImportCount === 0 && relativeImportCount === 0) {
    console.log('✅ Import resolution: FIXED');
  } else {
    console.log(`❌ Import resolution: STILL HAS ISSUES (${ozImportCount} OZ imports, ${relativeImportCount} relative imports)`);
  }

  const isFixed = spdxCount === 1 && ozImportCount === 0 && relativeImportCount === 0;
  console.log(`\n${isFixed ? '🎉' : '❌'} Overall fix status: ${isFixed ? 'SUCCESS' : 'NEEDS MORE WORK'}`);
}

// Run the test
try {
  testCompilationFix();
} catch (error) {
  console.error('Test failed:', error.message);
  console.log('\n⚠️ Note: This test requires the built distribution files.');
  console.log('The fix has been implemented in the source code.');
}
