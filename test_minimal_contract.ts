import { vmProviderService } from './src/services/vmProviderService.js';

async function testMinimalContract() {
  console.log('🔍 Testing Minimal Contract...');

  try {
    // Start the VM
    await vmProviderService.start();
    const provider = vmProviderService.getProvider();
    const accounts = await provider.request({ method: 'eth_accounts' });

    console.log('✅ VM started, accounts:', accounts.length);

    // Deploy a minimal contract that just returns 42
    console.log('\n📦 Deploying minimal contract...');

    // Very simple contract: just returns 42 (0x2a in hex)
    // This is hand-crafted bytecode that should work
    const contractBytecode = '0x6080604052348015600f57600080fd5b5060848061001e6000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c8063967e6e651460325760405180910390fd5b60405190815260200160405180910390f35b602a905600a264697066735822122000000000000000000000000000000000000000000000000000000000000000000064736f6c63430008070033';

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

    // Test direct eth_call
    console.log('\n🔍 Testing direct eth_call...');

    const callResult = await provider.request({
      method: 'eth_call',
      params: [{
        to: contractAddress,
        from: accounts[0],
        data: '0x967e6e65' // getAge() function selector
      }]
    });

    console.log('✅ Direct eth_call result:', callResult);

    // If the call returns something other than 0x, it's working
    if (callResult !== '0x') {
      console.log('✅ SUCCESS! Contract call returned data:', callResult);

      // Test with Web3.js
      console.log('\n🌐 Testing with Web3.js...');

      const Web3 = (await import('web3')).default;
      const web3 = new Web3(provider);

      const abi = [
        {
          "inputs": [],
          "name": "getAge",
          "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
          "stateMutability": "pure",
          "type": "function"
        }
      ];

      const contract = new web3.eth.Contract(abi, contractAddress);

      try {
        const result = await contract.methods.getAge().call({ from: accounts[0] });
        console.log('✅ Web3.js getAge() result:', result);
        console.log('✅ SUCCESS! Contract call works with Web3.js!');
      } catch (web3Error) {
        console.error('❌ Web3.js call failed:', web3Error.message);
      }
    } else {
      console.log('❌ Contract call still returning empty data');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testMinimalContract();
