// @ts-check
/** @type {import('@jest/types').Config.InitialOptions} */

const parent = require('./jest.config')

const config = {
  ...parent,
  testMatch: ['**/test/e2e/app-dir/**/*.test.js', '**/test/e2e/app-dir/**/*.test.ts'],
}

module.exports = config
