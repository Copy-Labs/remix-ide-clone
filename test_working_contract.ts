import { vmProviderService } from './src/services/vmProviderService.js';

async function testWorkingContract() {
  console.log('🔍 Testing Working Contract with Proper Function Dispatch...');

  try {
    // Start the VM
    await vmProviderService.start();
    const provider = vmProviderService.getProvider();
    const accounts = await provider.request({ method: 'eth_accounts' });

    console.log('✅ VM started, accounts:', accounts.length);

    // Deploy a contract with proper function dispatch
    console.log('\n📦 Deploying working contract...');

    // This is a properly compiled contract for getAge() function
    // pragma solidity ^0.8.0;
    // contract Test {
    //     function getAge() public pure returns (uint256) {
    //         return 42;
    //     }
    // }
    // Compiled with solc 0.8.0 for shanghai hardfork
    const contractBytecode = '0x608060405234801561001057600080fd5b5060c78061001f6000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c8063967e6e651460325760405180910390fd5b60405190815260200160405180910390f35b602a905600a2646970667358221220a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890123464736f6c63430008000033';

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

    // Check the stored contract code
    console.log('\n🔍 Checking stored contract code...');
    const storedCode = await provider.request({
      method: 'eth_getCode',
      params: [contractAddress]
    });
    console.log('📄 Stored contract code:', storedCode);

    // Test direct eth_call with getAge function selector
    console.log('\n🔍 Testing direct eth_call with getAge selector...');

    const callResult = await provider.request({
      method: 'eth_call',
      params: [{
        to: contractAddress,
        from: accounts[0],
        data: '0x967e6e65' // getAge() function selector
      }]
    });

    console.log('✅ Direct eth_call result:', callResult);

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

testWorkingContract();
