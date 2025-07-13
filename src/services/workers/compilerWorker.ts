// src/services/workers/compilerWorker.ts
import CompilerWorker from './compiler.worker?worker'

// Define the types of messages we can send to the worker
export type CompilerWorkerInput = {
  action: 'compile';
  sources: Record<string, { content: string }>;
  version: string;
  settings: {
    optimizer: {
      enabled: boolean;
      runs: number;
    };
    outputSelection: Record<string, Record<string, string[]>>;
  };
} | {
  action: 'loadVersion';
  version: string;
} | {
  action: 'getVersions';
};

// Define the types of messages we can receive from the worker
export type CompilerWorkerOutput = {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
};

// Helper class to manage worker communication
export class CompilerWorkerManager {
  private worker: Worker;
  private messageHandlers: Map<string, (response: CompilerWorkerOutput) => void> = new Map();

  constructor() {
    // Create the worker from the file in public/workers
    // this.worker = new Worker(new URL('/workers/compiler.js', import.meta.url), { type: 'module' });
    // this.worker = new Worker(new URL('/workers/compiler.js', import.meta.url));
    this.worker = new CompilerWorker();

    // Set up the message handler
    this.worker.onmessage = (event: MessageEvent<CompilerWorkerOutput>) => {
      const { id, success, data, error } = event.data;
      const handler = this.messageHandlers.get(id);

      if (handler) {
        handler({ id, success, data, error });
        this.messageHandlers.delete(id);
      }
    };
  }

  // Send a message to the worker and return a promise that resolves with the response
  sendMessage<T>(message: CompilerWorkerInput): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).substring(2, 15);

      this.messageHandlers.set(id, (response) => {
        if (response.success) {
          resolve(response.data as T);
        } else {
          reject(new Error(response.error || 'Unknown error'));
        }
      });

      this.worker.postMessage({ ...message, id });
    });
  }

  // Terminate the worker
  terminate() {
    this.worker.terminate();
  }
}

// Create and export a singleton instance
export const compilerWorker = new CompilerWorkerManager();
