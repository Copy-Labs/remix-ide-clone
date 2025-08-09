import { vmProviderService } from './src/services/vmProviderService.ts';
import { web3Service } from './src/services/web3Service.ts';

async function testVMDeploymentWithService() {
  console.log('🧪 Testing VM deployment using web3Service...');

  try {
    // Test 1: Connect to VM
    console.log('\n1. Connecting to VM...');
    const connected = await web3Service.connect('vm');
    console.log('VM connected:', connected);

    if (!connected) {
      throw new Error('Failed to connect to VM');
    }

    // Test 2: Check test accounts
    console.log('\n2. Checking test accounts...');
    const testAccounts = web3Service.getTestAccounts();
    console.log('Number of test accounts:', testAccounts.length);
    console.log('First account:', testAccounts[0]?.address);
    console.log('Is using test wallet:', web3Service.isUsingTestWallet());
    console.log('Selected test account index:', web3Service.getSelectedTestAccountIndex());

    // Test 3: Deploy a simple contract
    console.log('\n3. Deploying contract...');

    // Simple storage contract
    const bytecode = '0x608060405234801561001057600080fd5b50610150806100206000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c80632e64cec11461003b5780636057361d14610059575b600080fd5b610043610075565b60405161005091906100d9565b60405180910390f35b610073600480360381019061006e919061009d565b61007e565b005b60008054905090565b8060008190555050565b60008135905061009781610103565b92915050565b6000602082840312156100b3576100b26100fe565b5b60006100c184828501610088565b91505092915050565b6100d3816100f4565b82525050565b60006020820190506100ee60008301846100ca565b92915050565b6000819050919050565b600080fd5b61010c816100f4565b811461011757600080fd5b5056fea2646970667358221220223b76b2a4b83584962b3155b370beb66a7a7d6869dd947e2a7c8a6b0ffa58d364736f6c63430008070033';
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

    // Test with default options (should use legacy gas pricing)
    console.log('Deploying with default options...');
    const result1 = await web3Service.deployContract(abi, bytecode, [], {});

    if (result1) {
      console.log('✅ Contract deployed successfully at:', result1.address);
      console.log('Transaction hash:', result1.transactionHash);
    } else {
      console.log('❌ Deployment failed with default options');
    }

    // Test with explicit legacy gas pricing
    console.log('\nDeploying with explicit legacy gas pricing...');
    const result2 = await web3Service.deployContract(abi, bytecode, [], {
      gasPrice: '0',
      gas: 6000000
    });

    if (result2) {
      console.log('✅ Contract deployed successfully at:', result2.address);
      console.log('Transaction hash:', result2.transactionHash);
    } else {
      console.log('❌ Deployment failed with legacy gas pricing');
    }

    // Test with EIP-1559 gas pricing (should fail or fallback)
    console.log('\nDeploying with EIP-1559 gas pricing...');
    const result3 = await web3Service.deployContract(abi, bytecode, [], {
      maxFeePerGas: '2000000000',
      maxPriorityFeePerGas: '1000000000',
      gas: 6000000
    });

    if (result3) {
      console.log('✅ Contract deployed successfully at:', result3.address);
      console.log('Transaction hash:', result3.transactionHash);
    } else {
      console.log('❌ Deployment failed with EIP-1559 gas pricing');
    }

    // Test 4: Switch VM accounts
    console.log('\n4. Testing VM account switching...');
    const switched = await web3Service.switchVMAccount(1);
    console.log('Switched to account 1:', switched);

    if (switched) {
      console.log('Current account:', web3Service.getAccount());
      console.log('Selected test account index:', web3Service.getSelectedTestAccountIndex());
    }

    // Test 5: Contract interaction (if we have a deployed contract)
    if (result1) {
      console.log('\n5. Testing contract interaction...');

      // Call read method
      const readResult = await web3Service.callContractMethod(
        result1.address,
        abi,
        'retrieve',
        [],
        {}
      );
      console.log('Read method result:', readResult);

      // Call write method
      const writeResult = await web3Service.callContractMethod(
        result1.address,
        abi,
        'store',
        [42],
        { gas: 100000 }
      );
      console.log('Write method result:', writeResult);

      // Read again to verify
      const readResult2 = await web3Service.callContractMethod(
        result1.address,
        abi,
        'retrieve',
        [],
        {}
      );
      console.log('Read method result after write:', readResult2);
    }

    // Test 6: Disconnect
    console.log('\n6. Disconnecting...');
    await web3Service.disconnect();
    console.log('Disconnected successfully');

    console.log('\n🎉 All VM deployment tests completed!');

  } catch (error) {
    console.error('❌ VM deployment test failed:', error.message);
    console.error('Stack:', error.stack);

    // Try to disconnect on error
    try {
      await web3Service.disconnect();
    } catch (disconnectError) {
      console.error('Failed to disconnect:', disconnectError.message);
    }
  }
}

testVMDeploymentWithService();
