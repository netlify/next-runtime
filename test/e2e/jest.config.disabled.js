// @ts-check
/** @type {import('@jest/types').Config.InitialOptions} */

const parent = require('./jest.config')

const config = {
  ...parent,
  testMatch: ['**/test/e2e/disabled-tests/**/*.test.js', '**/test/e2e/disabled-tests/**/*.test.ts'],
}

module.exports = config
