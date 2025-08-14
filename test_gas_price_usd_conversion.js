/**
 * Test script to verify gas price USD conversion functionality
 */

// Test the conversion formula
function testGasPriceToUSDConversion() {
  console.log('Testing Gas Price to USD Conversion...\n');

  // Test data
  const testCases = [
    { gasPrice: '20', ethPrice: 3000, expected: 0.00006 },
    { gasPrice: '50', ethPrice: 2500, expected: 0.000125 },
    { gasPrice: '10.5', ethPrice: 3200, expected: 0.0000336 },
  ];

  testCases.forEach((testCase, index) => {
    const { gasPrice, ethPrice, expected } = testCase;
    const result = parseFloat(gasPrice) * ethPrice * 1e-9;
    const isCorrect = Math.abs(result - expected) < 0.0000001;

    console.log(`Test Case ${index + 1}:`);
    console.log(`  Gas Price: ${gasPrice} Gwei`);
    console.log(`  ETH Price: $${ethPrice}`);
    console.log(`  Expected: $${expected}`);
    console.log(`  Result: $${result.toFixed(8)}`);
    console.log(`  Status: ${isCorrect ? '✅ PASS' : '❌ FAIL'}\n`);
  });
}

// Test the API call format (simulate what the store does)
async function testETHPriceAPI() {
  console.log('Testing ETH Price API call...\n');

  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const ethPrice = data.ethereum?.usd;

    console.log('API Response:', JSON.stringify(data, null, 2));
    console.log(`ETH Price: $${ethPrice}`);
    console.log(`Status: ${ethPrice ? '✅ PASS' : '❌ FAIL - No ETH price found'}\n`);

    // Test conversion with real ETH price
    if (ethPrice) {
      console.log('Testing with real ETH price:');
      const testGasPrice = '25'; // 25 gwei
      const usdEquivalent = parseFloat(testGasPrice) * ethPrice * 1e-9;
      console.log(`${testGasPrice} Gwei = $${usdEquivalent.toFixed(8)} USD`);
    }

  } catch (error) {
    console.error('❌ API Test Failed:', error.message);
  }
}

// Run tests
async function runTests() {
  console.log('='.repeat(50));
  console.log('GAS PRICE USD CONVERSION TESTS');
  console.log('='.repeat(50));

  testGasPriceToUSDConversion();
  await testETHPriceAPI();

  console.log('='.repeat(50));
  console.log('Tests completed!');
  console.log('='.repeat(50));
}

// Run if this script is executed directly
if (typeof window === 'undefined') {
  runTests();
}
