import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  // Web Workers configuration
  /*worker: {
    format: 'es',
  },*/

  // Optimized dependencies
  /*optimizeDeps: {
    include: [
      'monaco-editor',
      '@monaco-editor/react',
      'web3',
      'zustand',
      'react',
      'react-dom',
      '@agnostico/browser-solidity-compiler',
    ],
    // exclude: ['@agnostico/browser-solidity-compiler']
  },*/

  // Build configuration
  /*build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          monaco: ['monaco-editor', '@monaco-editor/react'],
          'monaco-editor': ['monaco-editor'],
          'monaco-editor-react': ['@monaco-editor/react'],
          web3: ['web3'],
          state: ['zustand', 'immer'],
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 20000,
  },*/

  // Define global variables
  define: {
    global: 'globalThis',
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    'process.env': process.env,
  },

  // Resolve aliases
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      buffer: 'buffer',
      process: 'process/browser',
      // Add this line for Monaco Editor
      // 'monaco-editor': 'monaco-editor/esm/vs/editor/editor.api',
    },
  },

  // Development server configuration
  server: {
    port: 3000,
    open: true,
    fs: {
      // Allow serving files from one level up
      allow: ['..', 'node_modules'],
    },
  },
});
