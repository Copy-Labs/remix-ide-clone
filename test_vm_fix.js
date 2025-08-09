const { VMProviderService } = require('./dist/services/vmProviderService.js');

async function testVMConnection() {
  try {
    console.log('Testing VM connection...');
    const vmService = VMProviderService.getInstance();
    const result = await vmService.start();
    console.log('VM started successfully:', result);
    await vmService.stop();
    console.log('VM stopped successfully');
  } catch (error) {
    console.error('VM connection failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testVMConnection();
