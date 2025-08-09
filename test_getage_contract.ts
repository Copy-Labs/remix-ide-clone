import { vmProviderService } from './src/services/vmProviderService.js';

async function testGetAgeContract() {
  console.log('🔍 Testing getAge Contract Call...');

  try {
    // Start the VM
    await vmProviderService.start();
    const provider = vmProviderService.getProvider();
    const accounts = await provider.request({ method: 'eth_accounts' });

    console.log('✅ VM started, accounts:', accounts.length);

    // Deploy a contract with getAge function
    console.log('\n📦 Deploying contract with getAge function...');

    // Simple contract with getAge function that returns 25
    // pragma solidity ^0.8.0; contract Person { function getAge() public pure returns (uint256) { return 25; } }
    // getAge() selector: 0x967e6e65
    const contractBytecode = '0x608060405234801561001057600080fd5b5060848061001f6000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c8063967e6e651460325760405180910390fd5b60405190815260200160405180910390f35b6019905600a2646970667358221220c7d3c4c3f3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c364736f6c63430008070033';

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

    // Test with Web3.js contract call for getAge
    console.log('\n🌐 Testing getAge with Web3.js...');

    const Web3 = (await import('web3')).default;
    const web3 = new Web3(provider);

    // ABI for contract with getAge function
    const abi = [
      {
        "inputs": [],
        "name": "getAge",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
      }
    ];

    const contract = new web3.eth.Contract(abi, contractAddress);

    try {
      console.log('🔍 Calling contract.methods.getAge().call()...');
      const result = await contract.methods.getAge().call({ from: accounts[0] });
      console.log('✅ getAge() result:', result);
      console.log('✅ SUCCESS! The getAge contract call issue has been resolved!');
    } catch (web3Error) {
      console.error('❌ getAge call failed:', web3Error.message);
      console.error('Full error:', web3Error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testGetAgeContract();
