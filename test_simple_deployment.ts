import { vmProviderService } from './src/services/vmProviderService.js';
import { Web3Service } from './src/services/web3Service.js';

// Very simple contract that just stores a value (no constructor parameters)
const simpleContractABI = [
  {
    "inputs": [],
    "name": "getValue",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

// Extremely simple contract bytecode - just returns 42
const simpleContractBytecode = "0x6080604052348015600f57600080fd5b50602a6000526020600060206000f3";

async function testSimpleDeployment() {
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

    // Deploy the simple contract (no constructor parameters)
    console.log('Deploying simple contract...');
    const deployResult = await web3Service.deployContract(
      simpleContractABI,
      simpleContractBytecode,
      [], // No constructor arguments
      { gas: 1000000 } // Lower gas limit
    );

    if (!deployResult) {
      console.log('❌ Contract deployment failed');
    } else {
      console.log('✅ Contract deployed successfully:', deployResult);

      // Try to call the contract
      console.log('Testing contract call...');
      const result = await web3Service.callContractMethod(
        deployResult.address,
        simpleContractABI,
        'getValue',
        []
      );
      console.log('Contract call result:', result);
    }

    // Stop the VM
    await vmProviderService.stop();
    console.log('VM stopped');

  } catch (error: any) {
    console.error('Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    await vmProviderService.stop();
  }
}

testSimpleDeployment();
