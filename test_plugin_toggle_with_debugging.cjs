const fs = require('fs');
const path = require('path');

console.log('🧪 Plugin Toggle Test with Debugging');
console.log('='.repeat(50));

// This test verifies that debugging logs have been added and the toggle flow is traceable

console.log('\n1. Verifying debugging logs in PluginPanel...');
const pluginPanelPath = path.join(__dirname, 'src/components/PluginUI/PluginPanel.tsx');
const pluginPanelContent = fs.readFileSync(pluginPanelPath, 'utf8');

const panelDebuggingChecks = [
  'console.log(`🔄 PluginPanel: Toggling plugin',
  'console.log(`🔄 PluginPanel: Disabling plugin',
  'console.log(`🔄 PluginPanel: Enabling plugin',
  'console.log(`🔄 PluginPanel: Disable result for',
  'console.log(`🔄 PluginPanel: Enable result for'
];

let panelDebuggingComplete = true;
panelDebuggingChecks.forEach(check => {
  if (pluginPanelContent.includes(check)) {
    console.log(`   ✅ ${check.substring(0, 50)}...`);
  } else {
    console.log(`   ❌ Missing: ${check.substring(0, 50)}...`);
    panelDebuggingComplete = false;
  }
});

console.log('\n2. Verifying debugging logs in PluginStore...');
const pluginStorePath = path.join(__dirname, 'src/stores/pluginStore.ts');
const pluginStoreContent = fs.readFileSync(pluginStorePath, 'utf8');

const storeDebuggingChecks = [
  'console.log(`🔄 PluginStore: Attempting to enable plugin',
  'console.log(`🔄 PluginStore: Attempting to disable plugin',
  'console.log(`🔄 PluginStore: Service enable result for',
  'console.log(`🔄 PluginStore: Service disable result for',
  'console.log(`🔄 PluginStore: Found plugin',
  'console.log(`🔄 PluginStore: Plugin ${pluginId} not found in state',
  'console.log(`🔄 PluginStore: Saving plugins to localStorage'
];

let storeDebuggingComplete = true;
storeDebuggingChecks.forEach(check => {
  if (pluginStoreContent.includes(check)) {
    console.log(`   ✅ ${check.substring(0, 50)}...`);
  } else {
    console.log(`   ❌ Missing: ${check.substring(0, 50)}...`);
    storeDebuggingComplete = false;
  }
});

console.log('\n3. Verifying debugging logs in PluginService...');
const pluginServicePath = path.join(__dirname, 'src/services/pluginService.ts');
const pluginServiceContent = fs.readFileSync(pluginServicePath, 'utf8');

const serviceDebuggingChecks = [
  'console.log(`🔄 PluginService: Attempting to enable plugin',
  'console.log(`🔄 PluginService: Attempting to disable plugin',
  'console.log(`🔄 PluginService: Found plugin ${pluginId}, current enabled state:',
  'console.log(`🔄 PluginService: Set plugin ${pluginId} enabled = true',
  'console.log(`🔄 PluginService: Set plugin ${pluginId} enabled = false',
  'console.log(`🔄 PluginService: Plugin ${pluginId} not found in service'
];

let serviceDebuggingComplete = true;
serviceDebuggingChecks.forEach(check => {
  if (pluginServiceContent.includes(check)) {
    console.log(`   ✅ ${check.substring(0, 50)}...`);
  } else {
    console.log(`   ❌ Missing: ${check.substring(0, 50)}...`);
    serviceDebuggingComplete = false;
  }
});

console.log('\n4. Checking for potential issues that debugging might reveal...');

// Check if there are any obvious issues in the flow
const potentialIssues = [];

// Issue 1: Check if the store and service are using the same plugin instances
if (!pluginStoreContent.includes('const result = enablePlugin(pluginId);')) {
  potentialIssues.push('Store may not be calling service methods correctly');
}

// Issue 2: Check if React components are properly subscribing to store changes
if (!pluginPanelContent.includes('const { plugins, enablePlugin, disablePlugin } = usePluginStore();')) {
  potentialIssues.push('PluginPanel may not be subscribing to store changes');
}

// Issue 3: Check if the store is using immer for immutable updates
if (!pluginStoreContent.includes('immer')) {
  potentialIssues.push('Store may not be using immer for immutable updates');
}

// Issue 4: Check if plugins are being saved to localStorage
if (!pluginStoreContent.includes('get().savePlugins();')) {
  potentialIssues.push('Plugin changes may not be persisted to localStorage');
}

console.log('\n5. Analyzing the complete toggle flow...');

