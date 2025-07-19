const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Debugger Plugin Sidebar Integration');
console.log('='.repeat(50));

// Test 1: Check if AppSidebar imports are correct
console.log('\n1. Checking AppSidebar imports...');
const sidebarPath = path.join(__dirname, 'src/components/AppSidebar.tsx');
const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');

const requiredImports = [
  'Bug',
  'DebuggerPluginUI',
  'usePluginStore'
];

let importsCorrect = true;
requiredImports.forEach(importName => {
  if (sidebarContent.includes(importName)) {
    console.log(`   ✅ ${importName} imported correctly`);
  } else {
    console.log(`   ❌ ${importName} missing from imports`);
    importsCorrect = false;
  }
});

// Test 2: Check if dynamic navigation logic is implemented
console.log('\n2. Checking dynamic navigation logic...');
const dynamicLogicChecks = [
  'const { plugins } = usePluginStore()',
  'debuggerPlugin?.enabled',
  'navItems.map((item)',
  'isDebuggerEnabled'
];

let logicCorrect = true;
dynamicLogicChecks.forEach(check => {
  if (sidebarContent.includes(check)) {
    console.log(`   ✅ ${check} found`);
  } else {
    console.log(`   ❌ ${check} missing`);
    logicCorrect = false;
  }
});

// Test 3: Check if debugger item is properly configured
console.log('\n3. Checking debugger sidebar item configuration...');
const debuggerItemChecks = [
  'key: \'debugger\'',
  'title: \'Debugger\'',
  'icon: Bug',
  'DebuggerPluginUI pluginId="solidity-debugger"'
];

let itemConfigCorrect = true;
debuggerItemChecks.forEach(check => {
  if (sidebarContent.includes(check)) {
    console.log(`   ✅ ${check} configured correctly`);
  } else {
    console.log(`   ❌ ${check} missing from configuration`);
    itemConfigCorrect = false;
  }
});

// Test 4: Check if active item handling is implemented
console.log('\n4. Checking active item handling...');
const activeItemChecks = [
  'React.useEffect',
  'navItems.find(item => item.key === activeItem.key)',
  'setActiveItem(navItems[0])'
];

let activeItemCorrect = true;
activeItemChecks.forEach(check => {
  if (sidebarContent.includes(check)) {
    console.log(`   ✅ ${check} implemented`);
  } else {
    console.log(`   ❌ ${check} missing`);
    activeItemCorrect = false;
  }
});

// Test 5: Check if PluginPanel still shows debugger in plugin list
console.log('\n5. Checking PluginPanel debugger handling...');
const pluginPanelPath = path.join(__dirname, 'src/components/PluginUI/PluginPanel.tsx');
const pluginPanelContent = fs.readFileSync(pluginPanelPath, 'utf8');

if (pluginPanelContent.includes('solidity-debugger') && pluginPanelContent.includes('DebuggerPluginUI')) {
  console.log('   ✅ PluginPanel still shows debugger in plugin list');
} else {
  console.log('   ❌ PluginPanel missing debugger configuration');
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(50));

const allTestsPassed = importsCorrect && logicCorrect && itemConfigCorrect && activeItemCorrect;

if (allTestsPassed) {
  console.log('✅ All tests passed! Debugger sidebar integration implemented correctly.');
  console.log('\n🎯 Expected behavior:');
  console.log('   - When debugger plugin is enabled: appears in sidebar');
  console.log('   - When debugger plugin is disabled: removed from sidebar');
  console.log('   - Debugger still available in plugin panel for enable/disable');
} else {
  console.log('❌ Some tests failed. Please review the implementation.');
}

console.log('\n🚀 To test manually:');
console.log('   1. Start the application');
console.log('   2. Go to Plugins panel');
console.log('   3. Enable the Solidity Debugger plugin');
console.log('   4. Check if "Debugger" appears in the sidebar');
console.log('   5. Disable the plugin and verify it disappears from sidebar');
