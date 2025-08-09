import Ganache from 'ganache';
import Web3 from 'web3';

async function testGanacheGasPricing() {
  console.log('Testing Ganache gas pricing configuration...');

  try {
    // Predefined accounts (same as in vmProviderService)
    const predefinedAccounts = [
      {
        secretKey: '0x503f38a9c967ed597e47fe25643985f032b072db8075426a92110f82df48dfcb',
        balance: '0x56BC75E2D630E8000', // 100 ETH in wei
      },
      {
        secretKey: '0x7e5bfb82febc4c2c8529167104271ceec190eafdca277314912eaabdb67c6e5f',
        balance: '0x56BC75E2D630E8000',
      }
    ];

    // VM options with Berlin hard fork (same as in vmProviderService)
    const options = {
      logging: {
        quiet: true,
      },
      wallet: {
        accounts: predefinedAccounts,
      },
      chain: {
        chainId: 1337,
        networkId: 1337,
        hardfork: 'berlin', // Use Berlin hard fork to avoid EIP-1559 gas pricing issues
      },
      miner: {
        blockTime: 0, // Instant mining
        defaultGasPrice: 0, // Gas is free in JavaScript VM
      },
    };

    console.log('Starting Ganache with Berlin hard fork...');
    const provider = Ganache.provider(options);
    const web3 = new Web3(provider);

    // Get accounts
    const accounts = await provider.request({
      method: 'eth_accounts',
      params: []
    });

    console.log('Accounts available:', accounts.length);
    console.log('First account:', accounts[0]);

    // Add account to web3 wallet
    const account = web3.eth.accounts.privateKeyToAccount(predefinedAccounts[0].secretKey);
    web3.eth.accounts.wallet.add(account);

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

    // Create contract instance
    const contract = new web3.eth.Contract(abi);

    // Deploy with legacy gas pricing (Berlin hard fork)
    console.log('Deploying contract with legacy gas pricing...');
    const deployTx = contract.deploy({
      data: bytecode,
      arguments: []
    });

    const txOptions = {
      from: accounts[0],
      gas: 6000000,
      gasPrice: '0', // Legacy gas pricing for Berlin hard fork
      // Explicitly avoid EIP-1559 gas pricing
      maxFeePerGas: undefined,
      maxPriorityFeePerGas: undefined,
    };

    const deployed = await deployTx.send(txOptions);
    console.log('✅ Contract deployed successfully at:', deployed.options.address);

    // Test a contract method call
    console.log('Testing contract method call...');
    const receipt = await deployed.methods.store(42).send({
      from: accounts[0],
      gas: 6000000,
      gasPrice: '0',
      maxFeePerGas: undefined,
      maxPriorityFeePerGas: undefined,
    });

    console.log('✅ Contract method call successful, tx:', receipt.transactionHash);

    // Read the stored value
    const storedValue = await deployed.methods.retrieve().call();
    console.log('✅ Stored value retrieved:', storedValue);

    console.log('✅ All tests passed! Gas pricing fix is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testGanacheGasPricing();
