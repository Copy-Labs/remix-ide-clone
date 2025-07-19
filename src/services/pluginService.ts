import { info, error, debug, warn } from './loggerService';
import type { Plugin, PluginAPI, PluginConfig } from '@/types';
import { useFileStore } from '@/stores/fileStore';
import { useEditorStore } from '@/stores/editorStore';
import { useCompilerStore } from '@/stores/compilerStore';
import { useDeploymentStore } from '@/stores/deploymentStore';

/**
 * Service for managing plugins in the application
 */
class PluginService {
  private static instance: PluginService;
  private plugins: Map<string, Plugin> = new Map();

  private constructor() {
    debug('PluginService', 'PluginService initialized');
  }

  /**
   * Get the singleton instance of PluginService
   */
  public static getInstance(): PluginService {
    if (!PluginService.instance) {
      PluginService.instance = new PluginService();
    }
    return PluginService.instance;
  }

  /**
   * Register a new plugin
   * @param plugin The plugin to register
   */
  public registerPlugin(plugin: Omit<Plugin, 'api'>): Plugin {
    if (this.plugins.has(plugin.id)) {
      error('PluginService', `Plugin with id ${plugin.id} already exists`);
      throw new Error(`Plugin with id ${plugin.id} already exists`);
    }

    // Create plugin API
    const api = this.createPluginAPI(plugin.id);

    // Create complete plugin object with explicit mutable properties
    const completePlugin: Plugin = {
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      description: plugin.description,
      author: plugin.author,
      enabled: plugin.enabled,
      config: { ...plugin.config },
      api
    };

    // Store plugin
    this.plugins.set(plugin.id, completePlugin);
    info('PluginService', `Plugin ${plugin.name} (${plugin.id}) registered`);

    return completePlugin;
  }

  /**
   * Unregister a plugin
   * @param pluginId The ID of the plugin to unregister
   */
  public unregisterPlugin(pluginId: string): boolean {
    if (!this.plugins.has(pluginId)) {
      warn('PluginService', `Plugin with id ${pluginId} not found`);
      return false;
    }

    this.plugins.delete(pluginId);
    info('PluginService', `Plugin ${pluginId} unregistered`);
    return true;
  }

  /**
   * Get a plugin by ID
   * @param pluginId The ID of the plugin to get
   */
  public getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Get all registered plugins
   */
  public getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Enable a plugin
   * @param pluginId The ID of the plugin to enable
   */
  public enablePlugin(pluginId: string): boolean {
    console.log(`🔄 PluginService: Attempting to enable plugin ${pluginId}`);
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      console.log(`🔄 PluginService: Plugin ${pluginId} not found in service`);
      warn('PluginService', `Plugin with id ${pluginId} not found`);
      return false;
    }

