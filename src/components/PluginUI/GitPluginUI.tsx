import React, { useState, useEffect } from 'react';
import { useFileStore } from '@/stores/fileStore';
import { usePluginStore } from '@/stores/pluginStore';
import { GitPluginImplementation } from '@/plugins/gitPlugin';

interface GitPluginUIProps {
  pluginId: string;
}

const GitPluginUI: React.FC<GitPluginUIProps> = ({ pluginId }) => {
  const { getPlugin, updatePluginConfig } = usePluginStore();
  const { files } = useFileStore();

  const [implementation, setImplementation] = useState<GitPluginImplementation | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [commitMessage, setCommitMessage] = useState('');
  const [branchName, setBranchName] = useState('');
  const [remoteUrl, setRemoteUrl] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize the implementation when the component mounts
  useEffect(() => {
    const plugin = getPlugin(pluginId);
    if (plugin) {
      const impl = new GitPluginImplementation(plugin.config);
      setImplementation(impl);

      // Load initial values from config
      setRemoteUrl(plugin.config.remoteUrl || '');
      setUsername(plugin.config.username || '');
      setEmail(plugin.config.email || '');

      // Get initial status
      refreshStatus(impl);
    }
  }, [pluginId, getPlugin]);

  // Refresh the Git status
  const refreshStatus = async (impl: GitPluginImplementation | null = implementation) => {
    if (!impl) return;

    setIsLoading(true);
    setError(null);

    try {
      const status = await impl.getStatus();
      setStatus(status);
      setBranchName(status.branch);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get Git status');
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize repository
  const handleInitRepository = async () => {
    if (!implementation) return;

    setIsLoading(true);
    setError(null);

    try {
      await implementation.initRepository();
      await refreshStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize repository');
    } finally {
      setIsLoading(false);
    }
  };

  // Add files to staging
  const handleAddFiles = async () => {
    if (!implementation || selectedFiles.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      await implementation.addFiles(selectedFiles);
      await refreshStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add files');
    } finally {
      setIsLoading(false);
    }
  };

  // Commit changes
  const handleCommit = async () => {
    if (!implementation || !commitMessage) return;

    setIsLoading(true);
    setError(null);

    try {
      await implementation.commit(commitMessage);
      setCommitMessage('');
      await refreshStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to commit changes');
    } finally {
      setIsLoading(false);
    }
  };

  // Push changes
  const handlePush = async () => {
    if (!implementation) return;

    setIsLoading(true);
    setError(null);

    try {
      await implementation.push();
      await refreshStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to push changes');
    } finally {
      setIsLoading(false);
    }
  };

  // Pull changes
  const handlePull = async () => {
    if (!implementation) return;

    setIsLoading(true);
    setError(null);

    try {
      await implementation.pull();
      await refreshStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pull changes');
    } finally {
      setIsLoading(false);
    }
  };

  // Create branch
  const handleCreateBranch = async () => {
    if (!implementation || !branchName) return;

    setIsLoading(true);
    setError(null);

    try {
      await implementation.createBranch(branchName);
      await implementation.switchBranch(branchName);
      await refreshStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create branch');
    } finally {
      setIsLoading(false);
    }
  };

  // Configure user
  const handleConfigureUser = async () => {
    if (!implementation || !username || !email) return;

    setIsLoading(true);
    setError(null);

    try {
      await implementation.configureUser(username, email);

      // Update plugin config
      const plugin = getPlugin(pluginId);
      if (plugin) {
        updatePluginConfig(pluginId, {
          ...plugin.config,
          username,
          email,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to configure user');
    } finally {
      setIsLoading(false);
    }
  };

  // Configure remote
  const handleConfigureRemote = async () => {
    if (!implementation || !remoteUrl) return;

    setIsLoading(true);
    setError(null);

    try {
      await implementation.configureRemote(remoteUrl);

      // Update plugin config
      const plugin = getPlugin(pluginId);
      if (plugin) {
        updatePluginConfig(pluginId, {
          ...plugin.config,
          remoteUrl,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to configure remote');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle file selection
  const toggleFileSelection = (filePath: string) => {
    setSelectedFiles((prev) =>
      prev.includes(filePath) ? prev.filter((path) => path !== filePath) : [...prev, filePath],
    );
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Git Integration</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}

      {/* Repository Status */}
      <div className="mb-6 bg-gray-100 dark:bg-gray-700 p-4 rounded">
        <h3 className="text-lg font-semibold mb-2">Repository Status</h3>
        {status ? (
          <div>
            <p>
              <span className="font-medium">Branch:</span> {status.branch}
            </p>
            <p>
              <span className="font-medium">Modified:</span> {status.modified.length} files
            </p>
            <p>
              <span className="font-medium">Staged:</span> {status.staged.length} files
            </p>
            <p>
              <span className="font-medium">Untracked:</span> {status.untracked.length} files
            </p>
          </div>
        ) : (
          <p>No repository initialized</p>
        )}
        <button
          onClick={() => refreshStatus()}
          className="mt-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          disabled={isLoading}
        >
          Refresh Status
        </button>
      </div>

      {/* Repository Initialization */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Initialize Repository</h3>
        <button
          onClick={handleInitRepository}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          disabled={isLoading}
        >
          Initialize Git Repository
        </button>
      </div>

      {/* File Selection */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Files</h3>
        <div className="max-h-40 overflow-y-auto border rounded p-2">
          {Array.from(files.entries())
            .filter(([_, file]) => file.type === 'file')
            .map(([path, file]) => (
              <div key={path} className="flex items-center mb-1">
                <input
                  type="checkbox"
                  id={`file-${path}`}
                  checked={selectedFiles.includes(path)}
                  onChange={() => toggleFileSelection(path)}
                  className="mr-2"
                />
                <label htmlFor={`file-${path}`}>{path}</label>
              </div>
            ))}
        </div>
        <button
          onClick={handleAddFiles}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          disabled={isLoading || selectedFiles.length === 0}
        >
          Add Selected Files
        </button>
      </div>

      {/* Commit Changes */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Commit Changes</h3>
        <textarea
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          placeholder="Enter commit message"
          className="w-full p-2 border rounded mb-2"
          rows={3}
        />
        <button
          onClick={handleCommit}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          disabled={isLoading || !commitMessage}
        >
          Commit Changes
        </button>
      </div>

      {/* Push & Pull */}
      <div className="mb-6 flex space-x-2">
        <button
          onClick={handlePush}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          disabled={isLoading}
        >
          Push Changes
        </button>
        <button
          onClick={handlePull}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          disabled={isLoading}
        >
          Pull Changes
        </button>
      </div>

      {/* Branch Management */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Branch Management</h3>
        <div className="flex space-x-2">
          <input
            type="text"
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
            placeholder="Branch name"
            className="flex-1 p-2 border rounded"
          />
          <button
            onClick={handleCreateBranch}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            disabled={isLoading || !branchName}
          >
            Create & Switch
          </button>
        </div>
      </div>

      {/* Configuration */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Configuration</h3>

        <div className="mb-4">
          <h4 className="font-medium mb-1">User Information</h4>
          <div className="flex space-x-2 mb-2">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="flex-1 p-2 border rounded"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="flex-1 p-2 border rounded"
            />
          </div>
          <button
            onClick={handleConfigureUser}
            className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
            disabled={isLoading || !username || !email}
          >
            Save User Info
          </button>
        </div>

        <div>
          <h4 className="font-medium mb-1">Remote Repository</h4>
          <div className="flex space-x-2 mb-2">
            <input
              type="text"
              value={remoteUrl}
              onChange={(e) => setRemoteUrl(e.target.value)}
              placeholder="Remote URL (e.g., https://github.com/user/repo.git)"
              className="flex-1 p-2 border rounded"
            />
          </div>
          <button
            onClick={handleConfigureRemote}
            className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
            disabled={isLoading || !remoteUrl}
          >
            Save Remote
          </button>
        </div>
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

export default GitPluginUI;
