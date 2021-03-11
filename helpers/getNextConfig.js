const { resolve } = require('path')

let nextConfig

// Load next.config.js
const getNextConfig = async function (failBuild = defaultFailBuild) {
  // Memoizes `nextConfig`
  if (nextConfig !== undefined) {
    return nextConfig
  }

  // We cannot load `next` at the top-level because we validate whether the
  // site is using `next` inside `onPreBuild`.
  const { PHASE_PRODUCTION_BUILD } = require('next/constants')
  const loadConfig = require('next/dist/next-server/server/config').default

  try {
    nextConfig = await loadConfig(PHASE_PRODUCTION_BUILD, resolve('.'))
  } catch (error) {
    return failBuild('Error loading your next.config.js.', { error })
  }

  return nextConfig
}

const defaultFailBuild = function (message, { error }) {
  throw new Error(`${message}\n${error.stack}`)
}

module.exports = getNextConfig
