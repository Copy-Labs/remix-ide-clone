import React, { useEffect } from 'react';
import { useGitStore } from '@/stores/gitStore';
import { toast } from 'sonner';

// Define keyboard shortcuts for Git operations
const GIT_SHORTCUTS = {
  COMMIT: 'ctrl+g ctrl+c', // or 'meta+g meta+c' for Mac
  PUSH: 'ctrl+g ctrl+p', // or 'meta+g meta+p' for Mac
  PULL: 'ctrl+g ctrl+l', // or 'meta+g meta+l' for Mac
  STAGE_ALL: 'ctrl+g ctrl+a', // or 'meta+g meta+a' for Mac
  UNSTAGE_ALL: 'ctrl+g ctrl+u', // or 'meta+g meta+u' for Mac
  SWITCH_BRANCH: 'ctrl+g ctrl+b', // or 'meta+g meta+b' for Mac
  REFRESH: 'ctrl+g ctrl+r', // or 'meta+g meta+r' for Mac
};

// Helper to detect Mac OS
const isMac =
  typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

// Convert shortcuts to platform-specific format
const getPlatformShortcut = (shortcut: string): string => {
  return isMac ? shortcut.replace(/ctrl/g, 'meta') : shortcut;
};

interface GitKeyboardShortcutsProps {
  onCommit?: () => void;
  onSwitchBranch?: () => void;
}

const GitKeyboardShortcuts: React.FC<GitKeyboardShortcutsProps> = ({
  onCommit,
  onSwitchBranch,
}) => {
  const { addAllFiles, getStatus, getBranches, getCommits, isLoading } = useGitStore();

  useEffect(() => {
    // Track key sequences
    let keySequence: string[] = [];
    let keyTimeout: NodeJS.Timeout | null = null;

    const resetKeySequence = () => {
      keySequence = [];
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      // Clear timeout if it exists
      if (keyTimeout) {
        clearTimeout(keyTimeout);
      }

      // Set a new timeout to reset the key sequence after 1 second
      keyTimeout = setTimeout(resetKeySequence, 1000);

      // Get the key pressed
      let key = event.key.toLowerCase();

      // Add modifier keys
      if (event.ctrlKey) key = 'ctrl+' + key;
      if (event.metaKey) key = 'meta+' + key;

      // Add to sequence
      keySequence.push(key);

      // Convert sequence to string
      const sequence = keySequence.join(' ');

      // Check if sequence matches any shortcuts
      const platformShortcuts = Object.entries(GIT_SHORTCUTS).reduce(
        (acc, [action, shortcut]) => {
          acc[action] = getPlatformShortcut(shortcut);
          return acc;
        },
        {} as Record<string, string>,
      );

      // Handle shortcuts
      if (sequence === platformShortcuts.COMMIT && onCommit) {
        event.preventDefault();
        onCommit();
        resetKeySequence();
        toast.info('Commit dialog opened');
      } else if (sequence === platformShortcuts.STAGE_ALL && !isLoading) {
        event.preventDefault();
        addAllFiles();
        resetKeySequence();
        toast.info('Staging all files...');
      } else if (sequence === platformShortcuts.REFRESH && !isLoading) {
        event.preventDefault();
        getStatus();
        getBranches();
        getCommits(50);
        resetKeySequence();
        toast.info('Refreshing Git status...');
      } else if (sequence === platformShortcuts.SWITCH_BRANCH && onSwitchBranch) {
        event.preventDefault();
        onSwitchBranch();
        resetKeySequence();
        toast.info('Branch switcher opened');
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyDown);

    // Remove event listener on cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (keyTimeout) {
        clearTimeout(keyTimeout);
      }
    };
  }, [addAllFiles, getStatus, getBranches, getCommits, isLoading, onCommit, onSwitchBranch]);

  // This component doesn't render anything
  return null;
};

export default GitKeyboardShortcuts;
