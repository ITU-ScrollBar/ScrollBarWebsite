import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './', // important if you open index.html from disk
  build: {
    outDir: 'dist',      // output folder (default)
    emptyOutDir: true,   // clean before build
  },
})
// https://vitejs.dev/config/
