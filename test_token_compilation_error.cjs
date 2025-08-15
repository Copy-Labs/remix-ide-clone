const { TokenCreatorPluginImplementation } = require('./dist/plugins/tokenCreatorPlugin.js');
const { CompilerService } = require('./dist/services/compilerService.js');

async function testTokenCompilationError() {
  console.log('Testing Token Creator compilation error...');

  try {
    // Create token creator plugin instance
    const tokenCreator = new TokenCreatorPluginImplementation();

    // Create compiler service instance
    const compiler = new CompilerService();

    // Generate a basic ERC20 token
    const tokenConfig = {
      templateId: 'erc20-basic',
      name: 'TokenTest1',
      symbol: 'TT1',
      totalSupply: '1000000',
      decimals: 18
    };

    console.log('Generating token with config:', tokenConfig);
    const generatedToken = tokenCreator.generateToken(tokenConfig);

    console.log('Generated token source code:');
    console.log(generatedToken.sourceCode);
    console.log('\n--- Attempting compilation ---');

    // Try to compile the generated token
    const sources = {
      [generatedToken.filename]: generatedToken.sourceCode
    };

    const compilationResult = await compiler.compile(sources);

    console.log('Compilation result:', compilationResult);

    if (!compilationResult.success) {
      console.log('\n❌ COMPILATION FAILED AS EXPECTED');
      console.log('Errors:');
      compilationResult.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.message}`);
      });
    } else {
      console.log('\n✅ COMPILATION SUCCEEDED (unexpected)');
    }

  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

testTokenCompilationError();
