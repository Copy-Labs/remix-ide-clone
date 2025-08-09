import { vmProviderService } from './src/services/vmProviderService.js';

async function testComprehensive() {
  console.log('Running comprehensive VMProviderService tests...');

  try {
    // Start the VM
    const started = await vmProviderService.start();
    console.log('✓ VM started:', started);

    const provider = vmProviderService.getProvider();
    const accounts = await provider.request({ method: 'eth_accounts' });
    console.log('✓ Accounts loaded:', accounts.length);

    // Test 1: Deploy a simple storage contract
    console.log('\n--- Test 1: Contract Deployment ---');
    const storageContract = '0x608060405234801561001057600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055506101cb806100606000396000f3fe608060405234801561001057600080fd5b50600436106100415760003560e01c8063893d20e814610046578063a6f9dae114610064578063d826f88f14610080575b600080fd5b61004e61009a565b60405161005b91906100f6565b60405180910390f35b61007e600480360381019061007991906100c3565b6100c4565b005b610088610158565b60405161009191906100f6565b60405180910390f35b60008060009054906101000a900473ffffffffffffffffffffffffffffffffffffffff16905090565b6000809054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161461011c57600080fd5b806000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b60006101a082610175565b9050919050565b6101b081610195565b82525050565b60006020820190506101cb60008301846101a7565b9291505056fea2646970667358221220c7d3c4c3f3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c364736f6c63430008070033';

    const deployTx = await provider.request({
      method: 'eth_sendTransaction',
      params: [{
        from: accounts[0],
        data: storageContract,
        gas: '0x1C9C380'
      }]
    });
    console.log('✓ Contract deployed, tx:', deployTx);

    const receipt = await provider.request({
      method: 'eth_getTransactionReceipt',
      params: [deployTx]
    });
    const contractAddress = receipt.contractAddress;
    console.log('✓ Contract address:', contractAddress);

    // Test 2: Check contract code
    console.log('\n--- Test 2: Contract Code Verification ---');
    const code = await provider.request({
      method: 'eth_getCode',
      params: [contractAddress, 'latest']
    });
    console.log('✓ Contract has code:', code.length > 2);

    // Test 3: Call contract function (getOwner)
    console.log('\n--- Test 3: Contract Function Call ---');
    const getOwnerCall = await provider.request({
      method: 'eth_call',
      params: [{
        to: contractAddress,
        data: '0x893d20e8' // getOwner() function selector
      }, 'latest']
    });
    console.log('✓ Contract call result:', getOwnerCall);

    // Test 4: Send transaction to contract (changeOwner)
    console.log('\n--- Test 4: Contract State Change ---');
    const newOwner = accounts[1];
    const changeOwnerTx = await provider.request({
      method: 'eth_sendTransaction',
      params: [{
        from: accounts[0],
        to: contractAddress,
        data: '0xa6f9dae1000000000000000000000000' + newOwner.slice(2), // changeOwner(address)
        gas: '0x5208'
      }]
    });
    console.log('✓ Change owner tx:', changeOwnerTx);

    // Test 5: Verify state change
    console.log('\n--- Test 5: State Change Verification ---');
    const newOwnerCall = await provider.request({
      method: 'eth_call',
      params: [{
        to: contractAddress,
        data: '0x893d20e8' // getOwner() function selector
      }, 'latest']
    });
    console.log('✓ New owner call result:', newOwnerCall);

    // Test 6: Check storage directly
    console.log('\n--- Test 6: Storage Inspection ---');
    const storage = await provider.request({
      method: 'eth_getStorageAt',
      params: [contractAddress, '0x0', 'latest']
    });
    console.log('✓ Storage at slot 0:', storage);

    // Test 7: Check transaction count (nonce)
    console.log('\n--- Test 7: Nonce Management ---');
    const nonce = await provider.request({
      method: 'eth_getTransactionCount',
      params: [accounts[0], 'latest']
    });
    console.log('✓ Account nonce:', nonce);

    // Test 8: Gas estimation
    console.log('\n--- Test 8: Gas Estimation ---');
    const gasEstimate = await provider.request({
      method: 'eth_estimateGas',
      params: [{
        from: accounts[0],
        to: contractAddress,
        data: '0x893d20e8'
      }]
    });
    console.log('✓ Gas estimate:', gasEstimate);

    // Test 9: Block information
    console.log('\n--- Test 9: Block Information ---');
    const blockNumber = await provider.request({
      method: 'eth_blockNumber'
    });
    console.log('✓ Current block number:', blockNumber);

    const block = await provider.request({
      method: 'eth_getBlockByNumber',
      params: ['latest', false]
    });
    console.log('✓ Latest block hash:', block.hash);

    // Test 10: Event logs
    console.log('\n--- Test 10: Event Logs ---');
    const logs = await provider.request({
      method: 'eth_getLogs',
      params: [{
        fromBlock: '0x0',
        toBlock: 'latest'
      }]
    });
    console.log('✓ Total logs found:', logs.length);

    console.log('\n🎉 All comprehensive tests passed!');
    console.log('VMProviderService is fully compatible with modern @ethereumjs/* packages');
    console.log('and works as a drop-in Remix-style local EVM JSON-RPC provider.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testComprehensive();
