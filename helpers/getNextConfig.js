'use strict'

const { cwd: getCwd } = require('process')

const moize = require('moize')

const resolveNextModule = require('./resolveNextModule')

// We used to cache nextConfig for any cwd. Now we pass process.cwd() to cache
// (or memoize) nextConfig per cwd.
const getNextConfig = async function (failBuild = defaultFailBuild, cwd = getCwd()) {
  // We cannot load `next` at the top-level because we validate whether the
  // site is using `next` inside `onPreBuild`.
  /* eslint-disable import/no-dynamic-require */
  const { PHASE_PRODUCTION_BUILD } = require(resolveNextModule('next/constants', cwd))
  const loadConfig = require(resolveNextModule(
    [
      // next <= 11.0.1
      'next/dist/next-server/server/config',
      // next > 11.0.1
      'next/dist/server/config',
    ],
    cwd,
  )).default
  /* eslint-enable import/no-dynamic-require */

  try {
    return await loadConfig(PHASE_PRODUCTION_BUILD, cwd)
  } catch (error) {
    return failBuild('Error loading your next.config.js.', { error })
  }
}

const moizedGetNextConfig = moize(getNextConfig, {
  maxSize: 1e3,
  isPromise: true,
  // Memoization cache key. We need to use `transformArgs` so `process.cwd()`
  // default value is assigned
  transformArgs: ([, cwd = getCwd()]) => [cwd],
})

const defaultFailBuild = function (message, { error }) {
  throw new Error(`${message}\n${error.stack}`)
}

module.exports = moizedGetNextConfig
