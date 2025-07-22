import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useFileStore } from '../fileStore';

// Mock the database service
vi.mock('@/services/databaseService', () => ({
  databaseService: {
    saveFile: vi.fn(),
    getFile: vi.fn(),
    deleteFile: vi.fn(),
    clearDatabase: vi.fn(),
    isIndexedDBSupported: vi.fn(() => true),
    initialize: vi.fn(),
  },
}));

// Mock the logger service
vi.mock('@/services/loggerService', () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

describe('FileStore Debug Tests', () => {
  beforeEach(async () => {
    // Clear localStorage before each test
    localStorage.clear();

    // Reset the store state using the reset method
    await useFileStore.getState().reset();

    // Clear all mocks
    vi.clearAllMocks();
  });

  it('should have default files after reset', async () => {
    const store = useFileStore.getState();

    console.log('Files after reset:', Array.from(store.files.keys()));
    console.log('File count:', store.files.size);

    // Should have 4 default files: contracts/, tests/, scripts/, contracts/Example.sol
    expect(store.files.size).toBe(4);
    expect(store.files.has('/contracts')).toBe(true);
    expect(store.files.has('/tests')).toBe(true);
    expect(store.files.has('/scripts')).toBe(true);
    expect(store.files.has('/contracts/Example.sol')).toBe(true);
  });

  it('should create a simple file', async () => {
    const store = useFileStore.getState();

    await store.createFile('/test.js', 'console.log("test");');

    console.log('Files after creating test.js:', Array.from(store.files.keys()));

    expect(store.files.has('/test.js')).toBe(true);
    const file = store.files.get('/test.js');
    expect(file?.content).toBe('console.log("test");');
    expect(file?.type).toBe('file');
  });

  it('should create a simple folder', async () => {
    const store = useFileStore.getState();

    await store.createFolder('/src');

    console.log('Files after creating src folder:', Array.from(store.files.keys()));

    expect(store.files.has('/src')).toBe(true);
    const folder = store.files.get('/src');
    expect(folder?.type).toBe('folder');
  });

  it('should create file in nested folder', async () => {
    const store = useFileStore.getState();

    await store.createFolder('/src');
    await store.createFile('/src/index.js', 'console.log("hello");');

    console.log('Files after creating nested file:', Array.from(store.files.keys()));

    expect(store.files.has('/src')).toBe(true);
    expect(store.files.has('/src/index.js')).toBe(true);

    const file = store.files.get('/src/index.js');
    expect(file?.content).toBe('console.log("hello");');
    expect(file?.parent).toBe('/src');
  });
});
