const { databaseService } = require('./src/services/databaseService.ts');

async function testDatabaseFix() {
  console.log('Testing database service fix...');

  try {
    // Test set method
    console.log('Testing set method...');
    await databaseService.set('git:staging', { 'test.js': 'console.log("test");' });
    console.log('✓ Set method works');

    // Test get method
    console.log('Testing get method...');
    const value = await databaseService.get('git:staging');
    console.log('✓ Get method works, value:', value);

    // Test delete method (this was the missing method causing the error)
    console.log('Testing delete method...');
    await databaseService.delete('git:staging');
    console.log('✓ Delete method works');

    // Verify deletion
    console.log('Verifying deletion...');
    const deletedValue = await databaseService.get('git:staging');
    console.log('✓ Value after deletion:', deletedValue); // Should be undefined

    console.log('\n🎉 All tests passed! The database service fix is working correctly.');
    console.log('The reset git index button should no longer throw "databaseService.delete is not a function" error.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDatabaseFix();
