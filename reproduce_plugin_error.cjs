const fs = require('fs');

console.log('🔍 Reproducing Plugin Disable Error');
console.log('='.repeat(50));

// Test to reproduce the "Cannot assign to read only property 'enabled'" error
console.log('\n1. Testing object mutability...');

// Simulate the debugger plugin object
const debuggerPlugin = {
  id: 'solidity-debugger',
  name: 'Solidity Debugger',
  version: '1.0.0',
  description: 'Debug your Solidity smart contracts with step-by-step execution',
  author: 'Remix IDE Clone Team',
  enabled: true,
  config: {
    showLocalVariables: true,
    showStateVariables: true,
    showCallStack: true,
    showMemory: true,
    showStorage: true,
    autoBreakOnError: true,
  }
};

console.log('Original plugin enabled:', debuggerPlugin.enabled);

// Test 1: Direct assignment (this should work)
try {
  debuggerPlugin.enabled = false;
  console.log('✅ Direct assignment works:', debuggerPlugin.enabled);
  debuggerPlugin.enabled = true; // Reset
} catch (error) {
  console.log('❌ Direct assignment failed:', error.message);
}

// Test 2: Simulate the spread operator used in registerPlugin
const completePlugin = {
  ...debuggerPlugin,
  api: {} // Simulated API object
};

console.log('\n2. Testing spread operator result...');
console.log('Complete plugin enabled:', completePlugin.enabled);

try {
  completePlugin.enabled = false;
  console.log('✅ Spread operator result assignment works:', completePlugin.enabled);
  completePlugin.enabled = true; // Reset
} catch (error) {
  console.log('❌ Spread operator result assignment failed:', error.message);
}

// Test 3: Check if the object is frozen
console.log('\n3. Checking object mutability...');
console.log('Is debuggerPlugin frozen?', Object.isFrozen(debuggerPlugin));
console.log('Is completePlugin frozen?', Object.isFrozen(completePlugin));
console.log('Is debuggerPlugin sealed?', Object.isSealed(debuggerPlugin));
console.log('Is completePlugin sealed?', Object.isSealed(completePlugin));

// Test 4: Check property descriptors
console.log('\n4. Checking property descriptors...');
const enabledDescriptor = Object.getOwnPropertyDescriptor(completePlugin, 'enabled');
console.log('enabled property descriptor:', enabledDescriptor);

console.log('\n' + '='.repeat(50));
console.log('📊 ANALYSIS COMPLETE');
console.log('='.repeat(50));
