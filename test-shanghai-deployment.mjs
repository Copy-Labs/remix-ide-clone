import { vmProviderService } from './src/services/vmProviderService.ts';
import Web3 from 'web3';

async function testShanghaiDeployment() {
  console.log('Testing VM deployment with Shanghai hard fork and EIP-1559 gas pricing...');

  try {
    console.log('Starting VM with Shanghai hard fork...');
    const started = await vmProviderService.start();
    console.log('VM started:', started);

    if (started) {
      const provider = vmProviderService.getProvider();
      const web3 = new Web3(provider);
      const accounts = vmProviderService.getAccounts();

      console.log('Number of accounts:', accounts.length);
      console.log('First account:', accounts[0].address);

      // Get the latest block to check EIP-1559 support
      const latestBlock = await web3.eth.getBlock('latest');
      console.log('Latest block number:', latestBlock.number);
      console.log('Base fee per gas:', latestBlock.baseFeePerGas ? latestBlock.baseFeePerGas.toString() : 'Not available');

      // Simple contract bytecode (Storage contract)
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

      // Deploy with EIP-1559 gas pricing (Shanghai hard fork)
      console.log('Deploying contract with EIP-1559 gas pricing...');
      const deployTx = contract.deploy({
        data: bytecode,
        arguments: []
      });

      // Estimate gas first
      const gasEstimate = await deployTx.estimateGas({
        from: accounts[0].address
      });
      console.log('Gas estimate:', gasEstimate.toString());

      const txOptions = {
        from: accounts[0].address,
        gas: gasEstimate,
        // EIP-1559 gas pricing for Shanghai hard fork
        maxFeePerGas: '2000000000', // 2 Gwei max fee per gas
        maxPriorityFeePerGas: '1000000000', // 1 Gwei priority fee
        // Don't use legacy gasPrice with EIP-1559
        gasPrice: undefined,
      };

      const deployed = await deployTx.send(txOptions);
      console.log('✅ Contract deployed successfully at:', deployed.options.address);

      // Test gas pricing information
      const gasPrice = await web3.eth.getGasPrice();
      console.log('Current gas price:', gasPrice.toString());

      // Test a contract method call with EIP-1559
      console.log('Testing contract method call with EIP-1559...');
      const receipt = await deployed.methods.store(42).send({
        from: accounts[0].address,
        gas: 100000,
        maxFeePerGas: '2000000000',
        maxPriorityFeePerGas: '1000000000',
        gasPrice: undefined,
      });

      console.log('✅ Contract method call successful, tx:', receipt.transactionHash);
      console.log('Gas used:', receipt.gasUsed);
      console.log('Effective gas price:', receipt.effectiveGasPrice);

      // Read the stored value
      const storedValue = await deployed.methods.retrieve().call();
      console.log('✅ Stored value retrieved:', storedValue);

      console.log('Stopping VM...');
      await vmProviderService.stop();
      console.log('VM stopped successfully');

      console.log('✅ All tests passed! Shanghai hard fork with EIP-1559 gas pricing is working correctly.');

    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testShanghaiDeployment();
