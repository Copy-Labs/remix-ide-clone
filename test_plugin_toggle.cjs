const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Plugin Toggle Functionality');
console.log('='.repeat(50));

// Test 1: Check if PluginPanel has toggle functionality
console.log('\n1. Checking PluginPanel toggle functionality...');
const pluginPanelPath = path.join(__dirname, 'src/components/PluginUI/PluginPanel.tsx');
const pluginPanelContent = fs.readFileSync(pluginPanelPath, 'utf8');

const toggleChecks = [
  'handleTogglePlugin',
  'enablePlugin',
  'disablePlugin',
  'onChange={() => handleTogglePlugin',
  'checked={plugin.enabled}'
];

let toggleImplemented = true;
toggleChecks.forEach(check => {
  if (pluginPanelContent.includes(check)) {
    console.log(`   ✅ ${check} found`);
  } else {
    console.log(`   ❌ ${check} missing`);
    toggleImplemented = false;
  }
});

// Test 2: Check if plugin store has enable/disable methods
console.log('\n2. Checking plugin store methods...');
const pluginStorePath = path.join(__dirname, 'src/stores/pluginStore.ts');
const pluginStoreContent = fs.readFileSync(pluginStorePath, 'utf8');

const storeChecks = [
  'enablePlugin: (pluginId: string) => boolean',
  'disablePlugin: (pluginId: string) => boolean',
  'enablePlugin: (pluginId) => {',
  'disablePlugin: (pluginId) => {'
];

let storeImplemented = true;
storeChecks.forEach(check => {
  if (pluginStoreContent.includes(check)) {
    console.log(`   ✅ ${check} found`);
  } else {
    console.log(`   ❌ ${check} missing`);
    storeImplemented = false;
  }
});

// Test 3: Check if plugins are being initialized
console.log('\n3. Checking plugin initialization...');
const initChecks = [
  'loadPlugins',
  'registerPlugin',
  'plugins: []'
];

let initImplemented = true;
initChecks.forEach(check => {
  if (pluginStoreContent.includes(check)) {
    console.log(`   ✅ ${check} found`);
  } else {
    console.log(`   ❌ ${check} missing`);
    initImplemented = false;
  }
});

// Test 4: Check if there's a plugin initialization file
console.log('\n4. Checking for plugin initialization...');
const possibleInitFiles = [
  'src/plugins/index.ts',
  'src/plugins/pluginRegistry.ts',
  'src/main.tsx',
  'src/App.tsx'
];

let initFileFound = false;
possibleInitFiles.forEach(filePath => {
  if (fs.existsSync(path.join(__dirname, filePath))) {
    console.log(`   ✅ ${filePath} exists`);
    initFileFound = true;

    // Check if it contains plugin initialization
    const content = fs.readFileSync(path.join(__dirname, filePath), 'utf8');
    if (content.includes('loadPlugins') || content.includes('registerPlugin')) {
      console.log(`   ✅ ${filePath} contains plugin initialization`);
    } else {
      console.log(`   ⚠️  ${filePath} exists but no plugin initialization found`);
    }
  } else {
    console.log(`   ❌ ${filePath} not found`);
  }
});

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 DIAGNOSIS');
console.log('='.repeat(50));

if (toggleImplemented && storeImplemented) {
  console.log('✅ Toggle functionality is properly implemented');

  if (!initFileFound) {
    console.log('❌ ISSUE FOUND: Plugins may not be initialized on app startup');
    console.log('\n🔧 POTENTIAL SOLUTIONS:');
    console.log('   1. Add plugin initialization in main.tsx or App.tsx');
    console.log('   2. Call loadPlugins() when the app starts');
    console.log('   3. Ensure plugins are registered before the UI loads');
  } else {
    console.log('✅ Plugin initialization files found');
    console.log('\n🔍 NEXT STEPS:');
    console.log('   1. Check if loadPlugins() is being called');
    console.log('   2. Verify plugins are being registered');
    console.log('   3. Check browser console for errors');
  }
} else {
  console.log('❌ Toggle functionality has implementation issues');
}
