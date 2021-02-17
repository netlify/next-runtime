const path = require('path')

// Checks if site has the correct next.cofig.js
const hasCorrectNextConfig = ({ nextConfigPath, failBuild }) => {
  // In the plugin's case, no config is valid because we'll make it ourselves
  if (nextConfigPath === undefined) return true

  // We cannot load `next` at the top-level because we validate whether the
  // site is using `next` inside `onPreBuild`.
  const { PHASE_PRODUCTION_BUILD } = require('next/constants')
  const { default: loadConfig } = require('next/dist/next-server/server/config')

  // If the next config exists, log warning if target isnt in acceptableTargets
  const acceptableTargets = ['serverless', 'experimental-serverless-trace']
  let nextConfig
  try {
    nextConfig = loadConfig(PHASE_PRODUCTION_BUILD, path.resolve('.'))
  } catch (error) {
    return failBuild('Error loading your next.config.js.', { error })
  }
  const isValidTarget = acceptableTargets.includes(nextConfig.target)
  if (!isValidTarget) {
    console.log(
      `Your next.config.js must set the "target" property to one of: ${acceptableTargets.join(', ')}. Update the 
      target property to allow this plugin to run.`,
    )
  }

  return isValidTarget
}

module.exports = hasCorrectNextConfig
