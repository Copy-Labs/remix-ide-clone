import { vmProviderService } from './src/services/vmProviderService.js';

async function testHandcraftedContract() {
  console.log('🔍 Testing Hand-crafted Contract...');

  try {
    // Start the VM
    await vmProviderService.start();
    const provider = vmProviderService.getProvider();
    const accounts = await provider.request({ method: 'eth_accounts' });

    console.log('✅ VM started, accounts:', accounts.length);

    // Deploy a hand-crafted contract
    console.log('\n📦 Deploying hand-crafted contract...');

    // Hand-crafted bytecode for getAge() function
    // This is minimal EVM bytecode that:
    // 1. Checks if the function selector matches 0x967e6e65 (getAge)
    // 2. If yes, returns 42 (0x2a)
    // 3. If no, reverts
    const contractBytecode = '0x608060405234801561001057600080fd5b5060358061001f6000396000f3fe6080604052600436106100205760003560e01c8063967e6e651461002557600080fd5b600080fd5b602a60005260206000f3';

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
    console.log('📏 Stored code length:', storedCode.length);

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

      // Test with wrong function selector to see if it behaves differently
      console.log('\n🔍 Testing with wrong function selector...');
      const wrongCallResult = await provider.request({
        method: 'eth_call',
        params: [{
          to: contractAddress,
          from: accounts[0],
          data: '0x12345678' // Wrong function selector
        }]
      });
      console.log('📄 Wrong selector result:', wrongCallResult);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testHandcraftedContract();
