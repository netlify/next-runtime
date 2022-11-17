// @ts-check
/** @type {import('@jest/types').Config.InitialOptions} */

const config = {
  rootDir: __dirname,
  setupFiles: ['../../jestSetup.js'],
  testMatch: ['**/test/**/*.test.js', '**/test/**/*.test.ts'],
  transform: {
    '\\.[jt]sx?$': 'babel-jest',
  },
  verbose: true,
  testTimeout: 60000,
  moduleNameMapper: {
    'e2e-utils': '<rootDir>/next-test-lib/e2e-utils.ts',
    'test/lib/next-modes/base': '<rootDir>/next-test-lib/next-modes/base.ts',
    'next-test-utils': '<rootDir>/next-test-lib/next-test-utils.js',
    'next-webdriver': '<rootDir>/next-test-lib/next-webdriver.ts',
  },
}

module.exports = config
