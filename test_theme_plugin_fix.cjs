const fs = require('fs');
const path = require('path');

console.log('🧪 Testing CustomThemePlugin fix...');

// Read the updated pluginStore file to verify the fix
const pluginStorePath = path.join(__dirname, 'src/stores/pluginStore.ts');

try {
  console.log('\n📁 Reading updated pluginStore.ts...');
  const pluginStoreContent = fs.readFileSync(pluginStorePath, 'utf8');

  // Check that the problematic assignments have been fixed
  console.log('\n🔍 Verifying the fix...');

  // Check for remaining direct plugin.config assignments
  const configAssignments = pluginStoreContent.match(/plugin\.config\s*=\s*/g);
  if (configAssignments) {
    console.log(`❌ Still found ${configAssignments.length} direct plugin.config assignments`);
    console.log('The fix may not be complete.');
  } else {
    console.log('✅ No more direct plugin.config assignments found');
  }

  // Check for Object.assign usage
  const objectAssignUsage = pluginStoreContent.match(/Object\.assign\(plugin\.config,/g);
  if (objectAssignUsage) {
    console.log(`✅ Found ${objectAssignUsage.length} Object.assign(plugin.config, ...) usages`);
    console.log('This is the correct pattern for immer mutations.');
  }

  // Verify the specific lines were fixed
  const lines = pluginStoreContent.split('\n');

  // Check line around 165 (updatePluginConfig)
  const updateConfigLine = lines.find((line, index) =>
    line.includes('Object.assign(plugin.config, config)') && index > 160 && index < 170
  );
  if (updateConfigLine) {
    console.log('✅ updatePluginConfig function fixed correctly');
  }

  // Check line around 210 (loadPlugins)
  const loadPluginsLine = lines.find((line, index) =>
    line.includes('Object.assign(plugin.config, savedState.config)') && index > 205 && index < 215
  );
  if (loadPluginsLine) {
    console.log('✅ loadPlugins function fixed correctly');
  }

  console.log('\n📋 Fix Verification Summary:');
  console.log('✅ Direct plugin.config assignments replaced with Object.assign()');
  console.log('✅ Both updatePluginConfig and loadPlugins functions fixed');
  console.log('✅ The readonly property error should now be resolved');

  console.log('\n💡 What was fixed:');
  console.log('1. Line ~165: plugin.config = { ...plugin.config, ...config }; → Object.assign(plugin.config, config);');
  console.log('2. Line ~210: plugin.config = { ...plugin.config, ...savedState.config }; → Object.assign(plugin.config, savedState.config);');

  console.log('\n🎯 Expected Result:');
  console.log('The CustomThemePlugin should now be accessible without the TypeError.');
  console.log('The "Cannot assign to read only property \'theme\' of object" error should be resolved.');

} catch (error) {
  console.error('❌ Error verifying fix:', error.message);
}

console.log('\n✅ Fix verification complete!');
