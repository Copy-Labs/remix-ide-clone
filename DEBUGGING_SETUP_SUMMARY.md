# Debugging Setup for Readonly Property Issue

## 🎯 Issue Summary
The user is experiencing a "Cannot assign to read only property 'enabled'" error when trying to toggle plugins, specifically when disabling the Solidity Debugger plugin. The error occurs at line 127 in `pluginService.ts` where `plugin.enabled = false` is executed.

## 🔧 Debugging Added

### 1. Enhanced registerPlugin Method
**Location**: `src/services/pluginService.ts` (lines 44-87)

**Added debugging to show**:
- Input plugin object and its frozen status
- Created plugin object and its frozen/sealed status  
- Mutability test during registration
- Confirmation of storage in service Map

### 2. Enhanced enablePlugin Method
**Location**: `src/services/pluginService.ts` (lines 104-127)

**Added debugging to show**:
- Plugin lookup in service Map
- Plugin object and its frozen/sealed status
- Current enabled state
- Success/failure of assignment operation

### 3. Enhanced disablePlugin Method  
**Location**: `src/services/pluginService.ts` (lines 133-156)

**Added debugging to show**:
- Plugin lookup in service Map
- Plugin object and its frozen/sealed status
- Current enabled state
- Success/failure of assignment operation (where the error occurs)

## 🧪 Manual Testing Instructions

### Step 1: Start Development Server
```bash
npm run dev
```

### Step 2: Open Browser Developer Tools
- Open the application in your browser
- Press F12 to open developer tools
- Go to the Console tab

### Step 3: Navigate to Plugin Manager
- Click the "Plugin Manager" button in the header
- Look for debugging messages starting with 🔍

### Step 4: Reproduce the Error
- Find the "Solidity Debugger" plugin in the list
- Click the toggle switch to disable it
- Watch the console for debugging messages

## 🔍 Expected Debugging Output

### ✅ If Working Correctly:
```
🔍 PluginService.disablePlugin: Attempting to disable plugin solidity-debugger
🔍 PluginService.disablePlugin: Found plugin solidity-debugger: {...}
🔍 PluginService.disablePlugin: Plugin object frozen? false
🔍 PluginService.disablePlugin: Plugin object sealed? false
🔍 PluginService.disablePlugin: Current enabled state: true
🔍 PluginService.disablePlugin: Successfully set enabled = false for solidity-debugger
```

### ❌ If Readonly Issue Exists:
```
🔍 PluginService.disablePlugin: Attempting to disable plugin solidity-debugger
🔍 PluginService.disablePlugin: Found plugin solidity-debugger: {...}
🔍 PluginService.disablePlugin: Plugin object frozen? true  ← PROBLEM!
🔍 PluginService.disablePlugin: Plugin object sealed? true   ← PROBLEM!
🔍 PluginService.disablePlugin: Current enabled state: true
🔍 PluginService.disablePlugin: Error setting enabled = false: TypeError: Cannot assign...
```

## 🔧 Potential Root Causes

Based on the debugging output, we can identify:

### 1. Objects Being Frozen/Sealed
- **Cause**: Something is freezing plugin objects after registration
- **Suspects**: React strict mode, Zustand middleware, or other libraries
- **Evidence**: `Plugin object frozen? true` in debugging output

### 2. Different Plugin Instances
- **Cause**: Service Map and store array contain different plugin objects
- **Suspects**: Timing issues between loadPlugins and registerPlugin
- **Evidence**: Plugin found in service but still readonly

### 3. Object.assign Fix Not Working
- **Cause**: The mutable object creation isn't working as expected
- **Suspects**: Implementation issue or objects being frozen later
- **Evidence**: registerPlugin debugging shows objects become readonly

## 📝 Next Steps

1. **Run Manual Testing**: Follow the testing instructions above
2. **Analyze Output**: Compare actual debugging output with expected patterns
3. **Identify Root Cause**: Determine which of the potential causes is occurring
4. **Apply Targeted Fix**: Based on the root cause identified
5. **Clean Up**: Remove debugging logs after fixing the issue

## 🎯 Files Modified

- `src/services/pluginService.ts` - Added comprehensive debugging
- `test_readonly_debug.cjs` - Basic debugging simulation
- `test_readonly_runtime_debug.cjs` - Manual testing instructions

The debugging setup will pinpoint exactly what's causing the readonly property issue and guide us to the correct solution.
