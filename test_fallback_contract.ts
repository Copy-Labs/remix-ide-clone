import { vmProviderService } from './src/services/vmProviderService.js';

async function testFallbackContract() {
  console.log('🔍 Testing Fallback Contract...');

  try {
    // Start the VM
    await vmProviderService.start();
    const provider = vmProviderService.getProvider();
    const accounts = await provider.request({ method: 'eth_accounts' });

    console.log('✅ VM started, accounts:', accounts.length);

    // Deploy a contract with just a fallback that returns 42
    console.log('\n📦 Deploying fallback contract...');

    // Simplest possible contract: fallback() { return 42; }
    // This bytecode just returns 0x000000000000000000000000000000000000000000000000000000000000002a (42 in hex)
    const contractBytecode = '0x6080604052348015600f57600080fd5b50601e8061001e6000396000f3fe602a6000526020600060206000f3';

    const deployTx = await provider.request({
      method: 'eth_sendTransaction',
      params: [{
        from: accounts[0],
        data: contractBytecode,
        gas: '0x1C9C380'
      }]
    });

    const receipt = await provider.request({
      method: 'eth_getTransactionReceipt',
      params: [deployTx]
    });

    const contractAddress = receipt.contractAddress;
    console.log('✅ Contract deployed at:', contractAddress);

    // Test direct eth_call with any data (should trigger fallback)
    console.log('\n🔍 Testing direct eth_call to fallback...');

    const callResult = await provider.request({
      method: 'eth_call',
      params: [{
        to: contractAddress,
        from: accounts[0],
        data: '0x12345678' // Any data should trigger fallback
      }]
    });

    console.log('✅ Direct eth_call result:', callResult);

    // Test with empty data too
    console.log('\n🔍 Testing eth_call with empty data...');

    const callResult2 = await provider.request({
      method: 'eth_call',
      params: [{
        to: contractAddress,
        from: accounts[0],
        data: '0x'
      }]
    });

    console.log('✅ Empty data eth_call result:', callResult2);

    if (callResult !== '0x' || callResult2 !== '0x') {
      console.log('✅ SUCCESS! Contract is returning data');
    } else {
      console.log('❌ Contract still returning empty data');

      // Let's check what code is actually stored at the contract address
      console.log('\n🔍 Checking stored contract code...');
      const storedCode = await provider.request({
        method: 'eth_getCode',
        params: [contractAddress]
      });
      console.log('📄 Stored contract code:', storedCode);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testFallbackContract();
