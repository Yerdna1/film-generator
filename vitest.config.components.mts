import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/test': resolve(__dirname, './src/test')
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup-dom.ts'],
    include: [
      'src/components/**/*.test.{ts,tsx}',
      'src/hooks/**/*.test.{ts,tsx}',
    ],
    exclude: ['node_modules', '.next'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/components/**/*.{ts,tsx}', 'src/hooks/**/*.{ts,tsx}'],
      exclude: ['src/test/**', '**/*.test.{ts,tsx}'],
    },
    testTimeout: 10000,
  }
})