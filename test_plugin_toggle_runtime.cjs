const fs = require('fs');
const path = require('path');

console.log('🧪 Runtime Plugin Toggle Test');
console.log('='.repeat(50));

// Test 1: Check if all required files exist and have correct structure
console.log('\n1. Checking file structure...');

const requiredFiles = [
  'src/components/PluginUI/PluginPanel.tsx',
  'src/stores/pluginStore.ts',
  'src/services/pluginService.ts',
  'src/App.tsx'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`   ✅ ${file} exists`);
  } else {
    console.log(`   ❌ ${file} missing`);
    allFilesExist = false;
  }
});

// Test 2: Check plugin store implementation details
console.log('\n2. Analyzing plugin store implementation...');
const pluginStorePath = path.join(__dirname, 'src/stores/pluginStore.ts');
const pluginStoreContent = fs.readFileSync(pluginStorePath, 'utf8');

// Check for potential issues in the store
const storeIssues = [];

// Check if enablePlugin/disablePlugin are properly calling the service
if (!pluginStoreContent.includes('const result = enablePlugin(pluginId);')) {
  storeIssues.push('enablePlugin may not be calling pluginService properly');
}

if (!pluginStoreContent.includes('const result = disablePlugin(pluginId);')) {
  storeIssues.push('disablePlugin may not be calling pluginService properly');
}

// Check if state updates are wrapped in immer
if (!pluginStoreContent.includes('set((state) => {')) {
  storeIssues.push('State updates may not be using immer properly');
}

