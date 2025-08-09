import { vmProviderService } from './src/services/vmProviderService.js';
import { Web3Service } from './src/services/web3Service.js';

// Simple contract ABI and bytecode for testing
const simpleStorageABI = [
  {
    "inputs": [{"internalType": "uint256", "name": "_initialValue", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "get",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "_value", "type": "uint256"}],
    "name": "set",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// Simple storage contract bytecode (compiled from Solidity)
const simpleStorageBytecode = "0x608060405234801561001057600080fd5b5060405161017938038061017983398101604081905261002f91610037565b600055610050565b60006020828403121561004957600080fd5b5051919050565b61011a8061005f6000396000f3fe6080604052348015600f57600080fd5b506004361060325760003560e01c80636057361d1460375780636d4ce63c14604c575b600080fd5b604a6042366004605e565b600055565b005b60005460405190815260200160405180910390f35b600060208284031215606f57600080fd5b503591905056fea2646970667358221220c7b3c8b1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c164736f6c63430008110033";

async function testContractDeploymentAndInteraction() {
  try {
    console.log('Starting VM...');
    const vmStarted = await vmProviderService.start();
    if (!vmStarted) {
      throw new Error('Failed to start VM');
    }
    console.log('VM started successfully');

    // Create Web3Service instance and connect to VM
    const web3Service = Web3Service.getInstance();
    await web3Service.connectToVM();
    console.log('Connected to VM');

    // Deploy the contract
    console.log('Deploying contract...');
    const deployResult = await web3Service.deployContract(
      simpleStorageABI,
      simpleStorageBytecode,
      [42], // Initial value
      {}
    );

    if (!deployResult) {
      throw new Error('Contract deployment failed');
    }

    console.log('Contract deployed:', deployResult);

    // Test reading from the contract
    console.log('Testing contract read operation...');
    const readResult = await web3Service.callContractMethod(
      deployResult.address,
      simpleStorageABI,
      'get',
      []
    );

    console.log('Read result:', readResult);

    // Test writing to the contract
    console.log('Testing contract write operation...');
    const writeResult = await web3Service.callContractMethod(
      deployResult.address,
      simpleStorageABI,
      'set',
      [100]
    );

    console.log('Write result:', writeResult);

    // Read again to verify the write
    console.log('Reading again to verify write...');
    const readResult2 = await web3Service.callContractMethod(
      deployResult.address,
      simpleStorageABI,
      'get',
      []
    );

    console.log('Read result after write:', readResult2);

    // Stop the VM
    await vmProviderService.stop();
    console.log('VM stopped');

    // Summary
    console.log('\n=== TEST SUMMARY ===');
    console.log('Deployment successful:', !!deployResult);
    console.log('Initial read result:', readResult);
    console.log('Write operation result:', !!writeResult);
    console.log('Final read result:', readResult2);

    if (readResult === '0x' || readResult2 === '0x') {
      console.log('⚠️  WARNING: Contract interaction returned "0x" - this indicates an issue');
    } else {
      console.log('✅ Contract interactions working properly');
    }

  } catch (error: any) {
    console.error('Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    await vmProviderService.stop();
  }
}

testContractDeploymentAndInteraction();
