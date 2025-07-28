import React from 'react';
import {
  LucideFile,
  LucideFolder,
  LucideFolderOpen,
  LucideFileText,
  LucideFileCode,
  LucideFileImage,
  LucideFileVideo,
  LucideFileAudio,
  LucideFileArchive,
  LucideSettings,
  LucideDatabase,
  LucideGitBranch,
  LucidePackage,
  LucideFileJson,
  LucideFileSpreadsheet,
  LucideFileType,
} from 'lucide-react';

export interface FileTypeIconProps {
  fileName: string;
  fileType: 'file' | 'folder';
  isExpanded?: boolean;
  size?: number;
  className?: string;
}

// File extension to icon mapping
const fileExtensionIcons: Record<string, React.ComponentType<any>> = {
  // Code files
  js: LucideFileCode,
  jsx: LucideFileCode,
  ts: LucideFileCode,
  tsx: LucideFileCode,
  py: LucideFileCode,
  java: LucideFileCode,
  cpp: LucideFileCode,
  c: LucideFileCode,
  cs: LucideFileCode,
  php: LucideFileCode,
  rb: LucideFileCode,
  go: LucideFileCode,
  rs: LucideFileCode,
  swift: LucideFileCode,
  kt: LucideFileCode,
  scala: LucideFileCode,
  sol: LucideFileCode, // Solidity
  vy: LucideFileCode, // Vyper

  // Web files
  html: LucideFileCode,
  htm: LucideFileCode,
  css: LucideFileCode,
  scss: LucideFileCode,
  sass: LucideFileCode,
  less: LucideFileCode,
  vue: LucideFileCode,
  svelte: LucideFileCode,

  // Config files
  json: LucideFileJson,
  xml: LucideFileCode,
  yaml: LucideSettings,
  yml: LucideSettings,
  toml: LucideSettings,
  ini: LucideSettings,
  conf: LucideSettings,
  config: LucideSettings,
  env: LucideSettings,

  // Text files
  txt: LucideFileText,
  md: LucideFileText,
  markdown: LucideFileText,
  rst: LucideFileText,
  rtf: LucideFileText,
  doc: LucideFileText,
  docx: LucideFileText,

  // Spreadsheet files
  csv: LucideFileSpreadsheet,
  xls: LucideFileSpreadsheet,
  xlsx: LucideFileSpreadsheet,
  ods: LucideFileSpreadsheet,

  // PDF files
  pdf: LucideFileType,

  // Image files
  jpg: LucideFileImage,
  jpeg: LucideFileImage,
  png: LucideFileImage,
  gif: LucideFileImage,
  svg: LucideFileImage,
  webp: LucideFileImage,
  ico: LucideFileImage,
  bmp: LucideFileImage,
  tiff: LucideFileImage,

  // Video files
  mp4: LucideFileVideo,
  avi: LucideFileVideo,
  mov: LucideFileVideo,
  wmv: LucideFileVideo,
  flv: LucideFileVideo,
  webm: LucideFileVideo,
  mkv: LucideFileVideo,

  // Audio files
  mp3: LucideFileAudio,
  wav: LucideFileAudio,
  flac: LucideFileAudio,
  aac: LucideFileAudio,
  ogg: LucideFileAudio,
  wma: LucideFileAudio,

  // Archive files
  zip: LucideFileArchive,
  rar: LucideFileArchive,
  '7z': LucideFileArchive,
  tar: LucideFileArchive,
  gz: LucideFileArchive,
  bz2: LucideFileArchive,

  // Database files
  db: LucideDatabase,
  sqlite: LucideDatabase,
  sql: LucideDatabase,

  // Package files
  npm: LucidePackage,
  yarn: LucidePackage,
  package: LucidePackage,

  // Git files
  git: LucideGitBranch,
  gitignore: LucideGitBranch,
  gitattributes: LucideGitBranch,
};

// Special file name patterns
const specialFilePatterns: Array<{ pattern: RegExp; icon: React.ComponentType<any> }> = [
  { pattern: /^\.git/, icon: LucideGitBranch },
  { pattern: /^package\.json$/, icon: LucidePackage },
  { pattern: /^yarn\.lock$/, icon: LucidePackage },
  { pattern: /^package-lock\.json$/, icon: LucidePackage },
  { pattern: /^pnpm-lock\.yaml$/, icon: LucidePackage },
  { pattern: /^\.env/, icon: LucideSettings },
  { pattern: /^\.eslint/, icon: LucideSettings },
  { pattern: /^\.prettier/, icon: LucideSettings },
  { pattern: /^tsconfig\.json$/, icon: LucideSettings },
  { pattern: /^vite\.config/, icon: LucideSettings },
  { pattern: /^webpack\.config/, icon: LucideSettings },
  { pattern: /^rollup\.config/, icon: LucideSettings },
  { pattern: /^babel\.config/, icon: LucideSettings },
  { pattern: /^jest\.config/, icon: LucideSettings },
  { pattern: /^tailwind\.config/, icon: LucideSettings },
  { pattern: /^postcss\.config/, icon: LucideSettings },
  { pattern: /^dockerfile$/i, icon: LucidePackage },
  { pattern: /^docker-compose/, icon: LucidePackage },
  { pattern: /^readme/i, icon: LucideFileText },
  { pattern: /^license/i, icon: LucideFileText },
  { pattern: /^changelog/i, icon: LucideFileText },
];

export const getFileTypeIcon = (
  fileName: string,
  fileType: 'file' | 'folder',
  isExpanded?: boolean,
): React.ComponentType<any> => {
  if (fileType === 'folder') {
    return isExpanded ? LucideFolderOpen : LucideFolder;
  }

  // Check special file patterns first
  for (const { pattern, icon } of specialFilePatterns) {
    if (pattern.test(fileName)) {
      return icon;
    }
  }

  // Get file extension
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (extension && fileExtensionIcons[extension]) {
    return fileExtensionIcons[extension];
  }

  // Default file icon
  return LucideFile;
};

export const FileTypeIcon: React.FC<FileTypeIconProps> = ({
  fileName,
  fileType,
  isExpanded = false,
  size = 16,
  className = '',
}) => {
  const IconComponent = getFileTypeIcon(fileName, fileType, isExpanded);

  return <IconComponent size={size} className={className} />;
};

// Utility function to get file type category for styling
export const getFileTypeCategory = (fileName: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase();

  if (!extension) return 'unknown';

  const categories: Record<string, string[]> = {
    code: [
      'js',
      'jsx',
      'ts',
      'tsx',
      'py',
      'java',
      'cpp',
      'c',
      'cs',
      'php',
      'rb',
      'go',
      'rs',
      'swift',
      'kt',
      'scala',
      'sol',
      'vy',
      'html',
      'htm',
      'css',
      'scss',
      'sass',
      'less',
      'vue',
      'svelte',
    ],
    config: ['json', 'xml', 'yaml', 'yml', 'toml', 'ini', 'conf', 'config', 'env'],
    text: ['txt', 'md', 'markdown', 'rst', 'rtf', 'doc', 'docx'],
    spreadsheet: ['csv', 'xls', 'xlsx', 'ods'],
    pdf: ['pdf'],
    image: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico', 'bmp', 'tiff'],
    video: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'],
    audio: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'],
    archive: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'],
    database: ['db', 'sqlite', 'sql'],
    package: ['npm', 'yarn', 'package'],
  };

  for (const [category, extensions] of Object.entries(categories)) {
    if (extensions.includes(extension)) {
      return category;
    }
  }

  return 'unknown';
};

export default FileTypeIcon;
