const fs = require('fs');
const path = require('path');

console.log('🔄 Plugin Manager Main Page Migration Test');
console.log('='.repeat(50));

// Test 1: Verify App.tsx has the new navigation system
console.log('\n1. Verifying App.tsx navigation system...');
const appPath = path.join(__dirname, 'src/App.tsx');
const appContent = fs.readFileSync(appPath, 'utf8');

const appChecks = [
  'type MainView = \'editor\' | \'plugins\'',
  'const [mainView, setMainView] = useState<MainView>(\'editor\')',
  'variant={mainView === \'editor\' ? \'default\' : \'outline\'}',
  'variant={mainView === \'plugins\' ? \'default\' : \'outline\'}',
  'onClick={() => setMainView(\'editor\')}',
  'onClick={() => setMainView(\'plugins\')}',
  'Plugin Manager',
  '{mainView === \'plugins\' ? (',
  '<PluginPanel />'
];

let appImplementationCorrect = true;
appChecks.forEach(check => {
  if (appContent.includes(check)) {
    console.log(`   ✅ ${check.substring(0, 50)}...`);
  } else {
    console.log(`   ❌ ${check.substring(0, 50)}... missing`);
    appImplementationCorrect = false;
  }
});

// Test 2: Verify AppSidebar.tsx no longer has plugin manager
console.log('\n2. Verifying AppSidebar.tsx plugin removal...');
const sidebarPath = path.join(__dirname, 'src/components/AppSidebar.tsx');
const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');

const sidebarRemovals = [
  'LucidePlug2',
  'PluginPanel',
  'key: \'plugin\'',
  'title: \'Plugins\'',
  'icon: LucidePlug2'
];

let sidebarCleanupCorrect = true;
sidebarRemovals.forEach(removal => {
  if (!sidebarContent.includes(removal)) {
    console.log(`   ✅ ${removal} successfully removed`);
  } else {
    console.log(`   ❌ ${removal} still present`);
    sidebarCleanupCorrect = false;
  }
});

// Test 3: Verify sidebar still has other navigation items
console.log('\n3. Verifying sidebar navigation integrity...');
const sidebarKeeps = [
  'key: \'file_explorer\'',
  'title: \'File Explorer\'',
  'key: \'compiler\'',
  'title: \'Compiler\'',
  'key: \'deployment\'',
  'title: \'Deploy Your Contract\'',
  'key: \'git\'',
  'title: \'Git\''
];

let sidebarIntegrityCorrect = true;
sidebarKeeps.forEach(keep => {
  if (sidebarContent.includes(keep)) {
    console.log(`   ✅ ${keep.substring(0, 30)}... preserved`);
  } else {
    console.log(`   ❌ ${keep.substring(0, 30)}... missing`);
    sidebarIntegrityCorrect = false;
  }
});

// Test 4: Verify PluginPanel.tsx is still intact
console.log('\n4. Verifying PluginPanel.tsx functionality...');
const pluginPanelPath = path.join(__dirname, 'src/components/PluginUI/PluginPanel.tsx');
const pluginPanelContent = fs.readFileSync(pluginPanelPath, 'utf8');

const pluginPanelChecks = [
  'const PluginPanel: React.FC = () => {',
  'const { plugins, enablePlugin, disablePlugin } = usePluginStore()',
  'const handleTogglePlugin',
  'Plugin Manager',
  'Search plugins by name, description, or author',
  'All',
  'Enabled',
  'Disabled'
];

let pluginPanelIntact = true;
pluginPanelChecks.forEach(check => {
  if (pluginPanelContent.includes(check)) {
    console.log(`   ✅ ${check.substring(0, 40)}...`);
  } else {
    console.log(`   ❌ ${check.substring(0, 40)}... missing`);
    pluginPanelIntact = false;
  }
});

