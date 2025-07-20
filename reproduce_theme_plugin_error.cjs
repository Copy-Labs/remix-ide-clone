const fs = require('fs');
const path = require('path');

console.log('🔍 Reproducing CustomThemePlugin error...');

// Read the CustomThemePluginUI file to analyze the error
const customThemePluginPath = path.join(__dirname, 'src/components/PluginUI/CustomThemePluginUI.tsx');
const pluginStorePath = path.join(__dirname, 'src/stores/pluginStore.ts');

try {
  console.log('\n📁 Reading CustomThemePluginUI.tsx...');
  const customThemeContent = fs.readFileSync(customThemePluginPath, 'utf8');

  console.log('\n📁 Reading pluginStore.ts...');
  const pluginStoreContent = fs.readFileSync(pluginStorePath, 'utf8');

  // Look for potential readonly property assignments
  console.log('\n🔍 Analyzing potential readonly property issues...');

  // Check for direct property assignments in plugin store
  const configAssignments = pluginStoreContent.match(/plugin\.config\s*=\s*/g);
  if (configAssignments) {
    console.log(`❌ Found ${configAssignments.length} direct plugin.config assignments in pluginStore.ts`);
    console.log('These could cause readonly property errors if the plugin object is frozen.');
  }

  // Check for theme property access
  const themeAccess = customThemeContent.match(/plugin\.config\.theme/g);
  if (themeAccess) {
    console.log(`✅ Found ${themeAccess.length} plugin.config.theme accesses in CustomThemePluginUI.tsx`);
  }

  // Look for the specific error pattern
  console.log('\n🔍 Looking for the error pattern...');

  // Check if there are any direct assignments to theme property
  const themeAssignments = pluginStoreContent.match(/\.theme\s*=\s*/g);
  if (themeAssignments) {
    console.log(`❌ Found ${themeAssignments.length} direct theme property assignments`);
  }

  console.log('\n📋 Analysis Summary:');
  console.log('The error "Cannot assign to read only property \'theme\' of object" is likely caused by:');
  console.log('1. Direct assignment to plugin.config in pluginStore.ts (lines 165, 210)');
  console.log('2. The plugin object might be frozen or made readonly somewhere');
  console.log('3. Immer middleware might not be handling the assignments correctly');

  console.log('\n💡 Recommended Fix:');
  console.log('Instead of direct assignment, use immer\'s draft mutation pattern:');
  console.log('  // Instead of: plugin.config = { ...plugin.config, ...config };');
  console.log('  // Use: Object.assign(plugin.config, config);');
  console.log('  // Or: plugin.config = { ...plugin.config, ...config }; (within immer set)');

} catch (error) {
  console.error('❌ Error analyzing files:', error.message);
}

console.log('\n✅ Analysis complete!');
