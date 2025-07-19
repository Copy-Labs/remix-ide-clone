const fs = require('fs');
const path = require('path');

console.log('🔍 Plugin Toggle Reproduction Test');
console.log('='.repeat(50));

// This script simulates the plugin toggle flow to identify issues

console.log('\n1. Testing plugin service functionality...');

// Read the plugin service file to understand the implementation
const pluginServicePath = path.join(__dirname, 'src/services/pluginService.ts');
const pluginServiceContent = fs.readFileSync(pluginServicePath, 'utf8');

// Check if the plugin service has the Map structure
const hasMapStructure = pluginServiceContent.includes('private plugins: Map<string, Plugin> = new Map()');
console.log(`   Map structure: ${hasMapStructure ? '✅' : '❌'}`);

// Check if enable/disable methods exist and modify the enabled property
const hasEnableMethod = pluginServiceContent.includes('plugin.enabled = true');
const hasDisableMethod = pluginServiceContent.includes('plugin.enabled = false');
console.log(`   Enable method: ${hasEnableMethod ? '✅' : '❌'}`);
console.log(`   Disable method: ${hasDisableMethod ? '✅' : '❌'}`);

console.log('\n2. Testing plugin store integration...');

const pluginStorePath = path.join(__dirname, 'src/stores/pluginStore.ts');
const pluginStoreContent = fs.readFileSync(pluginStorePath, 'utf8');

// Check if the store calls the service methods
const storeCallsEnableService = pluginStoreContent.includes('const result = enablePlugin(pluginId);');
const storeCallsDisableService = pluginStoreContent.includes('const result = disablePlugin(pluginId);');
console.log(`   Store calls enable service: ${storeCallsEnableService ? '✅' : '❌'}`);
console.log(`   Store calls disable service: ${storeCallsDisableService ? '✅' : '❌'}`);

// Check if the store updates its own state
const storeUpdatesState = pluginStoreContent.includes('plugin.enabled = true') && pluginStoreContent.includes('plugin.enabled = false');
console.log(`   Store updates state: ${storeUpdatesState ? '✅' : '❌'}`);

// Check if the store saves changes
const storeSavesChanges = pluginStoreContent.includes('get().savePlugins();');
console.log(`   Store saves changes: ${storeSavesChanges ? '✅' : '❌'}`);

console.log('\n3. Testing UI integration...');

const pluginPanelPath = path.join(__dirname, 'src/components/PluginUI/PluginPanel.tsx');
const pluginPanelContent = fs.readFileSync(pluginPanelPath, 'utf8');

// Check if UI has toggle handler
const hasToggleHandler = pluginPanelContent.includes('const handleTogglePlugin');
console.log(`   Has toggle handler: ${hasToggleHandler ? '✅' : '❌'}`);

// Check if toggle handler calls store methods
const handlerCallsStore = pluginPanelContent.includes('enablePlugin(pluginId)') && pluginPanelContent.includes('disablePlugin(pluginId)');
console.log(`   Handler calls store: ${handlerCallsStore ? '✅' : '❌'}`);

// Check if checkbox is bound correctly
const checkboxBound = pluginPanelContent.includes('checked={plugin.enabled}');
console.log(`   Checkbox bound: ${checkboxBound ? '✅' : '❌'}`);

// Check if onChange is connected
const onChangeConnected = pluginPanelContent.includes('onChange={() => handleTogglePlugin');
console.log(`   onChange connected: ${onChangeConnected ? '✅' : '❌'}`);

console.log('\n4. Analyzing potential issues...');

// Look for potential issues in the flow
const potentialIssues = [];

// Check if there's a disconnect between service and store
if (storeCallsEnableService && storeCallsDisableService && storeUpdatesState) {
  console.log('   ✅ Service-Store integration looks correct');
} else {
  potentialIssues.push('Service-Store integration may have issues');
}

// Check if there's a disconnect between store and UI
if (handlerCallsStore && checkboxBound && onChangeConnected) {
  console.log('   ✅ Store-UI integration looks correct');
} else {
  potentialIssues.push('Store-UI integration may have issues');
}

