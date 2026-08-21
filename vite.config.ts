import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resumeExtractPlugin } from './server/resumeExtractPlugin.ts'

export default defineConfig({
  plugins: [react(), resumeExtractPlugin()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
})
