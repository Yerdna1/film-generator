import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Test database URL
const TEST_DB_URL = 'postgresql://neondb_owner:npg_9XMixI8ElAJa@ep-rough-butterfly-agblumty-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require'

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
    environment: 'node',
    env: {
      DATABASE_URL: TEST_DB_URL,
      TEST_DATABASE_URL: TEST_DB_URL
    },
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['node_modules', '.next'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/lib/**/*.ts', 'src/app/api/**/*.ts'],
      exclude: ['src/test/**', '**/*.test.ts'],
      thresholds: {
        global: {
          statements: 80,
          branches: 75,
          functions: 80,
          lines: 80
        }
      }
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    }
  }
})
