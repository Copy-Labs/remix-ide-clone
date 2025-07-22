import React from 'react';
import { type GitFileBlame, useGitStore } from '@/stores/gitStore';

interface GitBlameGutterProps {
  filePath: string;
  lineCount: number;
  scrollTop: number;
  lineHeight: number;
  visible: boolean;
}

const GitBlameGutter: React.FC<GitBlameGutterProps> = ({
  filePath,
  lineCount,
  scrollTop,
  lineHeight,
  visible,
}) => {
  const { fileBlame } = useGitStore();

  if (!visible) return null;

  const blame = fileBlame[filePath] || [];

  // Calculate which lines are visible based on scroll position
  const startLine = Math.floor(scrollTop / lineHeight);
  const visibleLines = Math.ceil(window.innerHeight / lineHeight);
  const endLine = startLine + visibleLines;

  // Filter blame data to only include visible lines
  const visibleBlame = blame.filter((line) => line.line >= startLine && line.line <= endLine);

  // Group consecutive lines by the same commit
  const groupedBlame: {
    commit: GitFileBlame['commit'];
    startLine: number;
    endLine: number;
    lineCount: number;
  }[] = [];

  let currentGroup: (typeof groupedBlame)[0] | null = null;

  visibleBlame.forEach((line) => {
    if (!currentGroup || currentGroup.commit.oid !== line.commit.oid) {
      // Start a new group
      if (currentGroup) {
        groupedBlame.push(currentGroup);
      }

      currentGroup = {
        commit: line.commit,
        startLine: line.line,
        endLine: line.line,
        lineCount: 1,
      };
    } else {
      // Extend the current group
      currentGroup.endLine = line.line;
      currentGroup.lineCount++;
    }
  });

  // Add the last group
  if (currentGroup) {
    groupedBlame.push(currentGroup);
  }

  return (
    <div className="absolute left-0 top-0 bottom-0 w-48 bg-gray-100 dark:bg-gray-800 border-r border-gray-300 dark:border-gray-600 overflow-hidden z-10">
      {groupedBlame.map((group, index) => {
        const topPosition = (group.startLine - 1) * lineHeight;
        const height = group.lineCount * lineHeight;

        // Format the date
        const date = new Date(group.commit.author.timestamp * 1000);
        const formattedDate = date.toLocaleDateString();

        // Truncate the commit message
        const shortMessage =
          group.commit.message.length > 30
            ? group.commit.message.substring(0, 27) + '...'
            : group.commit.message;

        // Truncate the commit hash
        const shortHash = group.commit.oid.substring(0, 7);

        return (
          <div
            key={`${group.commit.oid}-${group.startLine}`}
            className="absolute left-0 right-0 px-2 py-1 text-xs border-b border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700"
            style={{
              top: `${topPosition}px`,
              height: `${height}px`,
              overflow: 'hidden',
            }}
            title={`${group.commit.message}\n\nAuthor: ${group.commit.author.name}\nDate: ${formattedDate}\nCommit: ${group.commit.oid}`}
          >
            <div className="font-medium truncate">{group.commit.author.name}</div>
            <div className="text-gray-500 dark:text-gray-400 truncate">{formattedDate}</div>
            <div className="truncate">{shortMessage}</div>
            <div className="text-gray-500 dark:text-gray-400">{shortHash}</div>
          </div>
        );
      })}
    </div>
  );
};

export default GitBlameGutter;
