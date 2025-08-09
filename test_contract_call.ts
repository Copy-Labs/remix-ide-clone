import { vmProviderService } from './src/services/vmProviderService.js';

async function testContractCall() {
  console.log('🔍 Testing Contract Call Issue...');

  try {
    // Start the VM
    await vmProviderService.start();
    const provider = vmProviderService.getProvider();
    const accounts = await provider.request({ method: 'eth_accounts' });

    console.log('✅ VM started, accounts:', accounts.length);

    // Deploy a simple contract with a getter function
    console.log('\n📦 Deploying test contract...');

    // Simple storage contract compiled with solc 0.8.7 for london hardfork
    // pragma solidity ^0.8.0; contract SimpleStorage { uint256 public storedData = 42; function get() public view returns (uint256) { return storedData; } }
    const contractBytecode = '0x608060405234801561001057600080fd5b50602a60008190555060c6806100276000396000f3fe6080604052348015600f57600080fd5b506004361060325760003560e01c80632a1afcd91460375780636d4ce63c14604c575b600080fd5b60005460405190815260200160405180910390f35b60005460405190815260200160405180910390f3fea2646970667358221220c7d3c4c3f3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c364736f6c63430008070033';

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

    // Check if contract has code
    const code = await provider.request({
      method: 'eth_getCode',
      params: [contractAddress, 'latest']
    });
    console.log('✅ Contract code length:', code.length);

    // Test direct eth_call to get() function
    console.log('\n🔍 Testing direct eth_call...');

    // get() function selector: 0x6d4ce63c
    const callResult = await provider.request({
      method: 'eth_call',
      params: [{
        to: contractAddress,
        data: '0x6d4ce63c', // get() function selector
        from: accounts[0]
      }, 'latest']
    });

    console.log('✅ Direct eth_call result:', callResult);
    console.log('✅ Result length:', callResult.length);

    // Convert result to number
    if (callResult && callResult !== '0x') {
      const resultValue = parseInt(callResult, 16);
      console.log('✅ Decoded value:', resultValue);
    }

    // Test with Web3.js contract call
    console.log('\n🌐 Testing with Web3.js...');

    const Web3 = (await import('web3')).default;
    const web3 = new Web3(provider);

    // Simple ABI for our test contract
    const abi = [
      {
        "inputs": [],
        "name": "get",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "storedData",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
      }
    ];

    const contract = new web3.eth.Contract(abi, contractAddress);

    try {
      const web3Result = await contract.methods.get().call({ from: accounts[0] });
      console.log('✅ Web3.js call result:', web3Result);
    } catch (web3Error) {
      console.error('❌ Web3.js call failed:', web3Error.message);
      console.error('Full error:', web3Error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testContractCall();
