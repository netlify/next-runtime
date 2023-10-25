import { defineConfig } from 'vitest/config'

export default defineConfig({
  root: '.',
  test: {
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
    environment: 'node',
    testTimeout: 100000,
    setupFiles: ['tests/test-setup.ts'],
  },
})
