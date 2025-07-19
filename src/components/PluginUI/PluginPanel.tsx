import React, { useState } from 'react';
import { usePluginStore } from '@/stores/pluginStore';
import CollaborationPluginUI from './CollaborationPluginUI';
import BackupPluginUI from './BackupPluginUI';
import CustomThemePluginUI from './CustomThemePluginUI';
import AnalysisPluginUI from './AnalysisPluginUI';
import DebuggerPluginUI from './DebuggerPluginUI';
import DeploymentPluginUI from './DeploymentPluginUI';
import GitPluginUI from './GitPluginUI';
import TestingPluginUI from './TestingPluginUI';

const PluginPanel: React.FC = () => {
  const { plugins, enablePlugin, disablePlugin } = usePluginStore();
  const [activePluginId, setActivePluginId] = useState<string | null>(null);

  // Get all enabled plugins
  const enabledPlugins = plugins.filter((plugin) => plugin.enabled);

  // Handle plugin selection
  const handlePluginSelect = (pluginId: string) => {
    setActivePluginId(pluginId === activePluginId ? null : pluginId);
  };

  // Toggle plugin enabled state
  const handleTogglePlugin = (pluginId: string, isCurrentlyEnabled: boolean) => {
    if (isCurrentlyEnabled) {
      disablePlugin(pluginId);
    } else {
      enablePlugin(pluginId);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Plugins</h2>

        {/* Plugin Selection */}
        <div className="space-y-2">
          {plugins.map((plugin) => (
            <div
              key={plugin.id}
              className="flex items-center justify-between p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
            >
              <div
                className="flex-1 flex items-center"
                onClick={() => plugin.enabled && handlePluginSelect(plugin.id)}
              >
                <span
                  className={`mr-2 text-sm font-medium ${plugin.enabled ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}
                >
                  {plugin.name}
                </span>
              </div>

              <div className="flex items-center">
                {/* Toggle switch */}
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={plugin.enabled}
                    onChange={() => handleTogglePlugin(plugin.id, plugin.enabled)}
                  />
                  <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Plugin Content */}
      <div className="flex-1 overflow-auto">
        {activePluginId && (
          <div className="h-full">
            {activePluginId === 'collaboration' && (
              <CollaborationPluginUI pluginId={activePluginId} />
            )}
            {activePluginId === 'backup-sync' && <BackupPluginUI pluginId={activePluginId} />}
            {activePluginId === 'custom-theme-ui' && (
              <CustomThemePluginUI pluginId={activePluginId} />
            )}
            {activePluginId === 'code-analysis' && (
              <AnalysisPluginUI pluginId={activePluginId} />
            )}
            {activePluginId === 'solidity-debugger' && (
              <DebuggerPluginUI pluginId={activePluginId} />
            )}
            {activePluginId === 'deployment-automation' && (
              <DeploymentPluginUI pluginId={activePluginId} />
            )}
            {activePluginId === 'git-integration' && (
              <GitPluginUI pluginId={activePluginId} />
            )}
            {activePluginId === 'testing-framework' && (
              <TestingPluginUI pluginId={activePluginId} />
            )}
          </div>
        )}

        {!activePluginId && (
          <div className="h-full flex items-center justify-center p-4">
            <div className="text-center">
              <div className="text-4xl mb-4">🔌</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Plugin Selected
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Select a plugin from the list above to view its interface
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PluginPanel;
