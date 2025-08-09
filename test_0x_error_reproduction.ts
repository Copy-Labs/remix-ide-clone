import { web3Service } from './src/services/web3Service.ts';

/**
 * Test to reproduce the 0x error when calling getAge function with VM accounts
 * This test will help us identify if the issue is with:
 * 1. Contract/ABI mismatch
 * 2. VM connection issues
 * 3. Dropdown component issues
 */
async function test0xErrorReproduction() {
  console.log('=== Testing 0x Error Reproduction with getAge Function ===');

  try {
    // 1. Connect to the VM using web3Service
    console.log('Step 1: Connecting to VM...');
    const connected = await web3Service.connect('vm');
    console.log('Connected to VM:', connected);

    if (!connected) {
      throw new Error('Failed to connect to VM');
    }

    // 2. Verify we're using a test account
    const isUsingTestWallet = web3Service.isUsingTestWallet();
    console.log('Step 2: Using test wallet:', isUsingTestWallet);

    if (!isUsingTestWallet) {
      throw new Error('Not using a test wallet - this is the likely cause of 0x errors');
    }

    // 3. Get the account we're using
    const account = web3Service.getAccount();
    console.log('Step 3: Using account:', account);

    // 4. Deploy a contract with getAge method
    console.log('\nStep 4: Deploying contract with getAge method...');

    // Contract bytecode and ABI that should work
    const bytecode = '0x608060405234801561001057600080fd5b5060c78061001f6000396000f3fe6080604052348015600f57600080fd5b506004361060325760003560e01c806367e404ce146037578063967e6e65146051575b600080fd5b603d6069565b60405190815260200160405180910390f35b60576073565b005b60005460405190815260200160405180910390f35b600080549056fea2646970667358221220d0c496d1ba341e4f0e3bc9c5a9c3d2a9e3a4e7634a58c2d5c9a0e2c7da24e82064736f6c63430008120033';

    const abi = [
      {
        "inputs": [],
        "name": "getAge",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "age",
            "type": "uint256"
          }
        ],
        "name": "setAge",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      }
    ];

    // Deploy the contract using web3Service
    const deployResult = await web3Service.deployContract(abi, bytecode);

    if (!deployResult) {
      throw new Error('Failed to deploy contract');
    }

    const contractAddress = deployResult.address;
    console.log('Contract deployed successfully at:', contractAddress);

    // 5. Test calling getAge method - this is where the 0x error typically occurs
    console.log('\nStep 5: Calling getAge() method...');

    try {
      const result = await web3Service.callContractMethod(
        contractAddress,
        abi,
        'getAge',
        []
      );

      console.log('✅ getAge() result:', result);

      if (result === '0x' || result === null || result === undefined) {
        console.error('❌ REPRODUCED: getAge returned 0x (empty result)');
        console.log('This indicates the contract call is not working properly');
      } else {
        console.log('✅ SUCCESS: getAge returned a valid result');
      }

    } catch (error) {
      console.error('❌ REPRODUCED: getAge call failed with error:', error.message);
      console.error('Full error:', error);
    }

    // 6. Let's also test the ABI/contract compatibility
    console.log('\nStep 6: Testing ABI/Contract compatibility...');

    // Check if the deployed contract has the expected code
    const web3 = web3Service.getWeb3Instance();
    if (web3) {
      const deployedCode = await web3.eth.getCode(contractAddress);
      console.log('Deployed contract code length:', deployedCode.length);
      console.log('Deployed code preview:', deployedCode.substring(0, 50) + '...');

      if (deployedCode === '0x' || deployedCode.length <= 2) {
        console.error('❌ CONTRACT ISSUE: No code deployed at contract address');
      } else {
        console.log('✅ Contract code exists at address');
      }
    }

    // 7. Test with direct eth_call to isolate the issue
    console.log('\nStep 7: Testing with direct eth_call...');

    if (web3) {
      try {
        const directCallResult = await web3.eth.call({
          to: contractAddress,
          data: '0x967e6e65' // getAge() function selector
        });

        console.log('Direct eth_call result:', directCallResult);

        if (directCallResult === '0x') {
          console.error('❌ ISSUE CONFIRMED: Direct eth_call also returns 0x');
          console.log('This suggests the contract bytecode or deployment has issues');
        } else {
          console.log('✅ Direct eth_call works, issue might be in web3Service layer');
        }
      } catch (error) {
        console.error('❌ Direct eth_call failed:', error.message);
      }
    }

    // Disconnect from web3Service
    console.log('\nStep 8: Disconnecting from VM...');
    await web3Service.disconnect();
    console.log('Disconnected from VM');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);

    // Ensure we disconnect from web3Service even if the test fails
    try {
      await web3Service.disconnect();
      console.log('Disconnected from VM after error');
    } catch (disconnectError) {
      console.error('Failed to disconnect from VM:', disconnectError.message);
    }
  }
}

// Run the test
test0xErrorReproduction();
