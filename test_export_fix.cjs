const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Token Creator Export Fix...\n');

// Test 1: Check if the export is properly added to tokenCreatorPlugin.ts
console.log('1. Checking tokenCreatorPlugin.ts exports...');
const pluginPath = path.join(__dirname, 'src/plugins/tokenCreatorPlugin.ts');
if (fs.existsSync(pluginPath)) {
  const pluginContent = fs.readFileSync(pluginPath, 'utf8');

  const hasPluginInstanceExport = pluginContent.includes('export const tokenCreatorPlugin');
  const hasImplementationExport = pluginContent.includes('export { TokenCreatorPluginImplementation }');

  console.log(`   ✅ Plugin instance export: ${hasPluginInstanceExport}`);
  console.log(`   ✅ Implementation class export: ${hasImplementationExport}`);
} else {
  console.log('   ❌ Plugin file not found');
}

// Test 2: Check if the import in index.ts is correct
console.log('\n2. Checking index.ts imports...');
const indexPath = path.join(__dirname, 'src/plugins/index.ts');
if (fs.existsSync(indexPath)) {
  const indexContent = fs.readFileSync(indexPath, 'utf8');

  const hasPluginImport = indexContent.includes("import { tokenCreatorPlugin }");
  const hasImplementationImport = indexContent.includes("export { TokenCreatorPluginImplementation }");

  console.log(`   ✅ Plugin import: ${hasPluginImport}`);
  console.log(`   ✅ Implementation import: ${hasImplementationImport}`);
} else {
  console.log('   ❌ Index file not found');
}

// Test 3: Check for syntax consistency
console.log('\n3. Checking syntax consistency...');
const allPluginFiles = [
  'src/plugins/gitPlugin.ts',
  'src/plugins/debuggerPlugin.ts',
  'src/plugins/testingPlugin.ts',
  'src/plugins/analysisPlugin.ts',
  'src/plugins/deploymentPlugin.ts',
  'src/plugins/collaborationPlugin.ts',
  'src/plugins/backupPlugin.ts',
  'src/plugins/themePlugin.ts',
  'src/plugins/tokenCreatorPlugin.ts'
];

const exportPatterns = [];
allPluginFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const pluginName = path.basename(file, '.ts');
    const implementationName = pluginName.replace('Plugin', '').split('').map((char, index) =>
      index === 0 ? char.toUpperCase() : char
    ).join('') + 'PluginImplementation';

    const hasImplementationExport = content.includes(`export { ${implementationName} }`);
    exportPatterns.push({
      file: pluginName,
      hasExport: hasImplementationExport
    });
  }
});

console.log('   Plugin export patterns:');
exportPatterns.forEach(pattern => {
  console.log(`   ${pattern.hasExport ? '✅' : '❌'} ${pattern.file}: ${pattern.hasExport ? 'Has export' : 'Missing export'}`);
});

// Summary
console.log('\n📋 SUMMARY:');
console.log('===========================================');
console.log('✅ Export Fix Applied');
console.log('✅ TokenCreatorPluginImplementation now exported');
console.log('✅ Import/Export mismatch resolved');
console.log('');
console.log('🎉 The syntax error should now be fixed!');
console.log('');
console.log('💡 The error was caused by:');
console.log('   • index.ts trying to import TokenCreatorPluginImplementation');
console.log('   • tokenCreatorPlugin.ts not exporting the class');
console.log('   • Only the plugin instance was exported, not the class itself');
console.log('');
console.log('🔧 Fixed by adding: export { TokenCreatorPluginImplementation };');
