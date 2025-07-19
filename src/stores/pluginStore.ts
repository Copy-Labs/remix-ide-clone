import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { Plugin, PluginConfig } from '@/types';
import {
  disablePlugin,
  enablePlugin,
  getAllPlugins,
  getPlugin,
  registerPlugin,
  unregisterPlugin,
  updatePluginConfig,
} from '@/services/pluginService';
import { debug, error, info } from '@/services/loggerService';

// Define the store state interface
interface PluginState {
  plugins: Plugin[];
  activePlugins: string[];
  isLoading: boolean;
  error: string | null;
}

// Define the store actions interface
interface PluginStoreActions {
  // Plugin management
  registerPlugin: (plugin: Omit<Plugin, 'api'>) => Plugin;
  unregisterPlugin: (pluginId: string) => boolean;
  enablePlugin: (pluginId: string) => boolean;
  disablePlugin: (pluginId: string) => boolean;
  updatePluginConfig: (pluginId: string, config: PluginConfig) => boolean;

  // Plugin state management
  loadPlugins: () => void;
  savePlugins: () => void;

  // Plugin activation
  activatePlugin: (pluginId: string) => boolean;
  deactivatePlugin: (pluginId: string) => boolean;

  // Plugin retrieval
  getPlugin: (pluginId: string) => Plugin | undefined;
  getActivePlugins: () => Plugin[];
}

