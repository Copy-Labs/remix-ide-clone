import { web3Service } from './src/services/web3Service.ts';

/**
 * Test for calling a getAge method on a contract in the JavaScript VM
 * This test demonstrates:
 * 1. Connecting to the VM using web3Service
 * 2. Deploying a contract with a getAge method
 * 3. Calling the getAge method to verify it works correctly
 */
async function testVMGetAge() {
  console.log('=== Testing VM Contract getAge Method ===');

  try {
    // 1. Connect to the VM using web3Service
    console.log('Connecting to VM...');
    const connected = await web3Service.connect('vm');
    console.log('Connected to VM:', connected);

    if (!connected) {
      throw new Error('Failed to connect to VM');
    }

    // Verify we're using a test account
    const isUsingTestWallet = web3Service.isUsingTestWallet();
    console.log('Using test wallet:', isUsingTestWallet);

    if (!isUsingTestWallet) {
      throw new Error('Not using a test wallet');
    }

    // Get the account we're using
    const account = web3Service.getAccount();
    console.log('Using account:', account);

    // 2. Deploy a simple contract with a getAge method
    console.log('\nDeploying contract...');

    // Simple contract with getAge and setAge methods
    const bytecode = '0x608060405234801561001057600080fd5b5060c78061001f6000396000f3fe6080604052348015600f57600080fd5b506004361060325760003560e01c806367e404ce146037578063967e6e65146051575b600080fd5b603d6069565b60405190815260200160405180910390f35b60576073565b005b60005460405190815260200160405180910390f35b600080549056fea2646970667358221220d0c496d1ba341e4f0e3bc9c5a9c3d2a9e3a4e7634a58c2d5c9a0e2c7da24e82064736f6c63430008120033';

    // Contract ABI
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

    // 3. Call the getAge method - should return 0 initially
    console.log('\nCalling getAge() method...');
    const initialAge = await web3Service.callContractMethod(
      contractAddress,
      abi,
      'getAge',
      []
    );
    console.log('Initial age:', initialAge);

    // Verify initial age is 0
    if (initialAge !== '0') {
      throw new Error(`Expected initial age to be 0, got ${initialAge}`);
    }

    // 4. Execute a transaction (setAge)
    console.log('\nCalling setAge(25) method...');
    const newAge = 25;
    const setAgeTx = await web3Service.callContractMethod(
      contractAddress,
      abi,
      'setAge',
      [newAge]
    );

    if (!setAgeTx) {
      throw new Error('Failed to execute setAge transaction');
    }

    console.log('Transaction successful:', setAgeTx.transactionHash);

    // 5. Call the getAge method again to verify the state change
    console.log('\nCalling getAge() method again...');
    const updatedAge = await web3Service.callContractMethod(
      contractAddress,
      abi,
      'getAge',
      []
    );
    console.log('Updated age:', updatedAge);

    // Verify the age was updated to 25
    if (updatedAge !== '25') {
      throw new Error(`Expected updated age to be 25, got ${updatedAge}`);
    }

    // Disconnect from web3Service
    console.log('\nDisconnecting from VM...');
    await web3Service.disconnect();
    console.log('Disconnected from VM');

    console.log('\n✅ VM getAge test passed!');
  } catch (error) {
    console.error('\n❌ VM getAge test failed:', error.message);
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
testVMGetAge();
