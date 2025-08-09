import Ganache from 'ganache';
import Web3 from 'web3';

async function testFixVerification() {
  console.log('Testing the deployment fix with exact vmProviderService configuration...');

  try {
    // Use the exact same configuration as vmProviderService.ts
    const predefinedAccounts = [
      {
        secretKey: '0x503f38a9c967ed597e47fe25643985f032b072db8075426a92110f82df48dfcb',
        balance: '0x56BC75E2D630E8000', // 100 ETH in wei
      },
      {
        secretKey: '0x7e5bfb82febc4c2c8529167104271ceec190eafdca277314912eaabdb67c6e5f',
        balance: '0x56BC75E2D630E8000',
      },
    ];

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
        hardfork: 'shanghai', // Use Shanghai hard fork for latest features including EIP-1559 gas pricing
      },
      miner: {
        blockTime: 0, // Instant mining
        defaultGasPrice: 20000000000, // 20 Gwei base gas price for realistic gas estimation
        defaultBaseFeePerGas: 1000000000, // 1 Gwei base fee for EIP-1559
      },
    };

    console.log('Starting Ganache with Shanghai hard fork...');
    const ganacheProvider = Ganache.provider(options);
    const web3 = new Web3(ganacheProvider);

    const accounts = await web3.eth.getAccounts();
    console.log('✅ VM started with Shanghai hard fork');
    console.log('   Account:', accounts[0]);

    // Add the account to web3 wallet using private key (same as our fix)
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

    const contract = new web3.eth.Contract(abi);

    // Test 1: Try with the OLD EIP-1559 approach (should potentially fail)
    console.log('\n1. Testing with OLD EIP-1559 gas pricing (before fix)...');
    const deployTx1 = contract.deploy({
      data: bytecode,
      arguments: []
    });

    const txOptionsOld = {
      from: accounts[0],
      gas: 6000000,
      maxFeePerGas: '2000000000', // 2 Gwei max fee per gas
      maxPriorityFeePerGas: '1000000000', // 1 Gwei priority fee
      gasPrice: undefined, // This was the problematic approach
    };

    try {
      const deployed1 = await deployTx1.send(txOptionsOld);
      console.log('   ✅ OLD approach worked:', deployed1.options.address);
    } catch (error) {
      console.log('   ❌ OLD approach failed:', error.message);
    }

    // Test 2: Try with the NEW legacy gas pricing approach (our fix)
    console.log('\n2. Testing with NEW legacy gas pricing (our fix)...');
    const deployTx2 = contract.deploy({
      data: bytecode,
      arguments: []
    });

    const txOptionsNew = {
      from: accounts[0],
      gas: 6000000,
      gasPrice: '0', // Use 0 gas price for JavaScript VM (our fix)
      maxFeePerGas: undefined, // Remove EIP-1559 gas pricing (our fix)
      maxPriorityFeePerGas: undefined, // Remove EIP-1559 gas pricing (our fix)
    };

    try {
      const deployed2 = await deployTx2.send(txOptionsNew);
      console.log('   ✅ NEW approach worked:', deployed2.options.address);
      console.log('   ✅ Our fix is working correctly!');
    } catch (error) {
      console.log('   ❌ NEW approach failed:', error.message);
      console.log('   ❌ Our fix needs more work');
    }

    await ganacheProvider.disconnect();
    console.log('\n✅ VM stopped');

    console.log('\n🎉 Fix verification completed!');
    console.log('The legacy gas pricing approach should work reliably for JavaScript VM deployments.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testFixVerification();