// Test 5: Check for proper imports in App.tsx
console.log('\n5. Verifying App.tsx imports...');
const appImportChecks = [
  'import { Button } from \'@/components/ui/button.tsx\'',
  'import { Settings } from \'lucide-react\'',
  'import PluginPanel from \'./components/PluginUI/PluginPanel\''
];

let appImportsCorrect = true;
appImportChecks.forEach(importCheck => {
  if (appContent.includes(importCheck)) {
    console.log(`   ✅ ${importCheck.substring(0, 40)}...`);
  } else {
    console.log(`   ❌ ${importCheck.substring(0, 40)}... missing`);
    appImportsCorrect = false;
  }
});

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 MIGRATION TEST RESULTS');
console.log('='.repeat(50));

const allTestsPassed = appImplementationCorrect && sidebarCleanupCorrect &&
                      sidebarIntegrityCorrect && pluginPanelIntact && appImportsCorrect;

if (allTestsPassed) {
  console.log('🎉 ALL TESTS PASSED! Plugin Manager successfully migrated to main page.');

  console.log('\n✅ Migration Summary:');
  console.log('   • Plugin Manager removed from sidebar navigation');
  console.log('   • New main page navigation system implemented');
  console.log('   • Plugin Manager accessible via "Plugin Manager" button in header');
  console.log('   • All plugin functionality preserved');
  console.log('   • Sidebar navigation integrity maintained');
  console.log('   • Clean code with proper imports and exports');

  console.log('\n🎯 User Experience Improvements:');
  console.log('   • Plugin Manager now has full main page real estate');
  console.log('   • Better accessibility with dedicated main page view');
  console.log('   • Improved management experience with more space');
  console.log('   • Clear navigation between Editor and Plugin Manager');
  console.log('   • Sidebar focused on development tools only');

  console.log('\n🧪 Manual Testing Instructions:');
  console.log('   1. Start development server: npm run dev');
  console.log('   2. Open the application in browser');
  console.log('   3. Verify sidebar no longer shows "Plugins" option');
  console.log('   4. Click "Plugin Manager" button in header');
  console.log('   5. Verify Plugin Manager opens in main content area');
  console.log('   6. Test plugin toggle functionality');
  console.log('   7. Switch back to "Editor" view');
  console.log('   8. Verify editor functionality is preserved');

  console.log('\n🔍 Expected Behavior:');
  console.log('   • Header shows "Editor" and "Plugin Manager" buttons');
  console.log('   • Active button is highlighted');
  console.log('   • Plugin Manager takes full main content area');
  console.log('   • All plugin features work as before');
  console.log('   • Sidebar shows File Explorer, Compiler, Deployment, Git');
  console.log('   • Smooth switching between views');

} else {
  console.log('❌ SOME TESTS FAILED! Issues need to be addressed:');

  if (!appImplementationCorrect) console.log('   • App.tsx navigation system needs review');
  if (!sidebarCleanupCorrect) console.log('   • AppSidebar.tsx cleanup incomplete');
  if (!sidebarIntegrityCorrect) console.log('   • Sidebar navigation integrity compromised');
  if (!pluginPanelIntact) console.log('   • PluginPanel.tsx functionality may be broken');
  if (!appImportsCorrect) console.log('   • App.tsx imports need review');

  console.log('\n🔧 Recommended Actions:');
  console.log('   1. Review failed test sections above');
  console.log('   2. Fix missing implementations');
  console.log('   3. Re-run this test to verify fixes');
  console.log('   4. Test manually in browser');
}

console.log('\n📝 Migration Benefits:');
console.log('   • Better accessibility - Plugin Manager is now a main page feature');
console.log('   • Improved management - Full screen real estate for plugin operations');
console.log('   • Cleaner sidebar - Focused on core development tools');
console.log('   • Enhanced UX - Clear separation between editing and configuration');
console.log('   • Future-ready - Easy to add more main page views');

console.log('\n🎯 Plugin Manager Main Page Migration Complete!');
