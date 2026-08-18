import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  envPrefix: ['VITE_', 'TAURI_'],
  server: {
    port: 1420,
    // Never watch Rust build output — causes EBUSY crashes on Windows
    watch: {
      ignored: ['**/src-tauri/target/**', '**/src-tauri/gen/**'],
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Preserve original filenames for Clerk JS chunks
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.includes('clerk')) {
            return 'assets/[name][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        },
        // Don't hash Clerk JS entry point
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
})
