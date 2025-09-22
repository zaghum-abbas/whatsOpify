import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/content/index.jsx')
      },
      output: {
        entryFileNames: 'content.js'
      }
    }
  },
  closeBundle() {
    console.log("✅ Copying manifest.json to dist/");
    fs.copySync('public', 'dist');
  }
});
