const fs = require('fs');
const path = require('path');

console.log('🔍 Reproducing Theme and Layout Plugin Errors...');

// Read the themePlugin.ts file to analyze the specific errors
const themePluginPath = path.join(__dirname, 'src/plugins/themePlugin.ts');

try {
  console.log('\n📁 Reading themePlugin.ts...');
  const themePluginContent = fs.readFileSync(themePluginPath, 'utf8');

  console.log('\n🔍 Analyzing applyTheme and applyLayout functions...');

  // Look for the specific problematic lines
  const lines = themePluginContent.split('\n');

  // Find applyTheme function issues
  console.log('\n❌ FOUND ISSUES IN applyTheme function:');
  lines.forEach((line, index) => {
    if (line.includes('this.config.theme = themeId')) {
      console.log(`   Line ${index + 1}: ${line.trim()}`);
      console.log('   ↳ Direct assignment to readonly property "theme"');
    }
  });

  // Find applyLayout function issues
  console.log('\n❌ FOUND ISSUES IN applyLayout function:');
  lines.forEach((line, index) => {
    if (line.includes('this.config.layout = {')) {
      console.log(`   Line ${index + 1}: ${line.trim()}`);
      console.log('   ↳ Direct assignment to readonly property "layout"');

      // Show the full assignment block
      let i = index;
      while (i < lines.length && !lines[i].includes('};')) {
        if (i > index) {
          console.log(`   Line ${i + 1}: ${lines[i].trim()}`);
        }
        i++;
      }
      if (i < lines.length) {
        console.log(`   Line ${i + 1}: ${lines[i].trim()}`);
      }
    }
  });

  console.log('\n📋 ERROR ANALYSIS:');
  console.log('==================');
  console.log('The errors "Cannot assign to read only property \'theme\' of object" are caused by:');
  console.log('');
  console.log('1. applyTheme function (line ~414):');
  console.log('   this.config.theme = themeId;');
  console.log('   ↳ Direct assignment to readonly config.theme property');
  console.log('');
  console.log('2. applyLayout function (lines ~612-619):');
  console.log('   this.config.layout = { ... };');
  console.log('   ↳ Direct assignment to readonly config.layout property');
  console.log('');
  console.log('💡 SOLUTION:');
  console.log('Replace direct assignments with Object.assign() or safe mutation:');
  console.log('');
  console.log('For applyTheme:');
  console.log('  // Instead of: this.config.theme = themeId;');
  console.log('  // Use: Object.assign(this.config, { theme: themeId });');
  console.log('');
  console.log('For applyLayout:');
  console.log('  // Instead of: this.config.layout = { ... };');
  console.log('  // Use: Object.assign(this.config, { layout: { ... } });');

} catch (error) {
  console.error('❌ Error analyzing themePlugin.ts:', error.message);
}

console.log('\n✅ Analysis complete!');
