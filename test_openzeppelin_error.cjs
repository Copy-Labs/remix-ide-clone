const { solidityCompiler } = require('@agnostico/browser-solidity-compiler');

async function testOpenZeppelinError() {
  console.log('Testing OpenZeppelin compilation error...');

  // This is the exact ERC20 template that causes the error
  const contractBody = `// SPDX-License-Identifier: MIT
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

  console.log('Contract source code:');
  console.log(contractBody);
  console.log('\n--- Attempting compilation ---');

  try {
    const result = await solidityCompiler({
      version: 'https://binaries.soliditylang.org/bin/soljson-v0.8.19+commit.7dd6d404.js',
      contractBody,
      options: {}
    });

    console.log('Compilation result:', JSON.stringify(result, null, 2));

    if (result.errors && result.errors.length > 0) {
      console.log('\n❌ COMPILATION FAILED AS EXPECTED');
      console.log('Errors:');
      result.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.formattedMessage || error.message}`);
      });
    } else {
      console.log('\n✅ COMPILATION SUCCEEDED (unexpected)');
    }

  } catch (error) {
    console.error('\n❌ COMPILATION ERROR:', error.message);
  }
}

testOpenZeppelinError();
