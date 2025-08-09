import { vmProviderService } from './src/services/vmProviderService.js';

async function testVMConnection() {
  try {
    console.log('Testing VM connection...');
    const result = await vmProviderService.start();
    console.log('VM started successfully:', result);
    await vmProviderService.stop();
    console.log('VM stopped successfully');
  } catch (error: any) {
    console.error('VM connection failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testVMConnection();
