import React, { useState, useEffect } from 'react';
import { usePluginStore } from '@/stores/pluginStore';
import { useFileStore } from '@/stores/fileStore';
import { BackupPluginImplementation } from '@/plugins/backupPlugin';

interface BackupPluginUIProps {
  pluginId: string;
}

const BackupPluginUI: React.FC<BackupPluginUIProps> = ({ pluginId }) => {
  const { getPlugin, updatePluginConfig } = usePluginStore();
  const { files } = useFileStore();

  const [implementation, setImplementation] = useState<BackupPluginImplementation | null>(null);
  const [backups, setBackups] = useState<any[]>([]);
  const [cloudProviders, setCloudProviders] = useState<any[]>([]);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  // Form states
  const [backupName, setBackupName] = useState('');
  const [selectedBackupId, setSelectedBackupId] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('none');
  const [customEndpoint, setCustomEndpoint] = useState('');
  const [authToken, setAuthToken] = useState('');

  // Config options
  const [autoBackup, setAutoBackup] = useState(true);
  const [backupInterval, setBackupInterval] = useState(15);
  const [maxLocalBackups, setMaxLocalBackups] = useState(10);
  const [compressBackups, setCompressBackups] = useState(true);
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [syncInterval, setSyncInterval] = useState(30);
  const [backupOnSave, setBackupOnSave] = useState(true);
  const [excludedFiles, setExcludedFiles] = useState<string[]>([]);

  // Initialize the implementation when the component mounts
  useEffect(() => {
    const plugin = getPlugin(pluginId);
    if (plugin) {
      const impl = new BackupPluginImplementation(plugin.config);
      setImplementation(impl);

      // Load config values
      setAutoBackup(plugin.config.autoBackup || true);
      setBackupInterval(plugin.config.backupInterval || 15);
      setMaxLocalBackups(plugin.config.maxLocalBackups || 10);
      setCompressBackups(plugin.config.compressBackups || true);
      setCloudSyncEnabled(plugin.config.cloudSync?.enabled || false);
      setSelectedProvider(plugin.config.cloudSync?.provider || 'none');
      setAutoSync(plugin.config.cloudSync?.autoSync || true);
      setSyncInterval(plugin.config.cloudSync?.syncInterval || 30);
      setCustomEndpoint(plugin.config.cloudSync?.customEndpoint || '');
      setAuthToken(plugin.config.cloudSync?.authToken || '');
      setBackupOnSave(plugin.config.backupOnSave || true);
      setExcludedFiles(plugin.config.excludedFiles || []);

      // Load backups, cloud providers, and sync status
      loadBackupData(impl);
    }
  }, [pluginId, getPlugin]);

  // Load backup data
  const loadBackupData = async (impl: BackupPluginImplementation | null = implementation) => {
    if (!impl) return;

    setIsLoading(true);
    setError(null);

    try {
      // Get backups
      const backups = impl.getBackups();
      setBackups(backups);

      // Get cloud providers
      const providers = impl.getCloudProviders();
      setCloudProviders(providers);

      // Get sync status
      const status = impl.getSyncStatus();
      setSyncStatus(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load backup data');
    } finally {
      setIsLoading(false);
    }
  };

  // Create a backup
  const handleCreateBackup = async () => {
    if (!implementation || !backupName) return;

    setIsLoading(true);
    setError(null);

    try {
      await implementation.createBackup(backupName);

      // Refresh backups
      const backups = implementation.getBackups();
      setBackups(backups);

      // Clear form
      setBackupName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create backup');
    } finally {
      setIsLoading(false);
    }
  };

  // Restore a backup
  const handleRestoreBackup = async (backupId: string) => {
    if (!implementation) return;

    setIsLoading(true);
    setError(null);

    try {
      await implementation.restoreBackup(backupId);

      // Refresh backups
      const backups = implementation.getBackups();
      setBackups(backups);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to restore backup: ${backupId}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a backup
  const handleDeleteBackup = async (backupId: string) => {
    if (!implementation) return;

    setIsLoading(true);
    setError(null);

    try {
      await implementation.deleteBackup(backupId);

      // Refresh backups
      const backups = implementation.getBackups();
      setBackups(backups);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to delete backup: ${backupId}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Export a backup
  const handleExportBackup = async (backupId: string) => {
    if (!implementation) return;

    setIsLoading(true);
    setError(null);

    try {
      const downloadUrl = await implementation.exportBackup(backupId);

      if (downloadUrl) {
        // Create a temporary link and trigger download
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `backup-${backupId}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to export backup: ${backupId}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Import a backup
  const handleImportBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!implementation || !event.target.files || event.target.files.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const file = event.target.files[0];
      const name = `Imported: ${file.name}`;

      await implementation.importBackup(file, name);

      // Refresh backups
      const backups = implementation.getBackups();
      setBackups(backups);

      // Clear input
      event.target.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import backup');
    } finally {
      setIsLoading(false);
    }
  };

  // Sync with cloud
  const handleSyncWithCloud = async () => {
    if (!implementation) return;

    setIsLoading(true);
    setError(null);

    try {
      await implementation.syncWithCloud();

      // Refresh sync status
      const status = implementation.getSyncStatus();
      setSyncStatus(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync with cloud');
    } finally {
      setIsLoading(false);
    }
  };

  // Set cloud provider
  const handleSetCloudProvider = async (providerId: string) => {
    if (!implementation) return;

    setIsLoading(true);
    setError(null);

    try {
      await implementation.setCloudProvider(providerId);
      setSelectedProvider(providerId);

      // Refresh sync status
      const status = implementation.getSyncStatus();
      setSyncStatus(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to set cloud provider: ${providerId}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Authenticate with provider
  const handleAuthenticateWithProvider = async () => {
    if (!implementation || selectedProvider === 'none') return;

    setIsLoading(true);
    setError(null);

    try {
      const authData =
        selectedProvider === 'custom'
          ? { endpoint: customEndpoint, token: authToken }
          : { token: authToken };

      await implementation.authenticateWithProvider(selectedProvider, authData);

      // Refresh sync status
      const status = implementation.getSyncStatus();
      setSyncStatus(status);

      // Update cloud sync enabled state
      setCloudSyncEnabled(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to authenticate with provider: ${selectedProvider}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Save configuration
  const handleSaveConfig = () => {
    if (!implementation) return;

    const config = {
      autoBackup,
      backupInterval,
      maxLocalBackups,
      compressBackups,
      cloudSync: {
        enabled: cloudSyncEnabled,
        provider: selectedProvider,
        autoSync,
        syncInterval,
        customEndpoint,
        authToken,
      },
      excludedFiles,
      backupOnSave,
    };

    updatePluginConfig(pluginId, config);

    // Update implementation config
    implementation.updateConfig(config);

    setShowConfig(false);
  };

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // Format size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Backup & Sync</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}

      {/* Backups */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Backups</h3>

        {/* Backup List */}
        {backups.length > 0 ? (
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded mb-4">
            <h4 className="font-medium mb-2">Available Backups</h4>
            <div className="space-y-3">
              {backups.map((backup) => (
                <div key={backup.id} className="bg-white dark:bg-gray-800 p-3 rounded border">
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="font-medium">{backup.name}</h5>
                      <div className="text-sm text-gray-500 mt-1">
                        <div>Created: {formatDate(backup.timestamp)}</div>
                        <div>
                          Size: {formatSize(backup.size)} • Files: {backup.files}
                        </div>
                        <div>
                          Location:{' '}
                          {backup.location === 'local' ? 'Local Storage' : 'Cloud Storage'}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleRestoreBackup(backup.id)}
                        className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                        disabled={isLoading}
                      >
                        Restore
                      </button>
                      <button
                        onClick={() => handleExportBackup(backup.id)}
                        className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                        disabled={isLoading}
                      >
                        Export
                      </button>
                      <button
                        onClick={() => handleDeleteBackup(backup.id)}
                        className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                        disabled={isLoading}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded mb-4 text-center">
            <p className="text-gray-600 dark:text-gray-400">No backups available.</p>
          </div>
        )}

        {/* Create Backup Form */}
        <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded">
          <h4 className="font-medium mb-2">Create Backup</h4>
          <div className="flex space-x-2">
            <input
              type="text"
              value={backupName}
              onChange={(e) => setBackupName(e.target.value)}
              placeholder="Backup name"
              className="flex-1 p-2 border rounded"
            />
            <button
              onClick={handleCreateBackup}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={isLoading || !backupName}
            >
              Create Backup
            </button>
          </div>

          {/* Import Backup */}
          <div className="mt-4">
            <h4 className="font-medium mb-2">Import Backup</h4>
            <input
              type="file"
              accept=".zip"
              onChange={handleImportBackup}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
        </div>
      </div>

      {/* Cloud Sync */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Cloud Sync</h3>

        {/* Sync Status */}
        <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded mb-4">
          <h4 className="font-medium mb-2">Sync Status</h4>
          {syncStatus ? (
            <div>
              <div className="flex items-center mb-2">
                <span
                  className={`inline-block w-3 h-3 rounded-full mr-2 ${
                    syncStatus.inProgress
                      ? 'bg-yellow-500'
                      : syncStatus.error
                        ? 'bg-red-500'
                        : 'bg-green-500'
                  }`}
                ></span>
                <span className="font-medium">
                  {syncStatus.inProgress
                    ? 'Sync in progress'
                    : syncStatus.error
                      ? 'Sync error'
                      : 'Ready to sync'}
                </span>
              </div>

              {syncStatus.lastSync && (
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Last synced: {formatDate(syncStatus.lastSync)}
                </div>
              )}

              {syncStatus.provider !== 'none' && (
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Provider: {syncStatus.provider}
                </div>
              )}

              {syncStatus.pendingChanges > 0 && (
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Pending changes: {syncStatus.pendingChanges}
                </div>
              )}

              {syncStatus.error && (
                <div className="text-sm text-red-600 dark:text-red-400 mb-2">
                  Error: {syncStatus.error}
                </div>
              )}

              {cloudSyncEnabled && (
                <button
                  onClick={handleSyncWithCloud}
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 mt-2"
                  disabled={isLoading || syncStatus.inProgress}
                >
                  Sync Now
                </button>
              )}
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">No sync status available.</p>
          )}
        </div>

        {/* Cloud Provider Selection */}
        <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded mb-4">
          <h4 className="font-medium mb-2">Cloud Provider</h4>

          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Select Provider</label>
            <select
              value={selectedProvider}
              onChange={(e) => handleSetCloudProvider(e.target.value)}
              className="w-full p-2 border rounded"
            >
              {cloudProviders.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
          </div>

          {selectedProvider !== 'none' && (
            <div>
              {selectedProvider === 'custom' && (
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1">Custom Endpoint</label>
                  <input
                    type="text"
                    value={customEndpoint}
                    onChange={(e) => setCustomEndpoint(e.target.value)}
                    placeholder="https://your-custom-endpoint.com"
                    className="w-full p-2 border rounded"
                  />
                </div>
              )}

              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Authentication Token</label>
                <input
                  type="password"
                  value={authToken}
                  onChange={(e) => setAuthToken(e.target.value)}
                  placeholder="Enter your auth token"
                  className="w-full p-2 border rounded"
                />
              </div>

              <button
                onClick={handleAuthenticateWithProvider}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                disabled={
                  isLoading || (selectedProvider === 'custom' && !customEndpoint) || !authToken
                }
              >
                Authenticate
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Configuration */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Configuration</h3>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="text-blue-500 hover:text-blue-700"
          >
            {showConfig ? 'Hide' : 'Show'}
          </button>
        </div>

        {showConfig && (
          <div className="mt-2 p-4 bg-gray-100 dark:bg-gray-700 rounded">
            <div className="mb-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={autoBackup}
                  onChange={(e) => setAutoBackup(e.target.checked)}
                  className="mr-2"
                />
                Enable Auto Backup
              </label>
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Backup Interval (minutes)</label>
              <input
                type="number"
                value={backupInterval}
                onChange={(e) => setBackupInterval(parseInt(e.target.value) || 15)}
                className="w-full p-2 border rounded"
                min="1"
              />
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Max Local Backups</label>
              <input
                type="number"
                value={maxLocalBackups}
                onChange={(e) => setMaxLocalBackups(parseInt(e.target.value) || 10)}
                className="w-full p-2 border rounded"
                min="1"
              />
            </div>

            <div className="mb-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={compressBackups}
                  onChange={(e) => setCompressBackups(e.target.checked)}
                  className="mr-2"
                />
                Compress Backups
              </label>
            </div>

            <div className="mb-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={cloudSyncEnabled}
                  onChange={(e) => setCloudSyncEnabled(e.target.checked)}
                  className="mr-2"
                />
                Enable Cloud Sync
              </label>
            </div>

            {cloudSyncEnabled && (
              <>
                <div className="mb-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={autoSync}
                      onChange={(e) => setAutoSync(e.target.checked)}
                      className="mr-2"
                    />
                    Enable Auto Sync
                  </label>
                </div>

                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1">Sync Interval (minutes)</label>
                  <input
                    type="number"
                    value={syncInterval}
                    onChange={(e) => setSyncInterval(parseInt(e.target.value) || 30)}
                    className="w-full p-2 border rounded"
                    min="1"
                  />
                </div>
              </>
            )}

            <div className="mb-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={backupOnSave}
                  onChange={(e) => setBackupOnSave(e.target.checked)}
                  className="mr-2"
                />
                Backup on Save
              </label>
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Excluded Files (patterns)</label>
              <textarea
                value={excludedFiles.join('\n')}
                onChange={(e) => setExcludedFiles(e.target.value.split('\n').filter(Boolean))}
                className="w-full p-2 border rounded"
                rows={3}
                placeholder="**/.git/**
**/node_modules/**
**/.DS_Store"
              />
              <p className="text-xs text-gray-500 mt-1">
                One pattern per line. Use * for wildcards.
              </p>
            </div>

            <button
              onClick={handleSaveConfig}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Save Configuration
            </button>
          </div>
        )}
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded shadow-lg">
            <p>Processing...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackupPluginUI;
