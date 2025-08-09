import { vmProviderService } from './dist/services/vmProviderService.js';

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

    console.log('Basic tests passed!');

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testVMProvider();
