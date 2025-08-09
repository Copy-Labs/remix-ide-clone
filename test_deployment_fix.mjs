import { vmProviderService } from './src/services/vmProviderService.ts';
import { web3Service } from './src/services/web3Service.ts';

async function testDeploymentFix() {
  console.log('Testing deployment fix for "code couldn\'t be stored" error...');

  try {
    // Start the VM
    console.log('Starting JavaScript VM...');
    const vmStarted = await vmProviderService.start();
    if (!vmStarted) {
      throw new Error('Failed to start JavaScript VM');
    }
    console.log('✅ JavaScript VM started successfully');

    // Connect web3Service to VM with test account
    console.log('Connecting to JavaScript VM with test account...');
    const connected = await web3Service.connect('vm', 0);
    if (!connected) {
      throw new Error('Failed to connect to JavaScript VM');
    }
    console.log('✅ Connected to JavaScript VM with test account');

    // Test contract deployment
    console.log('Testing contract deployment...');

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

    // Deploy the contract
    const deployResult = await web3Service.deployContract(abi, bytecode, [], {});

    if (deployResult) {
      console.log('✅ Contract deployed successfully!');
      console.log('   Address:', deployResult.address);
      console.log('   Transaction Hash:', deployResult.transactionHash);
    } else {
      console.log('❌ Contract deployment failed');
    }

    // Clean up
    console.log('Cleaning up...');
    await web3Service.disconnect();
    await vmProviderService.stop();
    console.log('✅ Cleanup completed');

    if (deployResult) {
      console.log('\n🎉 Deployment fix test PASSED! The "code couldn\'t be stored" error has been resolved.');
    } else {
      console.log('\n❌ Deployment fix test FAILED! The error still persists.');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);

    // Clean up on error
    try {
      await web3Service.disconnect();
      await vmProviderService.stop();
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError.message);
    }
  }
}

testDeploymentFix();
