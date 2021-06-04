'use strict'

const { cwd: getCwd } = require('process')
const { resolve } = require('path')

const moize = require('moize')

// We used to cache nextConfig for any cwd. Now we pass process.cwd() to cache
// (or memoize) nextConfig per cwd.
const getNextConfig = async function (failBuild = defaultFailBuild, cwd = getCwd()) {
  // We cannot load `next` at the top-level because we validate whether the
  // site is using `next` inside `onPreBuild`.
  const { PHASE_PRODUCTION_BUILD } = require('next/constants')
  const loadConfig = require('next/dist/next-server/server/config').default

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
