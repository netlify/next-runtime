// @ts-check
/** @type {import('@jest/types').Config.InitialOptions} */

const config = {
  maxWorkers: 1,
  rootDir: __dirname,
  setupFilesAfterEnv: ['<rootDir>/jest-setup-after-env.ts'],
  testMatch: [
    '**/test/e2e/tests/**/*.test.js',
    '**/test/e2e/tests/**/*.test.ts',
    '**/test/e2e/modified-tests/**/*.test.js',
    '**/test/e2e/modified-tests/**/*.test.ts',
  ],
  transform: {
    '\\.[jt]sx?$': 'babel-jest',
  },
  verbose: true,
  testTimeout: 600000, // ten minutes
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx'],
  moduleNameMapper: {
    'e2e-utils': '<rootDir>/next-test-lib/e2e-utils.ts',
    'test/lib/next-modes/base': '<rootDir>/next-test-lib/next-modes/base.ts',
    'next-test-utils': '<rootDir>/next-test-lib/next-test-utils.js',
    'next-webdriver': '<rootDir>/next-test-lib/next-webdriver.ts',
  },
}

module.exports = config
