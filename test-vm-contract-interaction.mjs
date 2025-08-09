import { vmProviderService } from './src/services/vmProviderService.ts';
import Web3 from 'web3';

/**
 * Test for connecting, deploying, and interacting with a contract using VM accounts
 * This test demonstrates:
 * 1. Starting the VM and getting a test account
 * 2. Deploying a contract using the VM account
 * 3. Calling a read method on the contract
 * 4. Executing a transaction on the contract
 * 5. Verifying the state change by calling the read method again
 */
async function testVMContractInteraction() {
  console.log('=== Testing VM Contract Interaction ===');

  try {
    // 1. Start the VM and get a test account
    console.log('Starting VM...');
    const started = await vmProviderService.start();
    console.log('VM started:', started);

    if (!started) {
      throw new Error('Failed to start VM');
    }

    // Get the provider and create a Web3 instance
    const provider = vmProviderService.getProvider();
    const web3 = new Web3(provider);

    // Get the test accounts
    const accounts = vmProviderService.getAccounts();
    console.log('Number of accounts:', accounts.length);

    if (accounts.length === 0) {
      throw new Error('No test accounts available');
    }

    // Use the first account
    const testAccount = accounts[0];
    console.log('Using account:', testAccount.address);

    // Add the account to web3 wallet
    const account = web3.eth.accounts.privateKeyToAccount(testAccount.privateKey);
    web3.eth.accounts.wallet.add(account);

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

    // Create contract instance
    const contract = new web3.eth.Contract(abi);

    // Deploy the contract
    console.log('Deploying contract...');
    const deployTx = contract.deploy({
      data: bytecode,
      arguments: []
    });

    const txOptions = {
      from: testAccount.address,
      gas: 6000000,
      gasPrice: '20000000000', // 20 Gwei for legacy pricing
    };

    const deployed = await deployTx.send(txOptions);
    const contractAddress = deployed.options.address;
    console.log('Contract deployed successfully at:', contractAddress);

    // 3. Call the read method (retrieve) - should return 0 initially
    console.log('\nCalling retrieve() method...');
    const initialValue = await deployed.methods.retrieve().call({ from: testAccount.address });
    console.log('Initial value:', initialValue);

    // Verify initial value is 0
    if (initialValue !== '0') {
      throw new Error(`Expected initial value to be 0, got ${initialValue}`);
    }

    // 4. Execute a transaction (store a value)
    console.log('\nCalling store(42) method...');
    const storeValue = 42;
    const storeTx = await deployed.methods.store(storeValue).send({
      from: testAccount.address,
      gas: 6000000,
      gasPrice: '20000000000', // 20 Gwei for legacy pricing
    });

    console.log('Transaction successful:', storeTx.transactionHash);

    // 5. Call the read method again to verify the state change
    console.log('\nCalling retrieve() method again...');
    const updatedValue = await deployed.methods.retrieve().call({ from: testAccount.address });
    console.log('Updated value:', updatedValue);

    // Verify the value was updated to 42
    if (updatedValue !== '42') {
      throw new Error(`Expected updated value to be 42, got ${updatedValue}`);
    }

    // Stop the VM
    console.log('\nStopping VM...');
    await vmProviderService.stop();
    console.log('VM stopped successfully');

    console.log('\n✅ VM contract interaction test passed!');
  } catch (error) {
    console.error('\n❌ VM contract interaction test failed:', error.message);
    console.error('Stack:', error.stack);

    // Ensure we stop the VM even if the test fails
    try {
      await vmProviderService.stop();
      console.log('VM stopped after error');
    } catch (stopError) {
      console.error('Failed to stop VM:', stopError.message);
    }
  }
}

// Run the test
testVMContractInteraction();
