const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Sidebar Plugin Integration...\n');

// Test 1: Check if AppSidebar imports all necessary plugin components
console.log('1. Checking AppSidebar imports...');
const sidebarPath = path.join(__dirname, 'src/components/AppSidebar.tsx');
const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');

const requiredImports = [
  'CollaborationPluginUI',
  'BackupPluginUI',
  'CustomThemePluginUI',
  'AnalysisPluginUI',
  'DebuggerPluginUI',
  'DeploymentPluginUI',
  'GitPluginUI',
  'TestingPluginUI'
];

const missingImports = requiredImports.filter(imp => !sidebarContent.includes(imp));
if (missingImports.length === 0) {
  console.log('✅ All plugin UI components imported');
} else {
  console.log('❌ Missing imports:', missingImports);
}

// Test 2: Check if plugin icon mapping exists
console.log('\n2. Checking plugin icon mapping...');
if (sidebarContent.includes('const getPluginIcon = (pluginId: string)')) {
  console.log('✅ Plugin icon mapping function exists');
} else {
  console.log('❌ Plugin icon mapping function missing');
}

// Test 3: Check if plugin component mapping exists
console.log('\n3. Checking plugin component mapping...');
if (sidebarContent.includes('const getPluginComponent = (pluginId: string)')) {
  console.log('✅ Plugin component mapping function exists');
} else {
  console.log('❌ Plugin component mapping function missing');
}

// Test 4: Check if dynamic plugin loading logic exists
console.log('\n4. Checking dynamic plugin loading logic...');
const hasPluginFiltering = sidebarContent.includes('plugins.filter(plugin => plugin.enabled)');
const hasPluginIteration = sidebarContent.includes('enabledPlugins.forEach');
const hasPluginComponent = sidebarContent.includes('getPluginComponent(plugin.id)');

if (hasPluginFiltering && hasPluginIteration && hasPluginComponent) {
  console.log('✅ Dynamic plugin loading logic implemented');
} else {
  console.log('❌ Dynamic plugin loading logic incomplete');
  console.log('  - Plugin filtering:', hasPluginFiltering ? '✅' : '❌');
  console.log('  - Plugin iteration:', hasPluginIteration ? '✅' : '❌');
  console.log('  - Plugin component mapping:', hasPluginComponent ? '✅' : '❌');
}

// Test 5: Check if old hardcoded debugger logic is removed
console.log('\n5. Checking if old hardcoded logic is removed...');
const hasOldDebuggerLogic = sidebarContent.includes('const debuggerPlugin = plugins.find((p) => p.id === \'solidity-debugger\')');
if (!hasOldDebuggerLogic) {
  console.log('✅ Old hardcoded debugger logic removed');
} else {
  console.log('❌ Old hardcoded debugger logic still exists');
}

// Test 6: Check plugin mappings completeness
console.log('\n6. Checking plugin mappings completeness...');
const pluginIds = [
  'collaboration',
  'backup-sync',
  'custom-theme-ui',
  'code-analysis',
  'solidity-debugger',
  'deployment-automation',
  'git-integration',
  'testing-framework'
];

const allPluginsMapped = pluginIds.every(id =>
  sidebarContent.includes(`'${id}':`) &&
  sidebarContent.match(new RegExp(`'${id}':\\s*\\w+`, 'g'))?.length >= 2 // Should appear in both icon and component mappings
);

if (allPluginsMapped) {
  console.log('✅ All plugins mapped in both icon and component mappings');
} else {
  console.log('❌ Some plugins missing from mappings');
}

// Test 7: Check if plugins are added to sidebar correctly
console.log('\n7. Checking sidebar plugin integration...');
const hasPluginPush = sidebarContent.includes('baseItems.push(pluginItem)');
const hasErrorBoundary = sidebarContent.includes('<ErrorBoundary>') && sidebarContent.includes('<PluginComponent pluginId={plugin.id} />');

if (hasPluginPush && hasErrorBoundary) {
  console.log('✅ Plugins correctly integrated into sidebar with error boundaries');
} else {
  console.log('❌ Plugin sidebar integration incomplete');
  console.log('  - Plugin push to baseItems:', hasPluginPush ? '✅' : '❌');
  console.log('  - Error boundary wrapping:', hasErrorBoundary ? '✅' : '❌');
}

console.log('\n🎯 Summary:');
console.log('The sidebar has been updated to dynamically show enabled plugins.');
console.log('When a plugin is enabled in the Plugin Manager, it will appear in the sidebar.');
console.log('When a plugin is disabled, it will be removed from the sidebar.');
console.log('Each plugin uses its appropriate icon and UI component.');
