// Test script to reproduce the file persistence issue
// This simulates the file creation and update flow

console.log('Testing file persistence issue...');

// Simulate the file store structure
const simulateFileStore = () => {
  // Initial state
  let state = {
    files: new Map(),
    openTabs: [],
    activeFile: null,
    selectedFiles: [],
    expandedFolders: new Set(['/'])
  };

  // Simulate localStorage persistence
  const saveToLocalStorage = (state) => {
    const filesArray = Array.from(state.files.entries()).map(([path, file]) => {
      if (file.type === 'file' && file.contentInIndexedDB) {
        const { content, ...fileWithoutContent } = file;
        return [path, fileWithoutContent];
      }
      return [path, file];
    });

    const persistedState = {
      state: {
        filesArray,
        expandedFoldersArray: Array.from(state.expandedFolders),
        openTabs: state.openTabs,
        activeFile: state.activeFile,
        selectedFiles: state.selectedFiles,
      },
      version: 2
    };

    localStorage.setItem('file-storage', JSON.stringify(persistedState));
    console.log('Saved to localStorage:', persistedState);
  };

  // Simulate createFile
  const createFile = (path, content = '') => {
    console.log(`Creating file: ${path} with content length: ${content.length}`);

    const newFile = {
      id: Date.now().toString(),
      name: path.split('/').pop(),
      path,
      type: 'file',
      parent: '/',
      lastModified: Date.now(),
      size: content.length,
      content: content,
      contentInIndexedDB: false
    };

    state.files.set(path, newFile);
    state.openTabs.push(path);
    state.activeFile = path;

    // Simulate persistence (this might be async/debounced in real app)
    setTimeout(() => {
      saveToLocalStorage(state);
    }, 100);
  };

  // Simulate updateFileContent
  const updateFileContent = (path, content) => {
    console.log(`Updating file: ${path} with content length: ${content.length}`);

    const file = state.files.get(path);
    if (!file || file.type !== 'file') return;

    const INDEXEDDB_SIZE_THRESHOLD = 50 * 1024; // 50KB
    const shouldBeInIndexedDB = content.length > INDEXEDDB_SIZE_THRESHOLD;

    // Update file
    file.lastModified = Date.now();
    file.size = content.length;
    file.contentInIndexedDB = shouldBeInIndexedDB;

    if (!shouldBeInIndexedDB) {
      file.content = content;
    } else {
      delete file.content;
      // In real app, this would save to IndexedDB
      console.log('Would save to IndexedDB:', path);
    }

    // Simulate persistence (this might be async/debounced in real app)
    setTimeout(() => {
      saveToLocalStorage(state);
    }, 100);
  };

  // Simulate loading from localStorage
  const loadFromLocalStorage = () => {
    const stored = localStorage.getItem('file-storage');
    if (!stored) {
      console.log('No stored data found');
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      console.log('Loaded from localStorage:', parsed);

      // Reconstruct state
      state.files = new Map(parsed.state.filesArray || []);
      state.expandedFolders = new Set(parsed.state.expandedFoldersArray || ['/']);
      state.openTabs = parsed.state.openTabs || [];
      state.activeFile = parsed.state.activeFile;
      state.selectedFiles = parsed.state.selectedFiles || [];

      console.log('Reconstructed files:', Array.from(state.files.entries()));
    } catch (e) {
      console.error('Error loading from localStorage:', e);
    }
  };

  return {
    createFile,
    updateFileContent,
    loadFromLocalStorage,
    getState: () => state
  };
};

// Test the issue
const testPersistenceIssue = async () => {
  console.log('\n=== Test 1: Create new file ===');

  // Clear localStorage first
  localStorage.removeItem('file-storage');

  const store = simulateFileStore();

  // Create a new file (like user clicking "New File")
  store.createFile('/test.sol', '');

  // Wait for persistence
  await new Promise(resolve => setTimeout(resolve, 200));

  // Simulate user typing content
  store.updateFileContent('/test.sol', '// Test contract\npragma solidity ^0.8.0;\n\ncontract Test {\n    string public message = "Hello";\n}');

  // Wait for persistence
  await new Promise(resolve => setTimeout(resolve, 200));

  console.log('\n=== Test 2: Simulate page refresh ===');

  // Create new store instance (simulating page refresh)
  const newStore = simulateFileStore();
  newStore.loadFromLocalStorage();

  const newState = newStore.getState();
  console.log('Files after refresh:', Array.from(newState.files.keys()));

  const testFile = newState.files.get('/test.sol');
  if (testFile) {
    console.log('Test file found:', {
      path: testFile.path,
      hasContent: !!testFile.content,
      contentLength: testFile.content?.length || 0,
      contentInIndexedDB: testFile.contentInIndexedDB
    });

    if (testFile.content) {
      console.log('Content preview:', testFile.content.substring(0, 100));
    }
  } else {
    console.log('❌ Test file NOT found after refresh!');
  }
};

// Run the test
testPersistenceIssue().catch(console.error);
