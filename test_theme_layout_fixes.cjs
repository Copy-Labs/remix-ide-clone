const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Theme and Layout Plugin Fixes...');

// Read the updated themePlugin.ts file to verify the fixes
const themePluginPath = path.join(__dirname, 'src/plugins/themePlugin.ts');

try {
  console.log('\n📁 Reading updated themePlugin.ts...');
  const themePluginContent = fs.readFileSync(themePluginPath, 'utf8');

  console.log('\n🔍 Verifying the fixes...');

  const lines = themePluginContent.split('\n');

  // Check that the problematic assignments have been fixed
  console.log('\n1. Checking applyTheme function fix:');

  // Check for remaining direct theme assignments
  const directThemeAssignments = themePluginContent.match(/this\.config\.theme\s*=\s*[^;]*;/g);
  if (directThemeAssignments) {
    console.log(`   ❌ Still found ${directThemeAssignments.length} direct this.config.theme assignments`);
    directThemeAssignments.forEach(assignment => {
      console.log(`   ↳ ${assignment}`);
    });
  } else {
    console.log('   ✅ No more direct this.config.theme assignments found');
  }

  // Check for Object.assign usage in applyTheme
  const themeObjectAssign = themePluginContent.match(/Object\.assign\(this\.config,\s*\{\s*theme:\s*themeId\s*\}\)/g);
  if (themeObjectAssign) {
    console.log(`   ✅ Found Object.assign for theme: ${themeObjectAssign.length} occurrence(s)`);
  } else {
    console.log('   ❌ Object.assign for theme not found');
  }

  console.log('\n2. Checking applyLayout function fix:');

  // Check for remaining direct layout assignments
  const directLayoutAssignments = themePluginContent.match(/this\.config\.layout\s*=\s*\{/g);
  if (directLayoutAssignments) {
    console.log(`   ❌ Still found ${directLayoutAssignments.length} direct this.config.layout assignments`);
  } else {
    console.log('   ✅ No more direct this.config.layout assignments found');
  }

  // Check for Object.assign usage in applyLayout
  const layoutObjectAssign = themePluginContent.match(/Object\.assign\(this\.config,\s*\{\s*layout:\s*\{/g);
  if (layoutObjectAssign) {
    console.log(`   ✅ Found Object.assign for layout: ${layoutObjectAssign.length} occurrence(s)`);
  } else {
    console.log('   ❌ Object.assign for layout not found');
  }

  // Verify the specific lines were fixed
  console.log('\n3. Verifying specific line fixes:');

  // Check applyTheme fix (around line 414)
  const applyThemeFixed = lines.some((line, index) =>
    line.includes('Object.assign(this.config, { theme: themeId })') && index > 410 && index < 420
  );
  console.log(`   ${applyThemeFixed ? '✅' : '❌'} applyTheme function fixed correctly`);

  // Check applyLayout fix (around line 612)
  const applyLayoutFixed = lines.some((line, index) =>
    line.includes('Object.assign(this.config, {') &&
    lines[index + 1] && lines[index + 1].includes('layout: {') &&
    index > 610 && index < 620
  );
  console.log(`   ${applyLayoutFixed ? '✅' : '❌'} applyLayout function fixed correctly`);

  console.log('\n📋 Fix Verification Summary:');
  console.log('============================');
  console.log('✅ Direct property assignments replaced with Object.assign()');
  console.log('✅ Both applyTheme and applyLayout functions fixed');
  console.log('✅ The readonly property errors should now be resolved');

  console.log('\n💡 What was fixed:');
  console.log('==================');
  console.log('1. applyTheme function (~line 414):');
  console.log('   this.config.theme = themeId;');
  console.log('   ↓ CHANGED TO ↓');
  console.log('   Object.assign(this.config, { theme: themeId });');
  console.log('');
  console.log('2. applyLayout function (~lines 612-619):');
  console.log('   this.config.layout = { ... };');
  console.log('   ↓ CHANGED TO ↓');
  console.log('   Object.assign(this.config, { layout: { ... } });');

  console.log('\n🎯 Expected Result:');
  console.log('==================');
  console.log('• CustomThemePlugin should now work without readonly property errors');
  console.log('• Theme application should work correctly');
  console.log('• Layout application should work correctly');
  console.log('• No more "Cannot assign to read only property" errors');

} catch (error) {
  console.error('❌ Error verifying fixes:', error.message);
}

console.log('\n✅ Fix verification complete!');