    console.log(`🔄 PluginService: Found plugin ${pluginId}, current enabled state:`, plugin.enabled);
    plugin.enabled = true;
    console.log(`🔄 PluginService: Set plugin ${pluginId} enabled = true`);
    info('PluginService', `Plugin ${plugin.name} (${pluginId}) enabled`);
    return true;
  }

  /**
   * Disable a plugin
   * @param pluginId The ID of the plugin to disable
   */
  public disablePlugin(pluginId: string): boolean {
    console.log(`🔄 PluginService: Attempting to disable plugin ${pluginId}`);
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      console.log(`🔄 PluginService: Plugin ${pluginId} not found in service`);
      warn('PluginService', `Plugin with id ${pluginId} not found`);
      return false;
    }

    console.log(`🔄 PluginService: Found plugin ${pluginId}, current enabled state:`, plugin.enabled);
    plugin.enabled = false;
    console.log(`🔄 PluginService: Set plugin ${pluginId} enabled = false`);
    info('PluginService', `Plugin ${plugin.name} (${pluginId}) disabled`);
    return true;
  }

  /**
   * Update plugin configuration
   * @param pluginId The ID of the plugin to update
   * @param config The new configuration
   */
  public updatePluginConfig(pluginId: string, config: PluginConfig): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      warn('PluginService', `Plugin with id ${pluginId} not found`);
      return false;
    }

    plugin.config = { ...plugin.config, ...config };
    debug('PluginService', `Plugin ${plugin.name} (${pluginId}) config updated`, config);
    return true;
  }

  /**
   * Create API for a plugin
   * @param pluginId The ID of the plugin
   */
  private createPluginAPI(pluginId: string): PluginAPI {
    const fileStore = useFileStore.getState();
    const editorStore = useEditorStore.getState();
    const compilerStore = useCompilerStore.getState();
    const deploymentStore = useDeploymentStore.getState();

    // Create file system API
    const fileSystem = {
      readFile: async (path: string) => {
        const file = fileStore.files.get(path);
        if (!file || file.type !== 'file') {
          throw new Error(`File not found: ${path}`);
        }
        return file.content;
      },
      writeFile: async (path: string, content: string) => {
        if (!fileStore.files.has(path)) {
          throw new Error(`File not found: ${path}`);
        }
        fileStore.updateFile(path, content);
      },
      createFile: async (path: string, content: string = '') => {
        fileStore.createFile(path, content);
      },
      deleteFile: async (path: string) => {
        fileStore.deleteFile(path);
      },
      renameFile: async (oldPath: string, newPath: string) => {
        fileStore.renameFile(oldPath, newPath);
      }
    };

    // Create editor API
    const editor = {
      getActiveEditor: () => {
        const activeFile = fileStore.activeFile;
        if (!activeFile) return null;
        return editorStore.editors.get(activeFile) || null;
      },
      getEditorContent: (path: string) => {
        const file = fileStore.files.get(path);
        if (!file || file.type !== 'file') return null;
        return file.content;
      },
      setEditorContent: (path: string, content: string) => {
        if (!fileStore.files.has(path)) {
          throw new Error(`File not found: ${path}`);
        }
        fileStore.updateFile(path, content);
      },
      openFile: (path: string) => {
        fileStore.openFile(path);
      },
      closeFile: (path: string) => {
        fileStore.closeFile(path);
      }
    };

    // Create compiler API
    const compiler = {
      compile: async (files: Map<string, string>) => {
        return compilerStore.compile(files);
      },
      getCompilationResult: (contractName: string) => {
        return compilerStore.getCompilationResult(contractName);
      }
    };

    // Create deployment API
    const deployment = {
      deploy: async (contract, args) => {
        return deploymentStore.deploy(contract, args);
      },
      getDeployedContract: (address: string) => {
        return deploymentStore.getDeployedContract(address);
      },
      interact: async (contract, method, args) => {
        return deploymentStore.interact(contract, method, args);
      }
    };

    // Create UI API
    const ui = {
      showNotification: (notification) => {
        // Implementation will be added when UI store is available
        console.log('Show notification:', notification);
      },
      showModal: (modal) => {
        // Implementation will be added when UI store is available
        console.log('Show modal:', modal);
      },
      showContextMenu: (menu) => {
        // Implementation will be added when UI store is available
        console.log('Show context menu:', menu);
      }
    };

    return {
      fileSystem,
      editor,
      compiler,
      deployment,
      ui
    };
  }
}

// Export singleton instance getter
export const getPluginService = () => PluginService.getInstance();

// Export convenience functions
export const registerPlugin = (plugin: Omit<Plugin, 'api'>) =>
  getPluginService().registerPlugin(plugin);

export const unregisterPlugin = (pluginId: string) =>
  getPluginService().unregisterPlugin(pluginId);

export const getPlugin = (pluginId: string) =>
  getPluginService().getPlugin(pluginId);

export const getAllPlugins = () =>
  getPluginService().getAllPlugins();

export const enablePlugin = (pluginId: string) =>
  getPluginService().enablePlugin(pluginId);

export const disablePlugin = (pluginId: string) =>
  getPluginService().disablePlugin(pluginId);

export const updatePluginConfig = (pluginId: string, config: PluginConfig) =>
  getPluginService().updatePluginConfig(pluginId, config);
