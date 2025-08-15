const { TokenCreatorPluginImplementation } = require('./dist/plugins/tokenCreatorPlugin.js');
const { CompilerService } = require('./dist/services/compilerService.js');

async function reproduceCompilationErrors() {
  console.log('Reproducing current compilation errors...');

  try {
    // Create token creator plugin instance
    const tokenCreator = new TokenCreatorPluginImplementation();

    // Create compiler service instance
    const compiler = CompilerService.getInstance();

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

    console.log('Compilation result success:', compilationResult.success);

    if (!compilationResult.success) {
      console.log('\n❌ COMPILATION FAILED');
      console.log('Errors:');
      compilationResult.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.type}: ${error.message}`);
        if (error.sourceLocation?.file) {
          console.log(`   File: ${error.sourceLocation.file}:${error.sourceLocation.start}`);
        }
      });

      // Check for specific error types we're trying to fix
      const spdxErrors = compilationResult.errors.filter(e =>
        e.message.includes('Multiple SPDX license identifiers')
      );
      const importErrors = compilationResult.errors.filter(e =>
        e.message.includes('not found') && (
          e.message.includes('IERC20.sol') ||
          e.message.includes('IERC20Metadata.sol') ||
          e.message.includes('Context.sol') ||
          e.message.includes('IERC6093.sol')
        )
      );

      console.log(`\n📊 Error Analysis:`);
      console.log(`- SPDX license errors: ${spdxErrors.length}`);
      console.log(`- Import path errors: ${importErrors.length}`);

      if (spdxErrors.length > 0) {
        console.log('\n🔍 SPDX License Errors:');
        spdxErrors.forEach(error => console.log(`   ${error.message}`));
      }

      if (importErrors.length > 0) {
        console.log('\n🔍 Import Path Errors:');
        importErrors.forEach(error => console.log(`   ${error.message}`));
      }
    } else {
      console.log('\n✅ COMPILATION SUCCEEDED (unexpected - errors should still exist)');
      console.log('Compiled contracts:', Object.keys(compilationResult.contracts));
    }

    if (compilationResult.warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      compilationResult.warnings.forEach((warning, index) => {
        console.log(`${index + 1}. ${warning.message}`);
      });
    }

  } catch (error) {
    console.error('Test failed with error:', error.message);
    console.error(error.stack);
  }
}

reproduceCompilationErrors();
