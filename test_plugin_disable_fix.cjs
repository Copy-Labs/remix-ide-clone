const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Plugin Disable Fix');
console.log('='.repeat(50));

// Test 1: Check if the registerPlugin method was updated
console.log('\n1. Checking registerPlugin method fix...');
const pluginServicePath = path.join(__dirname, 'src/services/pluginService.ts');
const pluginServiceContent = fs.readFileSync(pluginServicePath, 'utf8');

const fixChecks = [
  'id: plugin.id,',
  'name: plugin.name,',
  'version: plugin.version,',
  'description: plugin.description,',
  'author: plugin.author,',
  'enabled: plugin.enabled,',
  'config: { ...plugin.config },'
];

let fixApplied = true;
fixChecks.forEach(check => {
  if (pluginServiceContent.includes(check)) {
    console.log(`   ✅ ${check} found`);
  } else {
    console.log(`   ❌ ${check} missing`);
    fixApplied = false;
  }
});

// Test 2: Check if the original spread operator was removed
console.log('\n2. Checking if spread operator was replaced...');
if (pluginServiceContent.includes('...plugin,') && pluginServiceContent.includes('api')) {
  console.log('   ⚠️  Original spread operator still present - this might cause conflicts');
} else {
  console.log('   ✅ Spread operator properly replaced with explicit properties');
}

// Test 3: Verify the method structure is intact
console.log('\n3. Verifying method structure...');
const structureChecks = [
  'public registerPlugin(plugin: Omit<Plugin, \'api\'>): Plugin {',
  'const api = this.createPluginAPI(plugin.id);',
  'const completePlugin: Plugin = {',
  'this.plugins.set(plugin.id, completePlugin);',
  'return completePlugin;'
];

let structureIntact = true;
structureChecks.forEach(check => {
  if (pluginServiceContent.includes(check)) {
    console.log(`   ✅ ${check} found`);
  } else {
    console.log(`   ❌ ${check} missing`);
    structureIntact = false;
  }
});

// Test 4: Check if enable/disable methods are still intact
console.log('\n4. Checking enable/disable methods...');
const methodChecks = [
  'plugin.enabled = true;',
  'plugin.enabled = false;'
];

let methodsIntact = true;
methodChecks.forEach(check => {
  if (pluginServiceContent.includes(check)) {
    console.log(`   ✅ ${check} found`);
  } else {
    console.log(`   ❌ ${check} missing`);
    methodsIntact = false;
  }
});

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 FIX VERIFICATION');
console.log('='.repeat(50));

const allGood = fixApplied && structureIntact && methodsIntact;

if (allGood) {
  console.log('✅ Plugin disable fix has been applied successfully!');
  console.log('\n🎯 Expected behavior after fix:');
  console.log('   1. Plugin objects are created with explicit mutable properties');
  console.log('   2. The "enabled" property should be writable');
  console.log('   3. Plugins can be enabled/disabled without read-only errors');
  console.log('   4. All existing functionality remains intact');

  console.log('\n🧪 Manual testing steps:');
  console.log('   1. Start the application');
  console.log('   2. Open the Plugins panel');
  console.log('   3. Try to disable the Solidity Debugger plugin');
  console.log('   4. Check browser console for any errors');
  console.log('   5. Verify the plugin is actually disabled');
  console.log('   6. Try to enable it again');
} else {
  console.log('❌ Some issues detected with the fix. Please review:');

  if (!fixApplied) console.log('   - registerPlugin method fix may not be complete');
  if (!structureIntact) console.log('   - Method structure may be damaged');
  if (!methodsIntact) console.log('   - Enable/disable methods may be missing');
}

console.log('\n🔧 What the fix does:');
console.log('   1. Creates plugin objects with explicit property assignments');
console.log('   2. Avoids potential immutability issues from spread operator');
console.log('   3. Ensures all properties are properly mutable');
console.log('   4. Maintains backward compatibility');
