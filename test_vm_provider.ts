import { vmProviderService } from './src/services/vmProviderService.js';

async function testVMProvider() {
  console.log('Testing VMProviderService...');

  try {
    // Start the VM
    const started = await vmProviderService.start();
    console.log('VM started:', started);

    // Get accounts
    const accounts = vmProviderService.getAccounts();
    console.log('Accounts:', accounts.length);

    // Test basic JSON-RPC calls
    const provider = vmProviderService.getProvider();

    // Test eth_accounts
    const accountsResult = await provider.request({ method: 'eth_accounts' });
    console.log('eth_accounts result:', accountsResult);

    // Test eth_getBalance
    const balance = await provider.request({
      method: 'eth_getBalance',
      params: [accountsResult[0], 'latest']
    });
    console.log('Balance:', balance);

    // Test eth_chainId
    const chainId = await provider.request({ method: 'eth_chainId' });
    console.log('Chain ID:', chainId);

    // Test contract deployment
    console.log('Testing contract deployment...');
    const deployTx = await provider.request({
      method: 'eth_sendTransaction',
      params: [{
        from: accountsResult[0],
        data: '0x608060405234801561001057600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055506101cb806100606000396000f3fe608060405234801561001057600080fd5b50600436106100415760003560e01c8063893d20e814610046578063a6f9dae114610064578063d826f88f14610080575b600080fd5b61004e61009a565b60405161005b91906100f6565b60405180910390f35b61007e600480360381019061007991906100c3565b6100c4565b005b610088610158565b60405161009191906100f6565b60405180910390f35b60008060009054906101000a900473ffffffffffffffffffffffffffffffffffffffff16905090565b6000809054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161461011c57600080fd5b806000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b60006101a082610175565b9050919050565b6101b081610195565b82525050565b60006020820190506101cb60008301846101a7565b9291505056fea2646970667358221220c7d3c4c3f3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c364736f6c63430008070033',
        gas: '0x1C9C380'
      }]
    });
    console.log('Contract deployment tx:', deployTx);

    // Get transaction receipt
    const receipt = await provider.request({
      method: 'eth_getTransactionReceipt',
      params: [deployTx]
    });
    console.log('Contract deployed at:', receipt?.contractAddress);

    console.log('All tests passed!');

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testVMProvider();
