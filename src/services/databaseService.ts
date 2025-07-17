import Dexie from 'dexie';
import { debug, info, warn, error } from '@/services/loggerService';

/**
 * Database schema version
 * Increment this when changing the schema
 */
const SCHEMA_VERSION = 1;

/**
 * Interface for file content stored in IndexedDB
 */
export interface FileContent {
  id: string; // File path
  path?: string; // Alias for id, for compatibility
  content: string;
  lastModified: number;
  size?: number;
  contentInIndexedDB?: boolean;
  type?: string;
}

/**
 * Interface for editor history entries stored in IndexedDB
 */
export interface EditorHistoryEntry {
  id?: number; // Auto-incremented
  fileId: string;
  timestamp: number;
  operation: string;
  data: any;
  inverse: any;
}

/**
 * Interface for state migrations stored in IndexedDB
 */
export interface StateMigration {
  id: string; // Store name
  version: number;
  timestamp: number;
  data: any;
}

/**
 * Database class for managing IndexedDB operations
 * Uses Dexie.js for easier IndexedDB management
 */
class RemixIDEDatabase extends Dexie {
  // Tables
  fileContents!: Dexie.Table<FileContent, string>;
  editorHistory!: Dexie.Table<EditorHistoryEntry, number>;
  stateMigrations!: Dexie.Table<StateMigration, string>;

  constructor() {
    super('RemixIDEClone');

    this.version(SCHEMA_VERSION).stores({
      fileContents: 'id, lastModified',
      editorHistory: '++id, fileId, timestamp',
      stateMigrations: 'id, version, timestamp'
    });

    debug('DatabaseService', `Database initialized with schema version ${SCHEMA_VERSION}`);
  }
}

/**
 * Database service for managing IndexedDB operations
 * Provides methods for storing and retrieving data from IndexedDB
 */
class DatabaseService {
  private static instance: DatabaseService;
  private db: RemixIDEDatabase;
  private isInitialized: boolean = false;

  private constructor() {
    this.db = new RemixIDEDatabase();
  }

