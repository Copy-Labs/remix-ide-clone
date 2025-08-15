const { TokenCreatorPluginImplementation } = require('./dist/plugins/tokenCreatorPlugin.js');
const { CompilerService } = require('./dist/services/compilerService.js');

async function reproduceDeclarationError() {
  console.log('Reproducing DeclarationError: Identifier not found or not unique...');

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

      // Check for specific DeclarationError
      const declarationErrors = compilationResult.errors.filter(e =>
        e.type === 'DeclarationError' || e.message.includes('Identifier not found')
      );

      if (declarationErrors.length > 0) {
        console.log('\n🔍 DECLARATION ERRORS FOUND:');
        declarationErrors.forEach((error, index) => {
          console.log(`${index + 1}. ${error.message}`);
          if (error.sourceLocation) {
            console.log(`   Location: Line ${error.sourceLocation.start} in ${error.sourceLocation.file || 'contract'}`);
          }
        });

        // Try to identify the problematic line 169
        const line169Error = compilationResult.errors.find(e =>
          e.sourceLocation && e.sourceLocation.start === 169
        );

        if (line169Error) {
          console.log('\n🎯 LINE 169 ERROR DETAILS:');
          console.log(`   Message: ${line169Error.message}`);
          console.log(`   Type: ${line169Error.type}`);

          // Show context around line 169
          const sourceLines = generatedToken.sourceCode.split('\n');
          if (sourceLines.length >= 169) {
            console.log('\n📍 CODE CONTEXT AROUND LINE 169:');
            const start = Math.max(0, 165);
            const end = Math.min(sourceLines.length, 175);

            for (let i = start; i < end; i++) {
              const lineNum = i + 1;
              const marker = lineNum === 169 ? '>>> ' : '    ';
              console.log(`${marker}${lineNum}: ${sourceLines[i]}`);
            }
          }
        }
      }

      // Analyze the final inlined contract for potential issues
      console.log('\n📋 CONTRACT ANALYSIS:');
      const sourceLines = generatedToken.sourceCode.split('\n');
      console.log(`Total lines: ${sourceLines.length}`);

      // Look for duplicate declarations
      const interfaceDeclarations = sourceLines.filter(line =>
        line.trim().startsWith('interface ')
      );
      const contractDeclarations = sourceLines.filter(line =>
        line.trim().startsWith('contract ') || line.trim().startsWith('abstract contract ')
      );
      const errorDeclarations = sourceLines.filter(line =>
        line.trim().startsWith('error ')
      );

      console.log(`Interface declarations: ${interfaceDeclarations.length}`);
      console.log(`Contract declarations: ${contractDeclarations.length}`);
      console.log(`Error declarations: ${errorDeclarations.length}`);

      if (interfaceDeclarations.length > 0) {
        console.log('\nInterface declarations found:');
        interfaceDeclarations.forEach(line => console.log(`   ${line.trim()}`));
      }

      if (contractDeclarations.length > 0) {
        console.log('\nContract declarations found:');
        contractDeclarations.forEach(line => console.log(`   ${line.trim()}`));
      }

      // Check for duplicate error declarations
      const errorNames = new Map();
      errorDeclarations.forEach(line => {
        const match = line.trim().match(/error\s+(\w+)/);
        if (match) {
          const errorName = match[1];
          if (errorNames.has(errorName)) {
            errorNames.set(errorName, errorNames.get(errorName) + 1);
          } else {
            errorNames.set(errorName, 1);
          }
        }
      });

      const duplicateErrors = Array.from(errorNames.entries()).filter(([name, count]) => count > 1);
      if (duplicateErrors.length > 0) {
        console.log('\n⚠️ DUPLICATE ERROR DECLARATIONS:');
        duplicateErrors.forEach(([name, count]) => {
          console.log(`   ${name}: ${count} declarations`);
        });
      }

    } else {
      console.log('\n✅ COMPILATION SUCCEEDED (unexpected - DeclarationError should exist)');
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

reproduceDeclarationError();
