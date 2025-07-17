import { gitPlugin } from './gitPlugin';
import { debuggerPlugin } from './debuggerPlugin';
import { testingPlugin } from './testingPlugin';
import { analysisPlugin } from './analysisPlugin';
import { deploymentPlugin } from './deploymentPlugin';
import { collaborationPlugin } from './collaborationPlugin';
import { backupPlugin } from './backupPlugin';
import { themePlugin } from './themePlugin';

// Export all plugins
export const corePlugins = [
  gitPlugin,
  debuggerPlugin,
  testingPlugin,
  analysisPlugin,
  deploymentPlugin,
  collaborationPlugin,
  backupPlugin,
  themePlugin,
];

// Export individual plugins
export {
  gitPlugin,
  debuggerPlugin,
  testingPlugin,
  analysisPlugin,
  deploymentPlugin,
  collaborationPlugin,
  backupPlugin,
  themePlugin,
};

// Export plugin implementations
export { GitPluginImplementation } from './gitPlugin';
export { DebuggerPluginImplementation } from './debuggerPlugin';
export { TestingPluginImplementation } from './testingPlugin';
export { AnalysisPluginImplementation, AnalysisSeverity } from './analysisPlugin';
export { DeploymentPluginImplementation } from './deploymentPlugin';
export { CollaborationPluginImplementation } from './collaborationPlugin';
export { BackupPluginImplementation } from './backupPlugin';
export { ThemePluginImplementation } from './themePlugin';
