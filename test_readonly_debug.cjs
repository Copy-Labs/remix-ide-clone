const fs = require('fs');
const path = require('path');

console.log('🔍 Debugging Readonly Property Issue');
console.log('='.repeat(50));

// Let's simulate what happens when loading from localStorage
console.log('\n1. Simulating localStorage loading...');

// This simulates what happens in loadPlugins
const savedPluginData = {
  id: 'test-plugin',
  name: 'Test Plugin',
  version: '1.0.0',
  description: 'Test plugin',
  author: 'Test Author',
  enabled: true,
  config: { setting: 'value' }
};

// Simulate JSON.parse from localStorage
const pluginFromStorage = JSON.parse(JSON.stringify(savedPluginData));
console.log('Plugin from storage:', pluginFromStorage);
console.log('Is plugin from storage frozen?', Object.isFrozen(pluginFromStorage));
console.log('Is plugin from storage sealed?', Object.isSealed(pluginFromStorage));

// Test if we can modify it
try {
  pluginFromStorage.enabled = false;
  console.log('✅ Can modify plugin from storage directly');
} catch (error) {
  console.log('❌ Cannot modify plugin from storage:', error.message);
}

console.log('\n2. Testing Object.assign fix...');

// Simulate what registerPlugin does
const mutablePlugin = Object.assign({}, {
  id: pluginFromStorage.id,
  name: pluginFromStorage.name,
  version: pluginFromStorage.version,
  description: pluginFromStorage.description,
  author: pluginFromStorage.author,
  enabled: pluginFromStorage.enabled,
  config: JSON.parse(JSON.stringify(pluginFromStorage.config)),
  api: {} // Mock API
});

console.log('Mutable plugin:', mutablePlugin);
console.log('Is mutable plugin frozen?', Object.isFrozen(mutablePlugin));
console.log('Is mutable plugin sealed?', Object.isSealed(mutablePlugin));

// Test if we can modify the mutable version
try {
  mutablePlugin.enabled = false;
  console.log('✅ Can modify mutable plugin');
  console.log('New enabled state:', mutablePlugin.enabled);
} catch (error) {
  console.log('❌ Cannot modify mutable plugin:', error.message);
}

console.log('\n3. Checking actual plugin service implementation...');

// Read the actual plugin service file
const pluginServicePath = path.join(__dirname, 'src/services/pluginService.ts');
const pluginServiceContent = fs.readFileSync(pluginServicePath, 'utf8');

// Check if the Object.assign is properly implemented
const hasObjectAssign = pluginServiceContent.includes('Object.assign(');
const hasDeepCopy = pluginServiceContent.includes('JSON.parse(JSON.stringify(plugin.config))');
const hasFrozenCheck = pluginServiceContent.includes('Object.isFrozen(completePlugin)');

console.log('Plugin service has Object.assign:', hasObjectAssign);
console.log('Plugin service has deep copy:', hasDeepCopy);
console.log('Plugin service has frozen check:', hasFrozenCheck);

console.log('\n4. Potential issues to investigate...');
console.log('• Check if plugins are being frozen after registration');
console.log('• Check if there are multiple plugin instances');
console.log('• Check if the service Map contains different objects than the store');
console.log('• Check if plugins are being re-serialized somewhere');

console.log('\n🔍 Next steps:');
console.log('1. Add runtime debugging to see actual plugin objects');
console.log('2. Check if the service and store have the same plugin references');
console.log('3. Verify the timing of when plugins become readonly');
