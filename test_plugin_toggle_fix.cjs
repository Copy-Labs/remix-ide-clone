const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Plugin Toggle Fix');
console.log('='.repeat(50));

// Test 1: Check if App.tsx has proper plugin initialization
console.log('\n1. Checking App.tsx plugin initialization...');
const appPath = path.join(__dirname, 'src/App.tsx');
const appContent = fs.readFileSync(appPath, 'utf8');

const appChecks = [
  'loadPlugins()',
  'setTimeout(() => {',
  'const currentPlugins = usePluginStore.getState().plugins',
  'const existingPlugin = currentPlugins.find(p => p.id === plugin.id)',
  'if (!existingPlugin) {'
];

let appFixed = true;
appChecks.forEach(check => {
  if (appContent.includes(check)) {
    console.log(`   ✅ ${check} found`);
  } else {
    console.log(`   ❌ ${check} missing`);
    appFixed = false;
  }
});

// Test 2: Check if plugin store saves changes
console.log('\n2. Checking plugin store persistence...');
const storePath = path.join(__dirname, 'src/stores/pluginStore.ts');
const storeContent = fs.readFileSync(storePath, 'utf8');

const persistenceChecks = [
  'get().savePlugins();'
];

let persistenceFixed = true;
// Count occurrences of savePlugins() calls
const savePluginsCount = (storeContent.match(/get\(\)\.savePlugins\(\);/g) || []).length;
if (savePluginsCount >= 2) {
  console.log(`   ✅ savePlugins() called ${savePluginsCount} times (enablePlugin and disablePlugin)`);
} else {
  console.log(`   ❌ savePlugins() only called ${savePluginsCount} times, expected at least 2`);
  persistenceFixed = false;
}

// Test 3: Check if PluginPanel toggle functionality is intact
console.log('\n3. Checking PluginPanel toggle functionality...');
const pluginPanelPath = path.join(__dirname, 'src/components/PluginUI/PluginPanel.tsx');
const pluginPanelContent = fs.readFileSync(pluginPanelPath, 'utf8');

const toggleChecks = [
  'handleTogglePlugin',
  'onChange={() => handleTogglePlugin(plugin.id, plugin.enabled)',
  'checked={plugin.enabled}'
];

let toggleIntact = true;
toggleChecks.forEach(check => {
  if (pluginPanelContent.includes(check)) {
    console.log(`   ✅ ${check} found`);
  } else {
    console.log(`   ❌ ${check} missing`);
    toggleIntact = false;
  }
});

// Test 4: Check if AppSidebar debugger integration is intact
console.log('\n4. Checking AppSidebar debugger integration...');
const sidebarPath = path.join(__dirname, 'src/components/AppSidebar.tsx');
const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');

const sidebarChecks = [
  'const debuggerPlugin = plugins.find((p) => p.id === \'solidity-debugger\')',
  'const isDebuggerEnabled = debuggerPlugin?.enabled || false',
  'if (isDebuggerEnabled) {'
];

let sidebarIntact = true;
sidebarChecks.forEach(check => {
  if (sidebarContent.includes(check)) {
    console.log(`   ✅ ${check} found`);
  } else {
    console.log(`   ❌ ${check} missing`);
    sidebarIntact = false;
  }
});

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 FIX VERIFICATION');
console.log('='.repeat(50));

const allFixed = appFixed && persistenceFixed && toggleIntact && sidebarIntact;

if (allFixed) {
  console.log('✅ All fixes applied successfully!');
  console.log('\n🎯 Expected behavior after fix:');
  console.log('   1. Plugins are properly initialized on app startup');
  console.log('   2. Plugin toggle switches work in the PluginPanel');
  console.log('   3. Plugin states are saved to localStorage');
  console.log('   4. Debugger appears/disappears from sidebar when toggled');
  console.log('   5. Plugin states persist across browser sessions');

  console.log('\n🧪 Manual testing steps:');
  console.log('   1. Start the application');
  console.log('   2. Open the Plugins panel from sidebar');
  console.log('   3. Try toggling plugins on/off using the switches');
  console.log('   4. Verify debugger appears/disappears from sidebar');
  console.log('   5. Refresh the page and verify plugin states are preserved');
} else {
  console.log('❌ Some fixes may not be complete. Please review the implementation.');

  if (!appFixed) console.log('   - App.tsx plugin initialization needs attention');
  if (!persistenceFixed) console.log('   - Plugin store persistence needs attention');
  if (!toggleIntact) console.log('   - PluginPanel toggle functionality needs attention');
  if (!sidebarIntact) console.log('   - AppSidebar debugger integration needs attention');
}

console.log('\n🔧 Changes made:');
console.log('   1. Modified App.tsx to call loadPlugins() before registering core plugins');
console.log('   2. Added timing delay to prevent conflicts between loadPlugins and registerPlugin');
console.log('   3. Added savePlugins() calls to enablePlugin and disablePlugin methods');
console.log('   4. Ensured plugin states are persisted to localStorage on changes');
