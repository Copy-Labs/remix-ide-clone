import { web3Service } from './src/services/web3Service.ts';

/**
 * Test for connecting, deploying, and interacting with a contract using VM accounts
 * This test demonstrates:
 * 1. Connecting to the VM using web3Service
 * 2. Deploying a contract using the VM account
 * 3. Calling a read method on the contract
 * 4. Executing a transaction on the contract
 * 5. Verifying the state change by calling the read method again
 */
async function testVMContractInteractionFix() {
  console.log('=== Testing VM Contract Interaction with web3Service ===');

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

    // 2. Deploy a simple storage contract
    console.log('\nDeploying contract...');

    // Simple storage contract bytecode (store/retrieve a uint256)
    const bytecode = '0x608060405234801561001057600080fd5b50610150806100206000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c80632e64cec11461003b5780636057361d14610059575b600080fd5b610043610075565b60405161005091906100d9565b60405180910390f35b610073600480360381019061006e919061009d565b61007e565b005b60008054905090565b8060008190555050565b60008135905061009781610103565b92915050565b6000602082840312156100b3576100b26100fe565b5b60006100c184828501610088565b91505092915050565b6100d3816100f4565b82525050565b60006020820190506100ee60008301846100ca565b92915050565b6000819050919050565b600080fd5b61010c816100f4565b811461011757600080fd5b5056fea2646970667358221220223b76b2a4b83584962b3155b370beb66a7a7d6869dd947e2a7c8a6b0ffa58d364736f6c63430008070033';

    // Contract ABI
    const abi = [
      {
        inputs: [],
        name: 'retrieve',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
      {
        inputs: [{ internalType: 'uint256', name: 'num', type: 'uint256' }],
        name: 'store',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
      },
    ];

    // Deploy the contract using web3Service
    const deployResult = await web3Service.deployContract(abi, bytecode);

    if (!deployResult) {
      throw new Error('Failed to deploy contract');
    }

    const contractAddress = deployResult.address;
    console.log('Contract deployed successfully at:', contractAddress);

    // 3. Call the read method (retrieve) - should return 0 initially
    console.log('\nCalling retrieve() method...');
    const initialValue = await web3Service.callContractMethod(
      contractAddress,
      abi,
      'retrieve',
      []
    );
    console.log('Initial value:', initialValue);

    // Verify initial value is 0
    if (initialValue !== '0') {
      throw new Error(`Expected initial value to be 0, got ${initialValue}`);
    }

    // 4. Execute a transaction (store a value)
    console.log('\nCalling store(42) method...');
    const storeValue = 42;
    const storeTx = await web3Service.callContractMethod(
      contractAddress,
      abi,
      'store',
      [storeValue]
    );

    if (!storeTx) {
      throw new Error('Failed to execute store transaction');
    }

    console.log('Transaction successful:', storeTx.transactionHash);

    // 5. Call the read method again to verify the state change
    console.log('\nCalling retrieve() method again...');
    const updatedValue = await web3Service.callContractMethod(
      contractAddress,
      abi,
      'retrieve',
      []
    );
    console.log('Updated value:', updatedValue);

    // Verify the value was updated to 42
    if (updatedValue !== '42') {
      throw new Error(`Expected updated value to be 42, got ${updatedValue}`);
    }

    // Disconnect from web3Service
    console.log('\nDisconnecting from VM...');
    await web3Service.disconnect();
    console.log('Disconnected from VM');

    console.log('\n✅ VM contract interaction test passed!');
  } catch (error) {
    console.error('\n❌ VM contract interaction test failed:', error.message);
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
testVMContractInteractionFix();
