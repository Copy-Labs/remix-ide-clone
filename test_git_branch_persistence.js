// Test script to verify Git branch persistence
const { gitService } = require('./src/services/gitService');
const { useGitStore } = require('./src/stores/gitStore');

async function testBranchPersistence() {
  console.log('Starting Git branch persistence test...');

  // Initialize repository
  console.log('Initializing repository...');
  await gitService.init('main');

  // Create a test branch
  const testBranchName = 'test-branch-' + Date.now();
  console.log(`Creating branch: ${testBranchName}`);
  await gitService.branch(testBranchName);

  // List branches to verify the branch was created
  const branches = await gitService.listBranches();
  console.log('Branches after creation:', branches);

  if (!branches.includes(testBranchName)) {
    console.error(`ERROR: Branch ${testBranchName} was not created!`);
    return;
  }

  // Simulate page reload by forcing store rehydration
  console.log('Simulating page reload...');

  // Get the current state from the store
  const store = useGitStore.getState();

  // Create a new instance of GitService to simulate a page reload
  const newGitService = new (gitService.constructor)('/');

  // Manually call the onHydrate function to simulate rehydration
  if (store._onHydrate) {
    store._onHydrate(store);
  }

  // Check if the branch still exists in the new service
  const persistedBranches = await newGitService.listBranches();
  console.log('Branches after "reload":', persistedBranches);

  if (persistedBranches.includes(testBranchName)) {
    console.log('SUCCESS: Branch persistence is working correctly!');
  } else {
    console.error(`ERROR: Branch ${testBranchName} was not persisted after reload!`);
  }
}

testBranchPersistence().catch(err => {
  console.error('Test failed with error:', err);
});