// Check for potential React re-rendering issues
const usesUseStore = pluginPanelContent.includes('usePluginStore()');
if (usesUseStore) {
  console.log('   ✅ UI subscribes to store changes');
} else {
  potentialIssues.push('UI may not be subscribing to store changes');
}

console.log('\n5. Checking for common plugin toggle issues...');

// Issue 1: Plugin objects being frozen/readonly
const checkReadonlyIssue = () => {
  // Look for signs of readonly issues in error logs or fixes
  const readonlyErrorSummaryPath = path.join(__dirname, 'PLUGIN_READONLY_ERROR_FIX_SUMMARY.md');
  if (fs.existsSync(readonlyErrorSummaryPath)) {
    console.log('   ⚠️  Previous readonly error detected - checking fix');
    const readonlyContent = fs.readFileSync(readonlyErrorSummaryPath, 'utf8');

    // Check if the fix was applied (creating mutable plugin objects)
    if (pluginServiceContent.includes('const completePlugin: Plugin = {')) {
      console.log('   ✅ Plugin objects are created as mutable');
    } else {
      potentialIssues.push('Plugin objects may be readonly/frozen');
    }
  } else {
    console.log('   ✅ No previous readonly issues detected');
  }
};

checkReadonlyIssue();

// Issue 2: Timing/initialization issues
const checkTimingIssues = () => {
  const appPath = path.join(__dirname, 'src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf8');

  if (appContent.includes('loadPlugins()') && appContent.includes('setTimeout(')) {
    console.log('   ✅ Timing issues appear to be handled');
  } else {
    potentialIssues.push('Plugin initialization timing may have issues');
  }
};

checkTimingIssues();

// Issue 3: LocalStorage issues
const checkStorageIssues = () => {
  // Check if savePlugins and loadPlugins are properly implemented
  const hasSavePlugins = pluginStoreContent.includes('savePlugins: () => {');
  const hasLoadPlugins = pluginStoreContent.includes('loadPlugins: () => {');

  if (hasSavePlugins && hasLoadPlugins) {
    console.log('   ✅ LocalStorage methods are implemented');
  } else {
    potentialIssues.push('LocalStorage persistence may not be implemented');
  }
};

checkStorageIssues();

console.log('\n' + '='.repeat(50));
console.log('📊 REPRODUCTION TEST RESULTS');
console.log('='.repeat(50));

if (potentialIssues.length === 0) {
  console.log('✅ All static checks passed - the issue may be runtime-specific');

  console.log('\n🔍 Likely runtime issues to investigate:');
  console.log('   1. JavaScript errors in browser console');
  console.log('   2. React component not re-rendering after state change');
  console.log('   3. Zustand store not triggering updates');
  console.log('   4. Plugin objects being mutated incorrectly');
  console.log('   5. Event handlers not being called');

  console.log('\n🧪 Debugging steps to try:');
  console.log('   1. Add console.log in handleTogglePlugin function');
  console.log('   2. Add console.log in store enablePlugin/disablePlugin methods');
  console.log('   3. Check if plugin.enabled actually changes in the store');
  console.log('   4. Verify React component re-renders when store changes');
  console.log('   5. Test with browser dev tools open');

  console.log('\n🔧 Quick fix to try:');
  console.log('   Add debugging logs to trace the toggle flow:');
  console.log('   - In PluginPanel.tsx handleTogglePlugin');
  console.log('   - In pluginStore.ts enablePlugin/disablePlugin');
  console.log('   - In pluginService.ts enablePlugin/disablePlugin');

} else {
  console.log(`❌ Found ${potentialIssues.length} potential issues:`);
  potentialIssues.forEach((issue, index) => {
    console.log(`   ${index + 1}. ${issue}`);
  });

  console.log('\n🔧 Recommended fixes:');
  console.log('   1. Address the issues listed above');
  console.log('   2. Test each component in isolation');
  console.log('   3. Add comprehensive error handling');
  console.log('   4. Add debugging logs to trace the flow');
}

console.log('\n📝 Next action:');
console.log('   Since static analysis shows the code should work,');
console.log('   the issue is likely runtime-specific. Add debugging');
console.log('   logs to trace the actual toggle flow and identify');
console.log('   where it\'s failing.');
