import React, { useState, useEffect } from 'react';
import { usePluginStore } from '@/stores/pluginStore';
import { useFileStore } from '@/stores/fileStore';
import { CollaborationPluginImplementation } from '@/plugins/collaborationPlugin';

interface CollaborationPluginUIProps {
  pluginId: string;
}

const CollaborationPluginUI: React.FC<CollaborationPluginUIProps> = ({ pluginId }) => {
  const { getPlugin, updatePluginConfig } = usePluginStore();
  const { files } = useFileStore();

  const [implementation, setImplementation] = useState<CollaborationPluginImplementation | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [sharedFiles, setSharedFiles] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [comments, setComments] = useState<Map<string, any[]>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  // Form states
  const [selectedFile, setSelectedFile] = useState('');
  const [shareVisibility, setShareVisibility] = useState<'private' | 'public' | 'shared'>('private');
  const [sharedWithUsers, setSharedWithUsers] = useState<string[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newSessionName, setNewSessionName] = useState('');
  const [sessionFiles, setSessionFiles] = useState<string[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentFile, setCommentFile] = useState('');
  const [commentLine, setCommentLine] = useState<number>(1);

  // Config options
  const [sharingEnabled, setSharingEnabled] = useState(true);
  const [realTimeEditingEnabled, setRealTimeEditingEnabled] = useState(true);
  const [commentingEnabled, setCommentingEnabled] = useState(true);
  const [defaultVisibility, setDefaultVisibility] = useState<'private' | 'public' | 'shared'>('private');
  const [serverUrl, setServerUrl] = useState('https://collaboration-server.example.com');
  const [autoSyncInterval, setAutoSyncInterval] = useState(30);
  const [notifyOnComment, setNotifyOnComment] = useState(true);
  const [notifyOnShare, setNotifyOnShare] = useState(true);
  const [notifyOnJoin, setNotifyOnJoin] = useState(true);
  const [notifyOnLeave, setNotifyOnLeave] = useState(true);

  // Initialize the implementation when the component mounts
  useEffect(() => {
    const plugin = getPlugin(pluginId);
    if (plugin) {
      const impl = new CollaborationPluginImplementation(plugin.config);
      setImplementation(impl);

      // Load config values
      setSharingEnabled(plugin.config.sharingEnabled || true);
      setRealTimeEditingEnabled(plugin.config.realTimeEditingEnabled || true);
      setCommentingEnabled(plugin.config.commentingEnabled || true);
      setDefaultVisibility(plugin.config.defaultVisibility || 'private');
      setServerUrl(plugin.config.serverUrl || 'https://collaboration-server.example.com');
      setAutoSyncInterval(plugin.config.autoSyncInterval || 30);
      setNotifyOnComment(plugin.config.notifications?.commentAdded || true);
      setNotifyOnShare(plugin.config.notifications?.fileShared || true);
      setNotifyOnJoin(plugin.config.notifications?.collaboratorJoined || true);
      setNotifyOnLeave(plugin.config.notifications?.collaboratorLeft || true);

      // Set initial share visibility from config
      setShareVisibility(plugin.config.defaultVisibility || 'private');

      // Load current user, shared files, sessions, and comments
      loadCollaborationData(impl);
    }
  }, [pluginId, getPlugin]);

  // Load collaboration data
  const loadCollaborationData = async (impl: CollaborationPluginImplementation | null = implementation) => {
    if (!impl) return;

    setIsLoading(true);
    setError(null);

    try {
      // Get current user
      const user = impl.getCurrentUser();
      setCurrentUser(user);

      // Get shared files
      const files = impl.getAllSharedFiles();
      setSharedFiles(files);

      // Get sessions
      const sessions = impl.getSessions();
      setSessions(sessions);

      // Get active session
      const activeSession = impl.getActiveSession();
      setActiveSession(activeSession);

      // Get comments for each file
      const commentsMap = new Map<string, any[]>();
      for (const [path, file] of files.entries()) {
        if (file.type === 'file') {
          const fileComments = await impl.getComments(path);
          if (fileComments.length > 0) {
            commentsMap.set(path, fileComments);
          }
        }
      }
      setComments(commentsMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load collaboration data');
    } finally {
      setIsLoading(false);
    }
  };

  // Configure user
  const handleConfigureUser = async () => {
    if (!implementation || !newUsername || !newEmail) return;

    setIsLoading(true);
    setError(null);

    try {
      implementation.setCurrentUser({
        username: newUsername,
        email: newEmail,
      });

      // Refresh user data
      const user = implementation.getCurrentUser();
      setCurrentUser(user);

      // Clear form
      setNewUsername('');
      setNewEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to configure user');
    } finally {
      setIsLoading(false);
    }
  };

  // Share a file
  const handleShareFile = async () => {
    if (!implementation || !selectedFile) return;

    setIsLoading(true);
    setError(null);

    try {
      const sharedFile = await implementation.shareFile(
        selectedFile,
        shareVisibility,
        shareVisibility === 'shared' ? sharedWithUsers : []
      );

      // Refresh shared files
      const files = impl.getAllSharedFiles();
      setSharedFiles(files);

      // Clear form
      setSelectedFile('');
      setShareVisibility(defaultVisibility);
      setSharedWithUsers([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share file');
    } finally {
      setIsLoading(false);
    }
  };

  // Stop sharing a file
  const handleStopSharing = async (filePath: string) => {
    if (!implementation) return;

    setIsLoading(true);
    setError(null);

    try {
      await implementation.stopSharing(filePath);

      // Refresh shared files
      const files = implementation.getAllSharedFiles();
      setSharedFiles(files);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to stop sharing file: ${filePath}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new session
  const handleCreateSession = async () => {
    if (!implementation || !newSessionName || sessionFiles.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const session = await implementation.createSession(newSessionName, sessionFiles);

      // Refresh sessions
      const sessions = implementation.getSessions();
      setSessions(sessions);

      // Set active session
      setActiveSession(session);

      // Clear form
      setNewSessionName('');
      setSessionFiles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      setIsLoading(false);
    }
  };

  // Join a session
  const handleJoinSession = async (sessionId: string) => {
    if (!implementation) return;

    setIsLoading(true);
    setError(null);

    try {
      const session = await implementation.joinSession(sessionId);

      // Refresh sessions
      const sessions = implementation.getSessions();
      setSessions(sessions);

      // Set active session
      setActiveSession(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to join session: ${sessionId}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Leave a session
  const handleLeaveSession = async (sessionId: string) => {
    if (!implementation) return;

    setIsLoading(true);
    setError(null);

    try {
      await implementation.leaveSession(sessionId);

      // Refresh sessions
      const sessions = implementation.getSessions();
      setSessions(sessions);

      // Clear active session if it was the one we left
      if (activeSession && activeSession.id === sessionId) {
        setActiveSession(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to leave session: ${sessionId}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Add a comment
  const handleAddComment = async () => {
    if (!implementation || !commentFile || !newComment) return;

    setIsLoading(true);
    setError(null);

    try {
      const comment = await implementation.addComment(commentFile, commentLine, newComment);

      // Refresh comments for this file
      const fileComments = await implementation.getComments(commentFile);

      // Update comments map
      setComments(prev => {
        const newMap = new Map(prev);
        newMap.set(commentFile, fileComments);
        return newMap;
      });

      // Clear form
      setNewComment('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment');
    } finally {
      setIsLoading(false);
    }
  };

  // Resolve a comment
  const handleResolveComment = async (filePath: string, commentId: string, resolved: boolean) => {
    if (!implementation) return;

    setIsLoading(true);
    setError(null);

    try {
      await implementation.resolveComment(filePath, commentId, resolved);

      // Refresh comments for this file
      const fileComments = await implementation.getComments(filePath);

      // Update comments map
      setComments(prev => {
        const newMap = new Map(prev);
        newMap.set(filePath, fileComments);
        return newMap;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve comment');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a comment
  const handleDeleteComment = async (filePath: string, commentId: string) => {
    if (!implementation) return;

    setIsLoading(true);
    setError(null);

    try {
      await implementation.deleteComment(filePath, commentId);

      // Refresh comments for this file
      const fileComments = await implementation.getComments(filePath);

      // Update comments map
      setComments(prev => {
        const newMap = new Map(prev);
        if (fileComments.length > 0) {
          newMap.set(filePath, fileComments);
        } else {
          newMap.delete(filePath);
        }
        return newMap;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete comment');
    } finally {
      setIsLoading(false);
    }
  };

  // Save configuration
  const handleSaveConfig = () => {
    if (!implementation) return;

    const config = {
      sharingEnabled,
      realTimeEditingEnabled,
      commentingEnabled,
      defaultVisibility,
      serverUrl,
      autoSyncInterval,
      notifications: {
        commentAdded: notifyOnComment,
        fileShared: notifyOnShare,
        collaboratorJoined: notifyOnJoin,
        collaboratorLeft: notifyOnLeave,
      },
    };

    updatePluginConfig(pluginId, config);

    // Update implementation config
    implementation.updateConfig(config);

    setShowConfig(false);
  };

  // Toggle file in session files
  const toggleFileInSession = (filePath: string) => {
    setSessionFiles(prev =>
      prev.includes(filePath)
        ? prev.filter(path => path !== filePath)
        : [...prev, filePath]
    );
  };

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Collaboration & Sharing</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}

      {/* User Profile */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">User Profile</h3>
        <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded">
          {currentUser ? (
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white text-xl font-bold mr-4">
                {currentUser.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 className="font-medium">{currentUser.username}</h4>
                {currentUser.email && <p className="text-sm text-gray-500">{currentUser.email}</p>}
                <p className="text-sm">
                  <span className={`inline-block w-2 h-2 rounded-full mr-1 ${currentUser.isOnline ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                  {currentUser.isOnline ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 mb-4">No user profile set up yet.</p>
          )}

          {/* User Form */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">Update Profile</h4>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="block text-sm font-medium mb-1">Username</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Enter email"
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
            <button
              onClick={handleConfigureUser}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={isLoading || !newUsername || !newEmail}
            >
              Update Profile
            </button>
          </div>
        </div>
      </div>

      {/* File Sharing */}
      {sharingEnabled && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">File Sharing</h3>

          {/* Shared Files */}
          {sharedFiles.length > 0 ? (
            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded mb-4">
              <h4 className="font-medium mb-2">Shared Files</h4>
              <div className="space-y-3">
                {sharedFiles.map(file => (
                  <div key={file.id} className="bg-white dark:bg-gray-800 p-3 rounded border">
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="font-medium">{file.filePath}</h5>
                        <div className="flex items-center mt-1">
                          <span className={`px-2 py-1 text-xs rounded mr-2 ${
                            file.visibility === 'private' 
                              ? 'bg-gray-100 text-gray-800' 
                              : file.visibility === 'public' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-blue-100 text-blue-800'
                          }`}>
                            {file.visibility.charAt(0).toUpperCase() + file.visibility.slice(1)}
                          </span>
                          <span className="text-sm text-gray-500">
                            Shared {formatDate(file.createdAt)}
                          </span>
                        </div>
                        {file.visibility === 'shared' && file.sharedWith.length > 0 && (
                          <p className="text-sm mt-1">
                            Shared with: {file.sharedWith.length} users
                          </p>
                        )}
                        {file.shareUrl && (
                          <div className="mt-2">
                            <input
                              type="text"
                              value={file.shareUrl}
                              readOnly
                              className="w-full p-1 text-sm border rounded bg-gray-50"
                              onClick={(e) => (e.target as HTMLInputElement).select()}
                            />
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleStopSharing(file.filePath)}
                        className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                        disabled={isLoading}
                      >
                        Stop Sharing
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded mb-4 text-center">
              <p className="text-gray-600 dark:text-gray-400">No files shared yet.</p>
            </div>
          )}

          {/* Share File Form */}
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded">
            <h4 className="font-medium mb-2">Share a File</h4>
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">File</label>
              <select
                value={selectedFile}
                onChange={(e) => setSelectedFile(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="">Select a file</option>
                {Array.from(files.entries())
                  .filter(([_, file]) => file.type === 'file')
                  .map(([path]) => (
                    <option key={path} value={path}>{path}</option>
                  ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Visibility</label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={shareVisibility === 'private'}
                    onChange={() => setShareVisibility('private')}
                    className="mr-2"
                  />
                  Private
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={shareVisibility === 'public'}
                    onChange={() => setShareVisibility('public')}
                    className="mr-2"
                  />
                  Public
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={shareVisibility === 'shared'}
                    onChange={() => setShareVisibility('shared')}
                    className="mr-2"
                  />
                  Shared with specific users
                </label>
              </div>
            </div>

            {shareVisibility === 'shared' && (
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Share with Users</label>
                <div className="bg-white dark:bg-gray-800 p-3 rounded border">
                  <p className="text-gray-500 dark:text-gray-400">
                    In a real implementation, this would show a list of users to share with.
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={handleShareFile}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={isLoading || !selectedFile}
            >
              Share File
            </button>
          </div>
        </div>
      )}

      {/* Collaboration Sessions */}
      {realTimeEditingEnabled && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Collaboration Sessions</h3>

          {/* Active Session */}
          {activeSession && (
            <div className="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-800 p-4 rounded mb-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">Active Session: {activeSession.name}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Created {formatDate(activeSession.createdAt)}
                  </p>
                  <div className="mt-2">
                    <h5 className="text-sm font-medium">Participants ({activeSession.participants.length}):</h5>
                    <div className="flex flex-wrap mt-1">
                      {activeSession.participants.map((user: any) => (
                        <div key={user.id} className="flex items-center mr-3 mb-1">
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold mr-1">
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm">{user.username}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-2">
                    <h5 className="text-sm font-medium">Files ({activeSession.files.length}):</h5>
                    <ul className="list-disc list-inside mt-1">
                      {activeSession.files.map((file: string) => (
                        <li key={file} className="text-sm">{file}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <button
                  onClick={() => handleLeaveSession(activeSession.id)}
                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                  disabled={isLoading}
                >
                  Leave Session
                </button>
              </div>
            </div>
          )}

          {/* Available Sessions */}
          {sessions.length > 0 && (
            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded mb-4">
              <h4 className="font-medium mb-2">Available Sessions</h4>
              <div className="space-y-3">
                {sessions
                  .filter(session => session.active && (!activeSession || session.id !== activeSession.id))
                  .map(session => (
                    <div key={session.id} className="bg-white dark:bg-gray-800 p-3 rounded border">
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="font-medium">{session.name}</h5>
                          <p className="text-sm text-gray-500">
                            Created by {session.participants.find((p: any) => p.id === session.ownerId)?.username || 'Unknown'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {session.participants.length} participants • {session.files.length} files
                          </p>
                        </div>
                        <button
                          onClick={() => handleJoinSession(session.id)}
                          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                          disabled={isLoading}
                        >
                          Join Session
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Create Session Form */}
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded">
            <h4 className="font-medium mb-2">Create Collaboration Session</h4>
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Session Name</label>
              <input
                type="text"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                placeholder="Enter session name"
                className="w-full p-2 border rounded"
              />
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Files to Include</label>
              <div className="bg-white dark:bg-gray-800 p-3 rounded border max-h-40 overflow-y-auto">
                {Array.from(files.entries())
                  .filter(([_, file]) => file.type === 'file')
                  .map(([path]) => (
                    <label key={path} className="flex items-center mb-1">
                      <input
                        type="checkbox"
                        checked={sessionFiles.includes(path)}
                        onChange={() => toggleFileInSession(path)}
                        className="mr-2"
                      />
                      {path}
                    </label>
                  ))}
              </div>
            </div>

            <button
              onClick={handleCreateSession}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={isLoading || !newSessionName || sessionFiles.length === 0}
            >
              Create Session
            </button>
          </div>
        </div>
      )}

      {/* Comments */}
      {commentingEnabled && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Comments</h3>

          {/* Existing Comments */}
          {Array.from(comments.entries()).length > 0 ? (
            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded mb-4">
              <h4 className="font-medium mb-2">File Comments</h4>
              <div className="space-y-4">
                {Array.from(comments.entries()).map(([filePath, fileComments]) => (
                  <div key={filePath} className="bg-white dark:bg-gray-800 p-3 rounded border">
                    <h5 className="font-medium mb-2">{filePath}</h5>
                    <div className="space-y-3">
                      {fileComments.map(comment => (
                        <div
                          key={comment.id}
                          className={`p-2 rounded ${
                            comment.resolved 
                              ? 'bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-800' 
                              : 'bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-800'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center">
                                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2">
                                  {comment.username.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-medium">{comment.username}</span>
                                <span className="mx-2 text-gray-500">•</span>
                                <span className="text-sm text-gray-500">Line {comment.lineNumber}</span>
                              </div>
                              <p className="mt-1">{comment.content}</p>
                              <div className="text-xs text-gray-500 mt-1">
                                {formatDate(comment.createdAt)}
                                {comment.updatedAt && comment.updatedAt !== comment.createdAt && (
                                  <span> (edited)</span>
                                )}
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleResolveComment(filePath, comment.id, !comment.resolved)}
                                className={`px-2 py-1 text-xs rounded ${
                                  comment.resolved 
                                    ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' 
                                    : 'bg-green-100 text-green-800 hover:bg-green-200'
                                }`}
                                disabled={isLoading}
                              >
                                {comment.resolved ? 'Unresolve' : 'Resolve'}
                              </button>
                              {comment.userId === currentUser?.id && (
                                <button
                                  onClick={() => handleDeleteComment(filePath, comment.id)}
                                  className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200"
                                  disabled={isLoading}
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Replies */}
                          {comment.replies.length > 0 && (
                            <div className="mt-2 pl-8 space-y-2">
                              {comment.replies.map(reply => (
                                <div
                                  key={reply.id}
                                  className="p-2 rounded bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                                >
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <div className="flex items-center">
                                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2">
                                          {reply.username.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="font-medium">{reply.username}</span>
                                      </div>
                                      <p className="mt-1">{reply.content}</p>
                                      <div className="text-xs text-gray-500 mt-1">
                                        {formatDate(reply.createdAt)}
                                      </div>
                                    </div>
                                    {reply.userId === currentUser?.id && (
                                      <button
                                        onClick={() => handleDeleteComment(filePath, reply.id)}
                                        className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200"
                                        disabled={isLoading}
                                      >
                                        Delete
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded mb-4 text-center">
              <p className="text-gray-600 dark:text-gray-400">No comments yet.</p>
            </div>
          )}

          {/* Add Comment Form */}
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded">
            <h4 className="font-medium mb-2">Add Comment</h4>
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">File</label>
              <select
                value={commentFile}
                onChange={(e) => setCommentFile(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="">Select a file</option>
                {Array.from(files.entries())
                  .filter(([_, file]) => file.type === 'file')
                  .map(([path]) => (
                    <option key={path} value={path}>{path}</option>
                  ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Line Number</label>
              <input
                type="number"
                value={commentLine}
                onChange={(e) => setCommentLine(parseInt(e.target.value) || 1)}
                className="w-full p-2 border rounded"
                min="1"
              />
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Comment</label>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Enter your comment"
                className="w-full p-2 border rounded"
                rows={3}
              />
            </div>

            <button
              onClick={handleAddComment}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={isLoading || !commentFile || !newComment}
            >
              Add Comment
            </button>
          </div>
        </div>
      )}

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
                  checked={sharingEnabled}
                  onChange={(e) => setSharingEnabled(e.target.checked)}
                  className="mr-2"
                />
                Enable File Sharing
              </label>
            </div>

            <div className="mb-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={realTimeEditingEnabled}
                  onChange={(e) => setRealTimeEditingEnabled(e.target.checked)}
                  className="mr-2"
                />
                Enable Real-time Editing
              </label>
            </div>

            <div className="mb-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={commentingEnabled}
                  onChange={(e) => setCommentingEnabled(e.target.checked)}
                  className="mr-2"
                />
                Enable Commenting
              </label>
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Default Visibility</label>
              <select
                value={defaultVisibility}
                onChange={(e) => setDefaultVisibility(e.target.value as 'private' | 'public' | 'shared')}
                className="w-full p-2 border rounded"
              >
                <option value="private">Private</option>
                <option value="public">Public</option>
                <option value="shared">Shared</option>
              </select>
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Server URL</label>
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Auto-sync Interval (seconds)</label>
              <input
                type="number"
                value={autoSyncInterval}
                onChange={(e) => setAutoSyncInterval(parseInt(e.target.value) || 30)}
                className="w-full p-2 border rounded"
                min="5"
              />
            </div>

            <div className="mb-3">
              <h4 className="font-medium mb-1">Notifications</h4>
              <div className="space-y-1">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={notifyOnComment}
                    onChange={(e) => setNotifyOnComment(e.target.checked)}
                    className="mr-2"
                  />
                  Notify when comments are added
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={notifyOnShare}
                    onChange={(e) => setNotifyOnShare(e.target.checked)}
                    className="mr-2"
                  />
                  Notify when files are shared
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={notifyOnJoin}
                    onChange={(e) => setNotifyOnJoin(e.target.checked)}
                    className="mr-2"
                  />
                  Notify when collaborators join
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={notifyOnLeave}
                    onChange={(e) => setNotifyOnLeave(e.target.checked)}
                    className="mr-2"
                  />
                  Notify when collaborators leave
                </label>
              </div>
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

export default CollaborationPluginUI;
