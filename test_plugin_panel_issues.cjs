const fs = require('fs');

// Test script to verify plugin panel issues
console.log('=== Plugin Panel Issues Test ===\n');

// 1. Check what plugins are defined in the core plugins
console.log('1. Checking core plugins definition...');
const pluginsIndexContent = fs.readFileSync('src/plugins/index.ts', 'utf8');
console.log('Core plugins found in src/plugins/index.ts:');
const pluginMatches = pluginsIndexContent.match(/export const corePlugins = \[([\s\S]*?)\];/);
if (pluginMatches) {
  const pluginsList = pluginMatches[1].split(',').map(p => p.trim()).filter(p => p);
  pluginsList.forEach((plugin, index) => {
    console.log(`  ${index + 1}. ${plugin}`);
  });
  console.log(`Total core plugins: ${pluginsList.length}\n`);
}

// 2. Check what plugin UIs exist
console.log('2. Checking available Plugin UI components...');
const pluginUIFiles = fs.readdirSync('src/components/PluginUI/').filter(f => f.endsWith('PluginUI.tsx'));
console.log('Plugin UI components found:');
pluginUIFiles.forEach((file, index) => {
  console.log(`  ${index + 1}. ${file}`);
});
console.log(`Total Plugin UI components: ${pluginUIFiles.length}\n`);

// 3. Check what plugins are imported and rendered in PluginPanel
console.log('3. Checking PluginPanel imports and rendering...');
const pluginPanelContent = fs.readFileSync('src/components/PluginUI/PluginPanel.tsx', 'utf8');

// Extract imports
const importMatches = pluginPanelContent.match(/import.*from.*PluginUI';/g) || [];
console.log('Imported Plugin UIs in PluginPanel:');
importMatches.forEach((importLine, index) => {
  console.log(`  ${index + 1}. ${importLine}`);
});

// Extract rendered components
const renderMatches = pluginPanelContent.match(/activePluginId === '[^']*'/g) || [];
console.log('\nRendered plugins in PluginPanel:');
renderMatches.forEach((match, index) => {
  const pluginId = match.match(/'([^']*)'/)[1];
  console.log(`  ${index + 1}. Plugin ID: ${pluginId}`);
});

console.log(`\nImported Plugin UIs: ${importMatches.length}`);
console.log(`Rendered Plugin conditions: ${renderMatches.length}`);
console.log(`Available Plugin UI files: ${pluginUIFiles.length}`);

// 4. Check individual plugin IDs
console.log('\n4. Checking individual plugin IDs...');
const pluginFiles = [
  'gitPlugin.ts',
  'debuggerPlugin.ts',
  'testingPlugin.ts',
  'analysisPlugin.ts',
  'deploymentPlugin.ts',
  'collaborationPlugin.ts',
  'backupPlugin.ts',
  'themePlugin.ts'
];

pluginFiles.forEach(file => {
  try {
    const content = fs.readFileSync(`src/plugins/${file}`, 'utf8');
    const idMatch = content.match(/id: '([^']*)',/);
    if (idMatch) {
      console.log(`  ${file}: id = '${idMatch[1]}'`);
    }
  } catch (error) {
    console.log(`  ${file}: Error reading file`);
  }
});

console.log('\n=== SUMMARY ===');
console.log('ISSUE: PluginPanel only imports and renders 3 out of 8 available plugins');
console.log('MISSING PLUGINS:');
console.log('  - AnalysisPluginUI (id: code-analysis)');
console.log('  - DebuggerPluginUI (id: solidity-debugger)');
console.log('  - DeploymentPluginUI (id: deployment-automation)');
console.log('  - GitPluginUI (id: git-integration)');
console.log('  - TestingPluginUI (id: testing-framework)');
console.log('\nFIX NEEDED: Add missing imports and rendering logic to PluginPanel.tsx');