// Create the store
export const usePluginStore = create<PluginState & PluginStoreActions>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      plugins: [],
      activePlugins: [],
      isLoading: false,
      error: null,

      // Plugin management
      registerPlugin: (plugin) => {
        try {
          const registeredPlugin = registerPlugin(plugin);

          set((state) => {
            state.plugins.push(registeredPlugin);
          });

          info('PluginStore', `Plugin ${plugin.name} registered`);
          return registeredPlugin;
        } catch (err) {
          error('PluginStore', `Failed to register plugin ${plugin.name}`, err);
          set((state) => {
            state.error = err instanceof Error ? err.message : 'Unknown error registering plugin';
          });
          throw err;
        }
      },

      unregisterPlugin: (pluginId) => {
        try {
          const result = unregisterPlugin(pluginId);

          if (result) {
            set((state) => {
              state.plugins = state.plugins.filter((p) => p.id !== pluginId);
              state.activePlugins = state.activePlugins.filter((id) => id !== pluginId);
            });

            info('PluginStore', `Plugin ${pluginId} unregistered`);
          }

          return result;
        } catch (err) {
          error('PluginStore', `Failed to unregister plugin ${pluginId}`, err);
          set((state) => {
            state.error = err instanceof Error ? err.message : 'Unknown error unregistering plugin';
          });
          return false;
        }
      },

      enablePlugin: (pluginId) => {
        try {
          const result = enablePlugin(pluginId);

          if (result) {
            set((state) => {
              const plugin = state.plugins.find((p) => p.id === pluginId);
              if (plugin) {
                plugin.enabled = true;
              }
            });

            // Save changes to localStorage
            get().savePlugins();

            info('PluginStore', `Plugin ${pluginId} enabled`);
          }

          return result;
        } catch (err) {
          error('PluginStore', `Failed to enable plugin ${pluginId}`, err);
          set((state) => {
            state.error = err instanceof Error ? err.message : 'Unknown error enabling plugin';
          });
          return false;
        }
      },

      disablePlugin: (pluginId) => {
        try {
          const result = disablePlugin(pluginId);

          if (result) {
            set((state) => {
              const plugin = state.plugins.find((p) => p.id === pluginId);
              if (plugin) {
                plugin.enabled = false;
              }
              // Also deactivate the plugin if it's active
              state.activePlugins = state.activePlugins.filter((id) => id !== pluginId);
            });

            // Save changes to localStorage
            get().savePlugins();

            info('PluginStore', `Plugin ${pluginId} disabled`);
          }

          return result;
        } catch (err) {
          error('PluginStore', `Failed to disable plugin ${pluginId}`, err);
          set((state) => {
            state.error = err instanceof Error ? err.message : 'Unknown error disabling plugin';
          });
          return false;
        }
      },

      updatePluginConfig: (pluginId, config) => {
        try {
          const result = updatePluginConfig(pluginId, config);

          if (result) {
            set((state) => {
              const plugin = state.plugins.find((p) => p.id === pluginId);
              if (plugin) {
                plugin.config = { ...plugin.config, ...config };
              }
            });

            debug('PluginStore', `Plugin ${pluginId} config updated`, config);
          }

          return result;
        } catch (err) {
          error('PluginStore', `Failed to update plugin ${pluginId} config`, err);
          set((state) => {
            state.error =
              err instanceof Error ? err.message : 'Unknown error updating plugin config';
          });
          return false;
        }
      },

      // Plugin state management
      loadPlugins: () => {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        try {
          // Load plugins from localStorage
          const savedPluginsStr = localStorage.getItem('plugins');
          const savedActivePluginsStr = localStorage.getItem('activePlugins');

          if (savedPluginsStr) {
            const savedPlugins = JSON.parse(savedPluginsStr);

            // Register each saved plugin
            const registeredPlugins = savedPlugins
              .map((plugin: Omit<Plugin, 'api'>) => {
                try {
                  return registerPlugin(plugin);
                } catch (err) {
                  error('PluginStore', `Failed to register saved plugin ${plugin.name}`, err);
                  return null;
                }
              })
              .filter(Boolean);

            set((state) => {
              state.plugins = registeredPlugins;
            });
          }

          if (savedActivePluginsStr) {
            const savedActivePlugins = JSON.parse(savedActivePluginsStr);

            set((state) => {
              state.activePlugins = savedActivePlugins;
            });
          }

          set((state) => {
            state.isLoading = false;
          });

          info('PluginStore', 'Plugins loaded from localStorage');
        } catch (err) {
          error('PluginStore', 'Failed to load plugins from localStorage', err);
          set((state) => {
            state.isLoading = false;
            state.error = err instanceof Error ? err.message : 'Unknown error loading plugins';
          });
        }
      },

      savePlugins: () => {
        try {
          const { plugins, activePlugins } = get();

          // Serialize plugins (without the api property which can't be serialized)
          const serializablePlugins = plugins.map(
            ({ id, name, version, description, author, enabled, config }) => ({
              id,
              name,
              version,
              description,
              author,
              enabled,
              config,
            }),
          );

          localStorage.setItem('plugins', JSON.stringify(serializablePlugins));
          localStorage.setItem('activePlugins', JSON.stringify(activePlugins));

          info('PluginStore', 'Plugins saved to localStorage');
        } catch (err) {
          error('PluginStore', 'Failed to save plugins to localStorage', err);
          set((state) => {
            state.error = err instanceof Error ? err.message : 'Unknown error saving plugins';
          });
        }
      },

      // Plugin activation
      activatePlugin: (pluginId) => {
        const plugin = getPlugin(pluginId);

        if (!plugin) {
          error('PluginStore', `Plugin ${pluginId} not found`);
          return false;
        }

        if (!plugin.enabled) {
          error('PluginStore', `Cannot activate disabled plugin ${pluginId}`);
          return false;
        }

        set((state) => {
          if (!state.activePlugins.includes(pluginId)) {
            state.activePlugins.push(pluginId);
          }
        });

        info('PluginStore', `Plugin ${pluginId} activated`);
        return true;
      },

      deactivatePlugin: (pluginId) => {
        set((state) => {
          state.activePlugins = state.activePlugins.filter((id) => id !== pluginId);
        });

        info('PluginStore', `Plugin ${pluginId} deactivated`);
        return true;
      },

      // Plugin retrieval
      getPlugin: (pluginId) => {
        return getPlugin(pluginId);
      },

      getActivePlugins: () => {
        const { activePlugins } = get();
        return getAllPlugins().filter(
          (plugin) => activePlugins.includes(plugin.id) && plugin.enabled,
        );
      },
    })),
    { name: 'plugin-store' },
  ),
);

// Initialize the store when the module is imported
(() => {
  // Load plugins from localStorage on initialization
  setTimeout(() => {
    usePluginStore.getState().loadPlugins();
  }, 0);

  // Save plugins to localStorage when the window is about to unload
  window.addEventListener('beforeunload', () => {
    usePluginStore.getState().savePlugins();
  });
})();
