import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // Web Workers configuration
  worker: {
    format: 'es',
  },

  // Optimized dependencies
  optimizeDeps: {
    include: [
      'monaco-editor',
      '@monaco-editor/react',
      'web3',
      'zustand',
      'react',
      'react-dom'
    ],
    exclude: ['solc', '@remix-project/remix-solidity']
  },

  // Build configuration
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          monaco: ['monaco-editor', '@monaco-editor/react'],
          web3: ['web3'],
          state: ['zustand', 'immer']
        }
      }
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000
  },

  // Define global variables
  define: {
    global: 'globalThis',
  },

  // Resolve aliases
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      buffer: 'buffer',
      process: 'process/browser',
    },
  },

  // Development server configuration
  server: {
    port: 3000,
    open: true,
    fs: {
      // Allow serving files from one level up
      allow: ['..'],
    }
  },
})
