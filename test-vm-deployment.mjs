import { vmProviderService } from './src/services/vmProviderService.ts';
import Web3 from 'web3';

async function testVMDeployment() {
  console.log('Testing VM deployment with gas pricing fix...');

  try {
    console.log('Starting VM...');
    const started = await vmProviderService.start();
    console.log('VM started:', started);

    if (started) {
      const provider = vmProviderService.getProvider();
      const web3 = new Web3(provider);
      const accounts = vmProviderService.getAccounts();

      console.log('Number of accounts:', accounts.length);
      console.log('First account:', accounts[0].address);

      // Simple contract bytecode (just returns a value)
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

      // Add account to web3 wallet
      const account = web3.eth.accounts.privateKeyToAccount(accounts[0].privateKey);
      web3.eth.accounts.wallet.add(account);

      // Create contract instance
      const contract = new web3.eth.Contract(abi);

      // Deploy with fixed gas pricing
      console.log('Deploying contract...');
      const deployTx = contract.deploy({
        data: bytecode,
        arguments: []
      });

      const txOptions = {
        from: accounts[0].address,
        gas: 6000000,
        gasPrice: '0', // Legacy gas pricing for Berlin hard fork
        maxFeePerGas: undefined,
        maxPriorityFeePerGas: undefined,
      };

      const deployed = await deployTx.send(txOptions);
      console.log('Contract deployed successfully at:', deployed.options.address);

      console.log('Stopping VM...');
      await vmProviderService.stop();
      console.log('VM stopped successfully');

      console.log('✅ VM deployment test passed!');
    }
  } catch (error) {
    console.error('❌ VM deployment test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testVMDeployment();
