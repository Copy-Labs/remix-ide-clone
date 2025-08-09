import { gitService } from './src/services/gitService.ts';

async function testInitialization() {
  console.log('Testing Git initialization...');

  try {
    // Try to initialize the repository
    console.log('1. Initializing repository...');
    await gitService.init('main');
    console.log('✓ Repository initialized successfully');

    // Try to list branches immediately after initialization
    console.log('2. Listing branches...');
    const branches = await gitService.listBranches();
    console.log('✓ Branches listed:', branches);

    // Try to get current branch
    console.log('3. Getting current branch...');
    const currentBranch = await gitService.currentBranch();
    console.log('✓ Current branch:', currentBranch);

    // Try to get status
    console.log('4. Getting status...');
    const status = await gitService.status();
    console.log('✓ Status retrieved:', status);

  } catch (error) {
    console.error('❌ Error during initialization:', error.message);
    console.error('Error details:', error);
  }
}

testInitialization();