// Trace the expected flow
console.log('\n   Expected Toggle Flow:');
console.log('   1. User clicks checkbox in PluginPanel');
console.log('   2. onChange handler calls handleTogglePlugin');
console.log('   3. handleTogglePlugin calls store.enablePlugin or store.disablePlugin');
console.log('   4. Store method calls service.enablePlugin or service.disablePlugin');
console.log('   5. Service method updates plugin.enabled property');
console.log('   6. Store method updates its own state');
console.log('   7. Store method calls savePlugins to persist changes');
console.log('   8. React re-renders PluginPanel with updated plugin state');

// Check if each step is properly implemented
const flowChecks = [
  {
    step: 'Checkbox onChange binding',
    check: pluginPanelContent.includes('onChange={() => handleTogglePlugin(plugin.id, plugin.enabled)}'),
    file: 'PluginPanel.tsx'
  },
  {
    step: 'Toggle handler implementation',
    check: pluginPanelContent.includes('const handleTogglePlugin = (pluginId: string, isCurrentlyEnabled: boolean)'),
    file: 'PluginPanel.tsx'
  },
  {
    step: 'Store method calls',
    check: pluginPanelContent.includes('enablePlugin(pluginId)') && pluginPanelContent.includes('disablePlugin(pluginId)'),
    file: 'PluginPanel.tsx'
  },
  {
    step: 'Service method calls',
    check: pluginStoreContent.includes('const result = enablePlugin(pluginId);') && pluginStoreContent.includes('const result = disablePlugin(pluginId);'),
    file: 'pluginStore.ts'
  },
  {
    step: 'Plugin property updates',
    check: pluginServiceContent.includes('plugin.enabled = true') && pluginServiceContent.includes('plugin.enabled = false'),
    file: 'pluginService.ts'
  },
  {
    step: 'State updates',
    check: pluginStoreContent.includes('plugin.enabled = true') && pluginStoreContent.includes('plugin.enabled = false'),
    file: 'pluginStore.ts'
  },
  {
    step: 'Persistence',
    check: pluginStoreContent.includes('get().savePlugins();'),
    file: 'pluginStore.ts'
  }
];

console.log('\n   Flow Implementation Check:');
flowChecks.forEach((flowCheck, index) => {
  const status = flowCheck.check ? '✅' : '❌';
  console.log(`   ${index + 1}. ${flowCheck.step}: ${status} (${flowCheck.file})`);
  if (!flowCheck.check) {
    potentialIssues.push(`${flowCheck.step} may not be properly implemented in ${flowCheck.file}`);
  }
});

console.log('\n' + '='.repeat(50));
console.log('📊 DEBUGGING TEST RESULTS');
console.log('='.repeat(50));

const allDebuggingComplete = panelDebuggingComplete && storeDebuggingComplete && serviceDebuggingComplete;

if (allDebuggingComplete && potentialIssues.length === 0) {
  console.log('✅ All debugging logs added and flow looks correct!');

  console.log('\n🎯 Next Steps:');
  console.log('   1. Start the development server: npm run dev');
  console.log('   2. Open the application in browser');
  console.log('   3. Open browser dev tools (F12)');
  console.log('   4. Navigate to the Plugins panel');
  console.log('   5. Try toggling a plugin on/off');
  console.log('   6. Watch the console for debugging messages');

  console.log('\n🔍 What to look for in console:');
  console.log('   - 🔄 PluginPanel messages when clicking toggle');
  console.log('   - 🔄 PluginStore messages for state updates');
  console.log('   - 🔄 PluginService messages for plugin modifications');
  console.log('   - Any error messages or missing steps');

  console.log('\n📋 Debugging Checklist:');
  console.log('   □ Toggle switch responds to clicks');
  console.log('   □ Console shows PluginPanel debugging messages');
  console.log('   □ Console shows PluginStore debugging messages');
  console.log('   □ Console shows PluginService debugging messages');
  console.log('   □ Plugin state actually changes in the UI');
  console.log('   □ Changes persist after page refresh');

} else {
  console.log('❌ Issues found that need to be addressed:');

  if (!panelDebuggingComplete) {
    console.log('   - PluginPanel debugging logs incomplete');
  }
  if (!storeDebuggingComplete) {
    console.log('   - PluginStore debugging logs incomplete');
  }
  if (!serviceDebuggingComplete) {
    console.log('   - PluginService debugging logs incomplete');
  }

  if (potentialIssues.length > 0) {
    console.log('   - Flow implementation issues:');
    potentialIssues.forEach(issue => console.log(`     • ${issue}`));
  }
}

console.log('\n🔧 If toggle still doesn\'t work after adding debugging:');
console.log('   1. Check for JavaScript errors in browser console');
console.log('   2. Verify plugins are actually loaded in the store');
console.log('   3. Check if React components are re-rendering');
console.log('   4. Verify Zustand store subscriptions are working');
console.log('   5. Test with a minimal plugin first');

console.log('\n📝 Remember to remove debugging logs after fixing the issue!');
