import { databaseService } from '@/services/databaseService';
import { debug, error, info, warn } from '@/services/loggerService';

/**
 * Git LFS (Large File Storage) Service for browser environments
 *
 * This service provides Git LFS functionality for the browser environment:
 * - Detecting LFS pointer files
 * - Storing large binary files in IndexedDB
 * - Replacing large files with LFS pointers when committing
 * - Retrieving large files when checking out
 */
export class GitLFSService {
  // Prefix for LFS files in IndexedDB
  private static readonly LFS_FILE_PREFIX = 'git_lfs_';

  // Size threshold for LFS (files larger than this will be stored in LFS)
  private sizeThreshold: number;

  // File extensions that should always use LFS
  private lfsExtensions: string[];

  constructor(options?: { sizeThreshold?: number; lfsExtensions?: string[] }) {
    // Default size threshold: 5MB
    this.sizeThreshold = options?.sizeThreshold || 5 * 1024 * 1024;

    // Default extensions that should use LFS
    this.lfsExtensions = options?.lfsExtensions || [
      // Images
      '.png',
      '.jpg',
      '.jpeg',
      '.gif',
      '.bmp',
      '.tiff',
      '.webp',
      // Audio
      '.mp3',
      '.wav',
      '.ogg',
      '.flac',
      // Video
      '.mp4',
      '.webm',
      '.avi',
      '.mov',
      '.wmv',
      // Archives
      '.zip',
      '.tar',
      '.gz',
      '.7z',
      '.rar',
      // Documents
      '.pdf',
      '.psd',
      '.ai',
      // Other binary formats
      '.exe',
      '.dll',
      '.so',
      '.dylib',
    ];
  }

  /**
   * Check if a file should be stored in LFS based on size and extension
   * @param filepath File path
   * @param content File content
   * @returns True if the file should be stored in LFS
   */
  shouldUseLFS(filepath: string, content: string | Uint8Array): boolean {
    // Check file extension
    const extension = filepath.substring(filepath.lastIndexOf('.')).toLowerCase();
    if (this.lfsExtensions.includes(extension)) {
      return true;
    }

    // Check file size
    const size =
      typeof content === 'string' ? new TextEncoder().encode(content).length : content.length;

    return size > this.sizeThreshold;
  }

  /**
   * Create an LFS pointer file
   * @param oid Object ID (SHA-256 hash of the file content)
   * @param size File size in bytes
   * @returns LFS pointer file content
   */
  createPointerFile(oid: string, size: number): string {
    return `version https://git-lfs.github.com/spec/v1
oid sha256:${oid}
size ${size}
`;
  }

  /**
   * Check if a file is an LFS pointer file
   * @param content File content
   * @returns True if the file is an LFS pointer
   */
  isLFSPointer(content: string): boolean {
    return content.startsWith('version https://git-lfs.github.com/spec/v1\n');
  }

  /**
   * Parse an LFS pointer file to extract OID and size
   * @param content LFS pointer file content
   * @returns Object with oid and size, or null if not a valid pointer
   */
  parsePointerFile(content: string): { oid: string; size: number } | null {
    if (!this.isLFSPointer(content)) {
      return null;
    }

    const lines = content.split('\n');
    let oid: string | null = null;
    let size: number | null = null;

    for (const line of lines) {
      if (line.startsWith('oid sha256:')) {
        oid = line.substring(11);
      } else if (line.startsWith('size ')) {
        size = parseInt(line.substring(5), 10);
      }
    }

    if (oid && size !== null) {
      return { oid, size };
    }

    return null;
  }

  /**
   * Store a file in LFS
   * @param filepath File path
   * @param content File content
   * @returns LFS pointer file content
   */
  async storeLFSFile(filepath: string, content: string | Uint8Array): Promise<string> {
    try {
      info(`Storing file in LFS: ${filepath}`);

      // Convert content to Uint8Array if it's a string
      const binaryContent =
        typeof content === 'string' ? new TextEncoder().encode(content) : content;

      // Calculate SHA-256 hash of the content
      const hashBuffer = await crypto.subtle.digest('SHA-256', binaryContent);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const oid = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      // Store the file in IndexedDB
      await databaseService.set(
        this.getLFSKey(oid),
        typeof content === 'string' ? content : new TextDecoder().decode(content),
      );

      // Create and return the pointer file
      return this.createPointerFile(oid, binaryContent.length);
    } catch (e) {
      error(`Failed to store LFS file ${filepath}:`, e);
      throw e;
    }
  }

  /**
   * Retrieve a file from LFS
   * @param pointerContent LFS pointer file content
   * @returns The actual file content, or null if not found
   */
  async retrieveLFSFile(pointerContent: string): Promise<string | null> {
    try {
      const pointer = this.parsePointerFile(pointerContent);

      if (!pointer) {
        warn('Not a valid LFS pointer file');
        return null;
      }

      info(`Retrieving LFS file with OID: ${pointer.oid}`);

      // Get the file from IndexedDB
      const content = await databaseService.get(this.getLFSKey(pointer.oid));

      if (!content) {
        warn(`LFS file with OID ${pointer.oid} not found in local storage`);
        return null;
      }

      return content;
    } catch (e) {
      error('Failed to retrieve LFS file:', e);
      throw e;
    }
  }

  /**
   * Process a file for commit - if it should use LFS, store it and return a pointer
   * @param filepath File path
   * @param content File content
   * @returns The content to commit (either original or LFS pointer)
   */
  async processFileForCommit(filepath: string, content: string): Promise<string> {
    if (this.shouldUseLFS(filepath, content)) {
      info(`Processing ${filepath} for LFS storage`);
      return await this.storeLFSFile(filepath, content);
    }
    return content;
  }

  /**
   * Process a file after checkout - if it's an LFS pointer, retrieve the actual content
   * @param filepath File path
   * @param content File content
   * @returns The actual file content (retrieved from LFS if needed)
   */
  async processFileAfterCheckout(filepath: string, content: string): Promise<string> {
    if (this.isLFSPointer(content)) {
      info(`Processing LFS pointer for ${filepath}`);
      const actualContent = await this.retrieveLFSFile(content);
      return actualContent || content;
    }
    return content;
  }

  /**
   * Get the IndexedDB key for an LFS file
   * @param oid Object ID
   * @returns IndexedDB key
   */
  private getLFSKey(oid: string): string {
    return `${GitLFSService.LFS_FILE_PREFIX}${oid}`;
  }

  /**
   * List all LFS files in storage
   * @returns Array of OIDs
   */
  async listLFSFiles(): Promise<string[]> {
    try {
      // This is a simplified implementation
      // In a real implementation, we would query IndexedDB for all keys with the LFS prefix
      return [];
    } catch (e) {
      error('Failed to list LFS files:', e);
      throw e;
    }
  }

  /**
   * Delete an LFS file from storage
   * @param oid Object ID
   */
  async deleteLFSFile(oid: string): Promise<void> {
    try {
      await databaseService.delete(this.getLFSKey(oid));
    } catch (e) {
      error(`Failed to delete LFS file ${oid}:`, e);
      throw e;
    }
  }

  /**
   * Calculate the total size of all LFS files
   * @returns Total size in bytes
   */
  async getTotalLFSSize(): Promise<number> {
    try {
      // This is a simplified implementation
      // In a real implementation, we would query IndexedDB for all LFS files and sum their sizes
      return 0;
    } catch (e) {
      error('Failed to calculate total LFS size:', e);
      throw e;
    }
  }
}

// Export a singleton instance
export const gitLFSService = new GitLFSService();
