const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Plugin State Persistence\n');

// Test 1: Check if persistence methods exist and are called correctly
console.log('1. Checking persistence implementation...');
const pluginStorePath = path.join(__dirname, 'src', 'stores', 'pluginStore.ts');

if (fs.existsSync(pluginStorePath)) {
  const storeContent = fs.readFileSync(pluginStorePath, 'utf8');

  // Check if savePlugins is called in enable/disable methods
  const enableMethodMatch = storeContent.match(/enablePlugin:\s*\([^}]+\{[^}]+get\(\)\.savePlugins\(\)/s);
  const disableMethodMatch = storeContent.match(/disablePlugin:\s*\([^}]+\{[^}]+get\(\)\.savePlugins\(\)/s);

  console.log(`   savePlugins called in enablePlugin: ${enableMethodMatch ? '✅' : '❌'}`);
  console.log(`   savePlugins called in disablePlugin: ${disableMethodMatch ? '✅' : '❌'}`);

  // Check loadPlugins implementation
  const hasLoadPlugins = storeContent.includes('loadPlugins:');
  const loadFromLocalStorage = storeContent.includes("localStorage.getItem('plugins')");

  console.log(`   loadPlugins method exists: ${hasLoadPlugins ? '✅' : '❌'}`);
  console.log(`   Loads from localStorage: ${loadFromLocalStorage ? '✅' : '❌'}`);
} else {
  console.log('   ❌ Plugin store file not found');
}

// Test 2: Check App.tsx initialization
console.log('\n2. Checking App.tsx plugin initialization...');
const appPath = path.join(__dirname, 'src', 'App.tsx');

if (fs.existsSync(appPath)) {
  const appContent = fs.readFileSync(appPath, 'utf8');

  const callsLoadPlugins = appContent.includes('loadPlugins()');
  const hasPluginInitEffect = appContent.includes('Initialize plugins on first load');

  console.log(`   Calls loadPlugins(): ${callsLoadPlugins ? '✅' : '❌'}`);
  console.log(`   Has plugin initialization effect: ${hasPluginInitEffect ? '✅' : '❌'}`);

  // Check the order of operations
  const initEffectMatch = appContent.match(/\/\/ Initialize plugins on first load[\s\S]*?}, \[registerPlugin\]/);
  if (initEffectMatch) {
    const effectContent = initEffectMatch[0];
    const loadPluginsFirst = effectContent.indexOf('loadPlugins()') < effectContent.indexOf('corePlugins.forEach');
    console.log(`   loadPlugins called before core plugin registration: ${loadPluginsFirst ? '✅' : '❌'}`);
  }
} else {
  console.log('   ❌ App.tsx file not found');
}

// Test 3: Analyze potential issues
console.log('\n3. Analyzing potential persistence issues...');

if (fs.existsSync(pluginStorePath)) {
  const storeContent = fs.readFileSync(pluginStorePath, 'utf8');

  // Check if loadPlugins properly handles existing plugins
  const loadPluginsMatch = storeContent.match(/loadPlugins:\s*\(\)\s*=>\s*\{[\s\S]*?\},/);
  if (loadPluginsMatch) {
    const loadPluginsContent = loadPluginsMatch[0];

    // Check if it overwrites existing plugins or merges them
    const setsPluginsDirectly = loadPluginsContent.includes('state.plugins = registeredPlugins');
    const checksExistingPlugins = loadPluginsContent.includes('existingPlugin') || loadPluginsContent.includes('find');

    console.log(`   Sets plugins array directly: ${setsPluginsDirectly ? '⚠️  (potential issue)' : '✅'}`);
    console.log(`   Checks for existing plugins: ${checksExistingPlugins ? '✅' : '❌'}`);

    if (setsPluginsDirectly && !checksExistingPlugins) {
      console.log('   🔍 POTENTIAL ISSUE: loadPlugins might overwrite plugin states without checking existing plugins');
    }
  }
}

// Test 4: Check if there are race conditions
console.log('\n4. Checking for potential race conditions...');

if (fs.existsSync(appPath)) {
  const appContent = fs.readFileSync(appPath, 'utf8');

  const hasTimeout = appContent.includes('setTimeout');
  const timeoutMatch = appContent.match(/setTimeout\([^,]+,\s*(\d+)\)/);

  if (hasTimeout && timeoutMatch) {
    const delay = parseInt(timeoutMatch[1]);
    console.log(`   Uses setTimeout with ${delay}ms delay: ${delay >= 100 ? '✅' : '⚠️'}`);
    console.log('   This helps prevent race conditions between loadPlugins and core plugin registration');
  } else {
    console.log('   ❌ No timeout mechanism found - potential race condition');
  }
}

console.log('\n📋 ANALYSIS SUMMARY:');
console.log('The persistence system appears to be implemented, but there might be issues with:');
console.log('1. Plugin state loading/registration order');
console.log('2. Potential overwriting of saved plugin states');
console.log('3. Race conditions between loading and registration');
console.log('\nNext steps: Create a reproduction test to verify actual behavior');
