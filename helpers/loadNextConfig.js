const path = require('path')

const loadNextConfig = (failBuild) => {
  // We cannot load `next` at the top-level because we validate whether the
  // site is using `next` inside `onPreBuild`.
  const { PHASE_PRODUCTION_BUILD } = require('next/constants')
  const { default: loadConfig } = require('next/dist/next-server/server/config')

  let nextConfig
  try {
    nextConfig = loadConfig(PHASE_PRODUCTION_BUILD, path.resolve('.'))
  } catch (error) {
    return failBuild('Error loading your next.config.js.', { error })
  }

  return nextConfig
}

module.exports = loadNextConfig
