// Test script to verify the fixed addAllFiles method
import { useGitStore } from './src/stores/gitStore.js';
import { useFileStore } from './src/stores/fileStore.js';

async function testGitAddAll() {
  console.log('🔍 Testing Git addAllFiles Fix...');

  try {
    // Get the stores
    const gitStore = useGitStore.getState();
    const fileStore = useFileStore.getState();

    // Step 1: Initialize repository
    console.log('1. Initializing repository...');
    await gitStore.initRepository();
    console.log('✅ Repository initialized successfully');

    // Step 2: Set configuration
    console.log('2. Setting Git configuration...');
    gitStore.setConfig({
      user: {
        name: 'Test User',
        email: 'test@example.com'
      }
    });
    console.log('✅ Configuration set successfully');

    // Step 3: Create initial commit
    console.log('3. Creating initial commit...');
    await gitStore.createInitialCommit();
    console.log('✅ Initial commit created successfully');

    // Step 4: Create a test file
    console.log('4. Creating a test file...');
    await fileStore.createFile('/test.txt', 'This is a test file');
    console.log('✅ Test file created successfully');

    // Step 5: Get status to see the new file
    console.log('5. Getting status...');
    await gitStore.getStatus();
    const statusBefore = gitStore.status;
    console.log('Status before adding:', statusBefore);
    console.log('✅ Status retrieved successfully');

    // Step 6: Add all files (this was failing before)
    console.log('6. Adding all files...');
    await gitStore.addAllFiles();
    console.log('✅ All files added successfully');

    // Step 7: Get status again to verify files were added
    console.log('7. Getting status after adding...');
    await gitStore.getStatus();
    const statusAfter = gitStore.status;
    console.log('Status after adding:', statusAfter);
    console.log('✅ Status after adding retrieved successfully');

    // Step 8: Commit the changes
    console.log('8. Committing changes...');
    await gitStore.commit('Add test files');
    console.log('✅ Changes committed successfully');

    // Step 9: Get commits
    console.log('9. Getting commits...');
    await gitStore.getCommits();
    const commits = gitStore.commits;
    console.log('Commits:', commits);
    console.log('✅ Commits retrieved successfully');

    console.log('\n🎉 Git addAllFiles test passed!');

    // Display current state
    console.log('\nCurrent Git State:');
    console.log('- Initialized:', gitStore.isInitialized);
    console.log('- Current Branch:', gitStore.currentBranch);
    console.log('- Status files:', gitStore.status.length);
    console.log('- Commits:', gitStore.commits.length);

  } catch (error) {
    console.error('❌ Git addAllFiles test failed:', error);
    console.error('Error details:', error.message);
  }
}

// Run the test
testGitAddAll();
