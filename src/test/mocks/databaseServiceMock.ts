import { vi } from 'vitest';

// Create a mock for the database service
const mockDatabaseService = {
  saveFile: vi.fn(),
  getFile: vi.fn(),
  deleteFile: vi.fn(),
  clearDatabase: vi.fn(),
  isIndexedDBSupported: vi.fn(() => true),
  initialize: vi.fn(),
  saveFileContent: vi.fn(),
  getFileContent: vi.fn(),
  deleteFileContent: vi.fn(),
  saveEditorHistory: vi.fn(),
  getEditorHistory: vi.fn(),
  clearEditorHistory: vi.fn(),
  saveStateMigration: vi.fn(),
  getStateMigration: vi.fn(),
  clearAllData: vi.fn(),
  getDatabaseSize: vi.fn(),
  set: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
};

// Mock the database service
vi.mock('../../../src/services/databaseService', () => ({
  databaseService: mockDatabaseService,
}));

// Export the mocked database service for use in tests
export const mockedDatabaseService = mockDatabaseService;
