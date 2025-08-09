import { vmProviderService } from './src/services/vmProviderService.ts';

async function testVM() {
  console.log('Testing VM Provider Service...');

  try {
    console.log('Starting VM...');
    const started = await vmProviderService.start();
    console.log('VM started:', started);

    if (started) {
      const accounts = vmProviderService.getAccounts();
      console.log('Number of accounts:', accounts.length);

      if (accounts.length > 0) {
        console.log('First account:');
        console.log('  Address:', accounts[0].address);
        console.log('  Private Key:', accounts[0].privateKey.substring(0, 10) + '...');
        console.log('  Balance:', accounts[0].balance);
      }

      console.log('Stopping VM...');
      await vmProviderService.stop();
      console.log('VM stopped successfully');
    }
  } catch (error) {
    console.error('Error testing VM:', error.message);
    console.error('Stack:', error.stack);
  }
}

testVM();
