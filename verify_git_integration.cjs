// Simple verification script to check Git integration implementation
const fs = require('fs');

console.log('🔍 Verifying VSCode-like Git Integration Implementation...\n');

const checks = [
  {
    file: 'src/components/FileExplorer/FileTreeItem.tsx',
    features: [
      { name: 'GitStatusIndicator component', pattern: /const GitStatusIndicator.*=.*filePath.*=>/ },
      { name: 'useGitStore import', pattern: /import.*useGitStore.*from.*gitStore/ },
      { name: 'Git status badges', pattern: /text-green-500|text-orange-500|text-red-500|text-blue-500/ },
      { name: 'Status tooltips', pattern: /tooltip.*Added|Modified|Deleted|Untracked/ },
      { name: 'GitStatusIndicator usage', pattern: /<GitStatusIndicator.*filePath={file\.path}/ }
    ]
  },
  {
    file: 'src/components/FileExplorer/FileExplorer.tsx',
    features: [
      { name: 'useGitStore import', pattern: /import.*useGitStore.*from.*gitStore/ },
      { name: 'Git status fetching', pattern: /useEffect.*getStatus/ },
      { name: 'isInitialized check', pattern: /if.*isInitialized.*getStatus/ },
      { name: 'Periodic status refresh', pattern: /setInterval.*getStatus.*5000/ }
    ]
  },
  {
    file: 'src/components/FileExplorer/FileExplorerHeader.tsx',
    features: [
      { name: 'GitBranch icon import', pattern: /GitBranch.*from.*lucide-react/ },
      { name: 'useGitStore import', pattern: /import.*useGitStore.*from.*gitStore/ },
      { name: 'Current branch display', pattern: /<GitBranch.*currentBranch/ },
      { name: 'Changes count badge', pattern: /changesCount.*bg-blue-100/ }
    ]
  }
];

let totalChecks = 0;
let passedChecks = 0;

checks.forEach(({ file, features }) => {
  console.log(`📁 Checking ${file}:`);

  if (!fs.existsSync(file)) {
    console.log(`  ❌ File not found`);
    return;
  }

  const content = fs.readFileSync(file, 'utf8');

  features.forEach(({ name, pattern }) => {
    totalChecks++;
    if (pattern.test(content)) {
      console.log(`  ✅ ${name}`);
      passedChecks++;
    } else {
      console.log(`  ❌ ${name}`);
    }
  });

  console.log('');
});

console.log('='.repeat(60));
console.log(`📊 Results: ${passedChecks}/${totalChecks} checks passed`);

if (passedChecks === totalChecks) {
  console.log('🎉 All Git integration features successfully implemented!');
  console.log('\n✨ VSCode-like features added:');
  console.log('  • Git status indicators (M, A, D, U) next to files');
  console.log('  • Color-coded status badges with tooltips');
  console.log('  • Current branch display in file explorer header');
  console.log('  • Changes count badge');
  console.log('  • Automatic Git status updates');
  console.log('  • Periodic status refresh');
} else {
  console.log('⚠️  Some features may not be fully implemented.');
}

console.log('='.repeat(60));