  /**
   * Get the singleton instance of DatabaseService
   */
  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Initialize the database
   * This should be called before using the database
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await this.db.open();
      this.isInitialized = true;
      info('DatabaseService', 'Database opened successfully');
    } catch (err) {
      error('DatabaseService', 'Failed to open database', err);
      throw err;
    }
  }

  /**
   * Check if IndexedDB is supported in the current browser
   */
  public isIndexedDBSupported(): boolean {
    return !!window.indexedDB;
  }

  /**
   * Save file content to IndexedDB
   * @param fileId File path
   * @param content File content
   * @param lastModified Last modified timestamp
   */
  public async saveFileContent(fileId: string, content: string, lastModified: number): Promise<void> {
    try {
      await this.ensureInitialized();
      await this.db.fileContents.put({
        id: fileId,
        content,
        lastModified
      });
      debug('DatabaseService', `Saved file content for ${fileId}`);
    } catch (err) {
      error('DatabaseService', `Failed to save file content for ${fileId}`, err);
      throw err;
    }
  }

  /**
   * Save file to IndexedDB (alias for saveFileContent with FileContent object)
   * @param file FileContent object
   */
  public async saveFile(file: FileContent): Promise<void> {
    try {
      await this.ensureInitialized();
      // Ensure id is set (use path as fallback)
      const fileId = file.id || file.path;
      if (!fileId) {
        throw new Error('File must have an id or path');
      }

      // Normalize the file object
      const fileToSave = {
        ...file,
        id: fileId,
        lastModified: file.lastModified || Date.now()
      };

      await this.db.fileContents.put(fileToSave);
      debug('DatabaseService', `Saved file for ${fileId}`);
    } catch (err) {
      error('DatabaseService', `Failed to save file: ${file.id || file.path}`, err);
      throw err;
    }
  }

  /**
   * Get file content from IndexedDB
   * @param fileId File path
   * @returns File content or null if not found
   */
  public async getFileContent(fileId: string): Promise<FileContent | undefined> {
    try {
      await this.ensureInitialized();
      return await this.db.fileContents.get(fileId);
    } catch (err) {
      error('DatabaseService', `Failed to get file content for ${fileId}`, err);
      throw err;
    }
  }

  /**
   * Get file from IndexedDB (alias for getFileContent)
   * @param fileId File path
   * @returns File or undefined if not found
   */
  public async getFile(fileId: string): Promise<FileContent | undefined> {
    return this.getFileContent(fileId);
  }

  /**
   * Delete file content from IndexedDB
   * @param fileId File path
   */
  public async deleteFileContent(fileId: string): Promise<void> {
    try {
      await this.ensureInitialized();
      await this.db.fileContents.delete(fileId);
      debug('DatabaseService', `Deleted file content for ${fileId}`);
    } catch (err) {
      error('DatabaseService', `Failed to delete file content for ${fileId}`, err);
      throw err;
    }
  }

  /**
   * Delete file from IndexedDB (alias for deleteFileContent)
   * @param fileId File path
   */
  public async deleteFile(fileId: string): Promise<void> {
    return this.deleteFileContent(fileId);
  }

  /**
   * Save editor history entry to IndexedDB
   * @param entry Editor history entry
   * @returns ID of the saved entry
   */
  public async saveEditorHistory(entry: Omit<EditorHistoryEntry, 'id'>): Promise<number> {
    try {
      await this.ensureInitialized();
      const id = await this.db.editorHistory.add(entry as EditorHistoryEntry);
      debug('DatabaseService', `Saved editor history entry with ID ${id}`);
      return id;
    } catch (err) {
      error('DatabaseService', 'Failed to save editor history entry', err);
      throw err;
    }
  }

  /**
   * Get editor history entries for a file
   * @param fileId File path
   * @returns Array of editor history entries
   */
  public async getEditorHistory(fileId: string): Promise<EditorHistoryEntry[]> {
    try {
      await this.ensureInitialized();
      return await this.db.editorHistory
        .where('fileId')
        .equals(fileId)
        .sortBy('timestamp');
    } catch (err) {
      error('DatabaseService', `Failed to get editor history for ${fileId}`, err);
      throw err;
    }
  }

  /**
   * Clear editor history for a file
   * @param fileId File path
   */
  public async clearEditorHistory(fileId: string): Promise<void> {
    try {
      await this.ensureInitialized();
      await this.db.editorHistory
        .where('fileId')
        .equals(fileId)
        .delete();
      debug('DatabaseService', `Cleared editor history for ${fileId}`);
    } catch (err) {
      error('DatabaseService', `Failed to clear editor history for ${fileId}`, err);
      throw err;
    }
  }

  /**
   * Save state migration to IndexedDB
   * @param storeId Store name
   * @param version Version number
   * @param data Migration data
   */
  public async saveStateMigration(storeId: string, version: number, data: any): Promise<void> {
    try {
      await this.ensureInitialized();
      await this.db.stateMigrations.put({
        id: storeId,
        version,
        timestamp: Date.now(),
        data
      });
      debug('DatabaseService', `Saved state migration for ${storeId} version ${version}`);
    } catch (err) {
      error('DatabaseService', `Failed to save state migration for ${storeId}`, err);
      throw err;
    }
  }

  /**
   * Get state migration from IndexedDB
   * @param storeId Store name
   * @returns State migration or undefined if not found
   */
  public async getStateMigration(storeId: string): Promise<StateMigration | undefined> {
    try {
      await this.ensureInitialized();
      return await this.db.stateMigrations.get(storeId);
    } catch (err) {
      error('DatabaseService', `Failed to get state migration for ${storeId}`, err);
      throw err;
    }
  }

  /**
   * Ensure the database is initialized
   * @throws Error if initialization fails
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * Clear all data from the database
   * Use with caution!
   */
  public async clearAllData(): Promise<void> {
    try {
      await this.ensureInitialized();
      await this.db.fileContents.clear();
      await this.db.editorHistory.clear();
      await this.db.stateMigrations.clear();
      info('DatabaseService', 'All database data cleared');
    } catch (err) {
      error('DatabaseService', 'Failed to clear all database data', err);
      throw err;
    }
  }

  /**
   * Clear database (alias for clearAllData)
   * Use with caution!
   */
  public async clearDatabase(): Promise<void> {
    return this.clearAllData();
  }

  /**
   * Get database size estimate
   * @returns Size in bytes (approximate)
   */
  public async getDatabaseSize(): Promise<number> {
    try {
      await this.ensureInitialized();

      // Get all file contents
      const fileContents = await this.db.fileContents.toArray();

      // Calculate size
      let size = 0;

      // Add file content sizes
      for (const file of fileContents) {
        size += file.content.length * 2; // Approximate UTF-16 encoding
      }

      // Add metadata size (rough estimate)
      size += fileContents.length * 100; // Metadata overhead

      return size;
    } catch (err) {
      error('DatabaseService', 'Failed to get database size', err);
      return 0;
    }
  }
}

// Export singleton instance
export const databaseService = DatabaseService.getInstance();

// Initialize the database when the service is imported
(async () => {
  try {
    if (databaseService.isIndexedDBSupported()) {
      await databaseService.initialize();
    } else {
      warn('DatabaseService', 'IndexedDB is not supported in this browser');
    }
  } catch (err) {
    error('DatabaseService', 'Failed to initialize database service', err);
  }
})();
