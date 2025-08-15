const { getRequiredOpenZeppelinContracts } = require('./dist/services/openZeppelinContracts.js');

// Test the SPDX license identifier fix
function testSPDXFix() {
  console.log('Testing SPDX license identifier fix...');

  // This is the basic ERC20 template that was causing the SPDX duplication error
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

  try {
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

    // Check for SPDX license identifier duplication
    console.log('\n--- SPDX License Identifier Analysis ---');

    const spdxMatches = inlinedContract.match(/SPDX-License-Identifier/g);
    const spdxCount = spdxMatches ? spdxMatches.length : 0;
    console.log(`SPDX License Identifiers found: ${spdxCount}`);

    if (spdxCount === 1) {
      console.log('✅ SPDX license identifier duplication: FIXED');
      console.log('✅ Only one SPDX header present in the final contract');
    } else if (spdxCount === 0) {
      console.log('❌ No SPDX license identifier found - this should not happen');
    } else {
      console.log(`❌ Multiple SPDX license identifiers found: ${spdxCount}`);
      console.log('❌ Duplication issue still exists');
    }

    // Show where SPDX identifiers are located
    const lines = inlinedContract.split('\n');
    lines.forEach((line, index) => {
      if (line.includes('SPDX-License-Identifier')) {
        console.log(`   Line ${index + 1}: ${line.trim()}`);
      }
    });

    console.log(`\n${spdxCount === 1 ? '🎉' : '❌'} SPDX Fix Status: ${spdxCount === 1 ? 'SUCCESS' : 'NEEDS MORE WORK'}`);

  } catch (error) {
    console.error('Test failed:', error.message);
    console.log('\n⚠️ Note: This test requires the built distribution files.');
    console.log('The fix has been implemented in the source code.');
  }
}

// Run the test
testSPDXFix();
