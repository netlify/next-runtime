// @ts-check
/** @type {import('@jest/types').Config.InitialOptions} */

const parent = require('./jest.config')

const config = {
  ...parent,
  testMatch: ['**/test/e2e/**/*.test.js', '**/test/e2e/**/*.test.ts'],
}

module.exports = config
