// Git Service Worker
// Handles Git operations in the background

const CACHE_NAME = 'git-operations-cache-v1';
const GIT_API_ENDPOINT = '/api/git';

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('[Git Service Worker] Installing...');

  // Skip waiting to activate immediately
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache essential Git operation resources
      return cache.addAll([
        '/api/git/status',
        '/api/git/log',
      ]);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Git Service Worker] Activating...');

  // Claim clients to control all tabs immediately
  event.waitUntil(self.clients.claim());

  // Clean up old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Git Service Worker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Operation queue for offline support
const operationQueue = new Map();

// Track running operations
const runningOperations = new Map();

// Message event - handle messages from the main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'process-git-operation':
      handleGitOperation(data.operation, event.source);
      break;
    case 'cancel-git-operation':
      cancelGitOperation(data.operationId, event.source);
      break;
    default:
      console.log(`[Git Service Worker] Unknown message type: ${type}`);
  }
});

// Fetch event - handle API requests and provide offline support
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle Git API requests
  if (url.pathname.startsWith(GIT_API_ENDPOINT)) {
    event.respondWith(
      handleGitApiRequest(event.request)
    );
  }
});

/**
 * Handle Git API requests with offline support
 */
async function handleGitApiRequest(request) {
  try {
    // Try to fetch from network first
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      caches.open(CACHE_NAME).then((cache) => {
        cache.put(request, responseToCache);
      });
    }

    return networkResponse;
  } catch (error) {
    console.log('[Git Service Worker] Fetch failed, trying cache:', error);

    // If network request fails, try to get from cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // If not in cache, return error response
    return new Response(JSON.stringify({
      error: 'Network request failed and no cached data available',
      offline: true
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Handle Git operation
 */
async function handleGitOperation(operation, client) {
  console.log(`[Git Service Worker] Processing operation: ${operation.type}`, operation);

  // Store operation in running operations map
  runningOperations.set(operation.id, { operation, client });

  // Report initial progress
  reportProgress(operation.id, 10);

  try {
    let result;

    // Check if we're offline and operation requires network
    if (operation.requiresNetwork && !(await isOnline())) {
      // Queue operation for later if it requires network
      queueOperationForLater(operation);

      throw new Error('Network is offline. Operation queued for when connectivity is restored.');
    }

    // Process operation based on type
    switch (operation.type) {
      case 'init':
        result = await processInitOperation(operation);
        break;
      case 'add':
        result = await processAddOperation(operation);
        break;
      case 'commit':
        result = await processCommitOperation(operation);
        break;
      case 'branch':
        result = await processBranchOperation(operation);
        break;
      case 'checkout':
        result = await processCheckoutOperation(operation);
        break;
      case 'status':
        result = await processStatusOperation(operation);
        break;
      case 'log':
        result = await processLogOperation(operation);
        break;
      case 'blame':
        result = await processBlameOperation(operation);
        break;
      case 'diff':
        result = await processDiffOperation(operation);
        break;
      case 'stash':
        result = await processStashOperation(operation);
        break;
      case 'unstage':
        result = await processUnstageOperation(operation);
        break;
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }

    // Report completion
    reportCompletion(operation.id, result);
  } catch (error) {
    console.error(`[Git Service Worker] Operation failed: ${operation.type}`, error);

    // Report failure
    reportFailure(operation.id, error);
  } finally {
    // Remove from running operations
    runningOperations.delete(operation.id);
  }
}

/**
 * Cancel a Git operation
 */
function cancelGitOperation(operationId, client) {
  console.log(`[Git Service Worker] Canceling operation: ${operationId}`);

  const runningOperation = runningOperations.get(operationId);
  if (runningOperation) {
    // For now, we just remove it from running operations
    // In a real implementation, we would need to actually cancel the operation
    runningOperations.delete(operationId);

    // Notify client
    client.postMessage({
      type: 'operation-canceled',
      data: {
        operationId
      }
    });
  }
}

/**
 * Queue operation for later execution when online
 */
function queueOperationForLater(operation) {
  console.log(`[Git Service Worker] Queuing operation for later: ${operation.type}`);

  // Store in IndexedDB for persistence
  operationQueue.set(operation.id, operation);

  // Store in IndexedDB (simplified implementation)
  // In a real implementation, we would use IndexedDB for persistence
  localStorage.setItem(`git-operation-queue-${operation.id}`, JSON.stringify(operation));
}

/**
 * Process queued operations when online
 */
async function processQueuedOperations() {
  console.log('[Git Service Worker] Processing queued operations');

  // Get all clients
  const clients = await self.clients.matchAll();
  if (clients.length === 0) {
    console.log('[Git Service Worker] No clients connected, deferring queue processing');
    return;
  }

  // Process each queued operation
  for (const [operationId, operation] of operationQueue.entries()) {
    console.log(`[Git Service Worker] Processing queued operation: ${operation.type}`);

    // Remove from queue
    operationQueue.delete(operationId);

    // Process operation
    handleGitOperation(operation, clients[0]);
  }
}

/**
 * Check if we're online
 */
async function isOnline() {
  try {
    // Make a small request to check connectivity
    const response = await fetch('/api/ping', { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Report progress for an operation
 */
function reportProgress(operationId, progress) {
  const runningOperation = runningOperations.get(operationId);
  if (runningOperation) {
    const { client } = runningOperation;

    client.postMessage({
      type: 'operation-progress',
      data: {
        operationId,
        progress
      }
    });
  }
}

/**
 * Report completion of an operation
 */
function reportCompletion(operationId, result) {
  const runningOperation = runningOperations.get(operationId);
  if (runningOperation) {
    const { client } = runningOperation;

    client.postMessage({
      type: 'operation-completed',
      data: {
        operationId,
        result
      }
    });
  }
}

/**
 * Report failure of an operation
 */
function reportFailure(operationId, error) {
  const runningOperation = runningOperations.get(operationId);
  if (runningOperation) {
    const { client } = runningOperation;

    client.postMessage({
      type: 'operation-failed',
      data: {
        operationId,
        error: {
          message: error.message,
          stack: error.stack
        }
      }
    });
  }
}

// Operation processing implementations
// These would call the actual Git API endpoints

async function processInitOperation(operation) {
  reportProgress(operation.id, 30);

  // Simulate API call
  const response = await fetch(`${GIT_API_ENDPOINT}/init`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(operation.params)
  });

  reportProgress(operation.id, 70);

  if (!response.ok) {
    throw new Error(`Failed to initialize repository: ${response.statusText}`);
  }

  return await response.json();
}

async function processAddOperation(operation) {
  reportProgress(operation.id, 30);

  // Simulate API call
  const response = await fetch(`${GIT_API_ENDPOINT}/add`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(operation.params)
  });

  reportProgress(operation.id, 70);

  if (!response.ok) {
    throw new Error(`Failed to add file: ${response.statusText}`);
  }

  return await response.json();
}

async function processCommitOperation(operation) {
  reportProgress(operation.id, 30);

  // Simulate API call
  const response = await fetch(`${GIT_API_ENDPOINT}/commit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(operation.params)
  });

  reportProgress(operation.id, 70);

  if (!response.ok) {
    throw new Error(`Failed to commit changes: ${response.statusText}`);
  }

  return await response.json();
}

async function processBranchOperation(operation) {
  reportProgress(operation.id, 30);

  // Simulate API call
  const response = await fetch(`${GIT_API_ENDPOINT}/branch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(operation.params)
  });

  reportProgress(operation.id, 70);

  if (!response.ok) {
    throw new Error(`Failed to create branch: ${response.statusText}`);
  }

  return await response.json();
}

async function processCheckoutOperation(operation) {
  reportProgress(operation.id, 30);

  // Simulate API call
  const response = await fetch(`${GIT_API_ENDPOINT}/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(operation.params)
  });

  reportProgress(operation.id, 70);

  if (!response.ok) {
    throw new Error(`Failed to checkout: ${response.statusText}`);
  }

  return await response.json();
}

async function processStatusOperation(operation) {
  reportProgress(operation.id, 30);

  // Simulate API call
  const response = await fetch(`${GIT_API_ENDPOINT}/status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(operation.params)
  });

  reportProgress(operation.id, 70);

  if (!response.ok) {
    throw new Error(`Failed to get status: ${response.statusText}`);
  }

  return await response.json();
}

async function processLogOperation(operation) {
  reportProgress(operation.id, 30);

  // Simulate API call
  const response = await fetch(`${GIT_API_ENDPOINT}/log`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(operation.params)
  });

  reportProgress(operation.id, 70);

  if (!response.ok) {
    throw new Error(`Failed to get log: ${response.statusText}`);
  }

  return await response.json();
}

async function processBlameOperation(operation) {
  reportProgress(operation.id, 30);

  // Simulate API call
  const response = await fetch(`${GIT_API_ENDPOINT}/blame`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(operation.params)
  });

  reportProgress(operation.id, 70);

  if (!response.ok) {
    throw new Error(`Failed to get blame: ${response.statusText}`);
  }

  return await response.json();
}

async function processDiffOperation(operation) {
  reportProgress(operation.id, 30);

  // Simulate API call
  const response = await fetch(`${GIT_API_ENDPOINT}/diff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(operation.params)
  });

  reportProgress(operation.id, 70);

  if (!response.ok) {
    throw new Error(`Failed to get diff: ${response.statusText}`);
  }

  return await response.json();
}

async function processStashOperation(operation) {
  reportProgress(operation.id, 30);

  // Simulate API call
  const response = await fetch(`${GIT_API_ENDPOINT}/stash`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(operation.params)
  });

  reportProgress(operation.id, 70);

  if (!response.ok) {
    throw new Error(`Failed to stash changes: ${response.statusText}`);
  }

  return await response.json();
}

async function processUnstageOperation(operation) {
  reportProgress(operation.id, 30);

  // Simulate API call
  const response = await fetch(`${GIT_API_ENDPOINT}/unstage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(operation.params)
  });

  reportProgress(operation.id, 70);

  if (!response.ok) {
    throw new Error(`Failed to unstage file: ${response.statusText}`);
  }

  return await response.json();
}

// Listen for online/offline events
self.addEventListener('online', () => {
  console.log('[Git Service Worker] Online status changed: online');
  processQueuedOperations();
});

self.addEventListener('offline', () => {
  console.log('[Git Service Worker] Online status changed: offline');
});

// Log that the service worker is running
console.log('[Git Service Worker] Service worker registered and running');
