import Ganache from 'ganache';
import Web3 from 'web3';

async function reproduceVMError() {
  console.log('Reproducing "code couldn\'t be stored" error...');

  try {
    // Start Ganache with Berlin hard fork (doesn't support EIP-1559)
    const ganacheProvider = Ganache.provider({
      accounts: [
        {
          secretKey: '0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d',
          balance: '0x56BC75E2D630FFFFF'
        }
      ],
      hardfork: 'berlin', // Berlin doesn't support EIP-1559
      gasLimit: '0x6691B7',
      gasPrice: '0x0'
    });

    const web3 = new Web3(ganacheProvider);
    const accounts = await web3.eth.getAccounts();

    console.log('VM started with Berlin hard fork');
    console.log('Account:', accounts[0]);

    // Simple contract bytecode
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

    const contract = new web3.eth.Contract(abi);

    // This should cause the "code couldn't be stored" error
    console.log('Attempting deployment with EIP-1559 gas pricing (should fail)...');
    const deployTx = contract.deploy({
      data: bytecode,
      arguments: []
    });

    const txOptionsEIP1559 = {
      from: accounts[0],
      gas: 6000000,
      maxFeePerGas: '2000000000', // EIP-1559 pricing
      maxPriorityFeePerGas: '1000000000',
      gasPrice: undefined // This is what causes the issue
    };

    try {
      const deployed = await deployTx.send(txOptionsEIP1559);
      console.log('❌ Expected error but deployment succeeded:', deployed.options.address);
    } catch (error) {
      console.log('✅ Got expected error with EIP-1559 pricing:', error.message);
    }

    // Now try with legacy gas pricing (should work)
    console.log('Attempting deployment with legacy gas pricing (should work)...');
    const txOptionsLegacy = {
      from: accounts[0],
      gas: 6000000,
      gasPrice: '0', // Legacy pricing
      maxFeePerGas: undefined,
      maxPriorityFeePerGas: undefined
    };

    try {
      const deployed = await deployTx.send(txOptionsLegacy);
      console.log('✅ Deployment succeeded with legacy pricing:', deployed.options.address);
    } catch (error) {
      console.log('❌ Unexpected error with legacy pricing:', error.message);
    }

    await ganacheProvider.disconnect();
    console.log('VM stopped');

  } catch (error) {
    console.error('Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

reproduceVMError();
