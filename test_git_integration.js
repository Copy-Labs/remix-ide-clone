// Test script to verify git integration functionality
import { useGitStore } from './src/stores/gitStore.js';
import { gitService } from './src/services/gitService.js';

async function testGitIntegration() {
  console.log('Testing Git Integration...');

  try {
    // Test 1: Initialize repository
    console.log('1. Testing repository initialization...');
    const gitStore = useGitStore.getState();
    await gitStore.initRepository();
    console.log('✓ Repository initialized successfully');

    // Test 2: Set configuration
    console.log('2. Testing configuration...');
    gitStore.setConfig({
      user: {
        name: 'Test User',
        email: 'test@example.com'
      }
    });
    console.log('✓ Configuration set successfully');

    // Test 3: Get status
    console.log('3. Testing status...');
    await gitStore.getStatus();
    console.log('✓ Status retrieved successfully');

    // Test 4: Get branches
    console.log('4. Testing branches...');
    await gitStore.getBranches();
    console.log('✓ Branches retrieved successfully');

    // Test 5: Get commits
    console.log('5. Testing commits...');
    await gitStore.getCommits();
    console.log('✓ Commits retrieved successfully');

    console.log('\n🎉 All git integration tests passed!');

    // Display current state
    const state = useGitStore.getState();
    console.log('\nCurrent Git State:');
    console.log('- Initialized:', state.isInitialized);
    console.log('- Current Branch:', state.currentBranch);
    console.log('- Branches:', state.branches.map(b => b.name));
    console.log('- Status files:', state.status.length);
    console.log('- Commits:', state.commits.length);
    console.log('- GitHub connected:', state.isGithubConnected);

  } catch (error) {
    console.error('❌ Git integration test failed:', error);
    console.error('Error details:', error.message);
  }
}

// Run the test
testGitIntegration();