// Check if savePlugins is called after state changes
const enablePluginMatch = pluginStoreContent.match(/enablePlugin: \(pluginId\) => \{[\s\S]*?get\(\)\.savePlugins\(\);/);
const disablePluginMatch = pluginStoreContent.match(/disablePlugin: \(pluginId\) => \{[\s\S]*?get\(\)\.savePlugins\(\);/);

if (!enablePluginMatch) {
  storeIssues.push('enablePlugin may not be calling savePlugins');
}

if (!disablePluginMatch) {
  storeIssues.push('disablePlugin may not be calling savePlugins');
}

if (storeIssues.length === 0) {
  console.log('   ✅ Plugin store implementation looks correct');
} else {
  console.log('   ❌ Plugin store issues found:');
  storeIssues.forEach(issue => console.log(`      - ${issue}`));
}

// Test 3: Check plugin service implementation
console.log('\n3. Analyzing plugin service implementation...');
const pluginServicePath = path.join(__dirname, 'src/services/pluginService.ts');
const pluginServiceContent = fs.readFileSync(pluginServicePath, 'utf8');

const serviceIssues = [];

// Check if enablePlugin/disablePlugin actually modify the plugin object
if (!pluginServiceContent.includes('plugin.enabled = true')) {
  serviceIssues.push('enablePlugin may not be setting enabled = true');
}

if (!pluginServiceContent.includes('plugin.enabled = false')) {
  serviceIssues.push('disablePlugin may not be setting enabled = false');
}

// Check if plugins are stored in a Map
if (!pluginServiceContent.includes('private plugins = new Map<string, Plugin>()')) {
  serviceIssues.push('Plugins may not be stored in a Map structure');
}

if (serviceIssues.length === 0) {
  console.log('   ✅ Plugin service implementation looks correct');
} else {
  console.log('   ❌ Plugin service issues found:');
  serviceIssues.forEach(issue => console.log(`      - ${issue}`));
}

// Test 4: Check PluginPanel UI implementation
console.log('\n4. Analyzing PluginPanel UI implementation...');
const pluginPanelPath = path.join(__dirname, 'src/components/PluginUI/PluginPanel.tsx');
const pluginPanelContent = fs.readFileSync(pluginPanelPath, 'utf8');

const uiIssues = [];

// Check if toggle handler is properly implemented
if (!pluginPanelContent.includes('const handleTogglePlugin = (pluginId: string, isCurrentlyEnabled: boolean) => {')) {
  uiIssues.push('handleTogglePlugin function signature may be incorrect');
}

// Check if the toggle handler calls the right store methods
if (!pluginPanelContent.includes('disablePlugin(pluginId)') || !pluginPanelContent.includes('enablePlugin(pluginId)')) {
  uiIssues.push('handleTogglePlugin may not be calling store methods');
}

// Check if the checkbox is properly bound
if (!pluginPanelContent.includes('checked={plugin.enabled}')) {
  uiIssues.push('Checkbox may not be bound to plugin.enabled');
}

if (!pluginPanelContent.includes('onChange={() => handleTogglePlugin(plugin.id, plugin.enabled)}')) {
  uiIssues.push('Checkbox onChange may not be calling handleTogglePlugin');
}

if (uiIssues.length === 0) {
  console.log('   ✅ PluginPanel UI implementation looks correct');
} else {
  console.log('   ❌ PluginPanel UI issues found:');
  uiIssues.forEach(issue => console.log(`      - ${issue}`));
}

// Test 5: Check for potential React/Zustand integration issues
console.log('\n5. Checking React/Zustand integration...');

const integrationIssues = [];

// Check if store is using immer middleware
if (!pluginStoreContent.includes('immer')) {
  integrationIssues.push('Store may not be using immer middleware for immutable updates');
}

// Check if store is using devtools
if (!pluginStoreContent.includes('devtools')) {
  integrationIssues.push('Store may not be using devtools middleware');
}

// Check if PluginPanel is properly subscribing to store changes
if (!pluginPanelContent.includes('const { plugins, enablePlugin, disablePlugin } = usePluginStore();')) {
  integrationIssues.push('PluginPanel may not be properly subscribing to store');
}

if (integrationIssues.length === 0) {
  console.log('   ✅ React/Zustand integration looks correct');
} else {
  console.log('   ❌ Integration issues found:');
  integrationIssues.forEach(issue => console.log(`      - ${issue}`));
}

// Test 6: Check for potential timing/initialization issues
console.log('\n6. Checking initialization and timing...');

const appPath = path.join(__dirname, 'src/App.tsx');
const appContent = fs.readFileSync(appPath, 'utf8');

const timingIssues = [];

// Check if loadPlugins is called before registering plugins
if (!appContent.includes('loadPlugins();')) {
  timingIssues.push('loadPlugins may not be called in App.tsx');
}

// Check if there's a delay to prevent race conditions
if (!appContent.includes('setTimeout(')) {
  timingIssues.push('No timing delay found to prevent race conditions');
}

// Check if plugins are checked for existence before registration
if (!appContent.includes('const existingPlugin = currentPlugins.find')) {
  timingIssues.push('Plugins may not be checked for existence before registration');
}

if (timingIssues.length === 0) {
  console.log('   ✅ Initialization and timing looks correct');
} else {
  console.log('   ❌ Timing issues found:');
  timingIssues.forEach(issue => console.log(`      - ${issue}`));
}

// Summary and recommendations
console.log('\n' + '='.repeat(50));
console.log('📊 RUNTIME TEST ANALYSIS');
console.log('='.repeat(50));

const totalIssues = storeIssues.length + serviceIssues.length + uiIssues.length + integrationIssues.length + timingIssues.length;

if (totalIssues === 0) {
  console.log('✅ All static analysis checks passed!');
  console.log('\n🔍 If toggling still doesn\'t work, the issue might be:');
  console.log('   1. Runtime JavaScript errors (check browser console)');
  console.log('   2. Plugin objects being frozen/readonly');
  console.log('   3. React re-rendering issues');
  console.log('   4. LocalStorage permissions or quota issues');
  console.log('   5. Network/async timing issues');

  console.log('\n🧪 Recommended debugging steps:');
  console.log('   1. Open browser dev tools and check console for errors');
  console.log('   2. Add console.log statements in handleTogglePlugin');
  console.log('   3. Check if plugin objects are mutable');
  console.log('   4. Verify localStorage is working');
  console.log('   5. Test with a simple plugin toggle first');
} else {
  console.log(`❌ Found ${totalIssues} potential issues that need to be addressed`);
  console.log('\n🔧 Recommended fixes:');

  if (storeIssues.length > 0) {
    console.log('   - Review and fix plugin store implementation');
  }
  if (serviceIssues.length > 0) {
    console.log('   - Review and fix plugin service implementation');
  }
  if (uiIssues.length > 0) {
    console.log('   - Review and fix PluginPanel UI implementation');
  }
  if (integrationIssues.length > 0) {
    console.log('   - Review and fix React/Zustand integration');
  }
  if (timingIssues.length > 0) {
    console.log('   - Review and fix initialization timing');
  }
}

console.log('\n📝 Next steps:');
console.log('   1. Run this test to identify static issues');
console.log('   2. Start the dev server and test manually');
console.log('   3. Check browser console for runtime errors');
console.log('   4. Add debugging logs to trace the toggle flow');
console.log('   5. Create a minimal reproduction case');
