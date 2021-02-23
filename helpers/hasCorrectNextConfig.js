const loadNextConfig = require('./loadNextConfig')

// Checks if site has the correct next.cofig.js
const hasCorrectNextConfig = ({ nextConfigPath, failBuild }) => {
  // In the plugin's case, no config is valid because we'll make it ourselves
  if (nextConfigPath === undefined) return true
  const nextConfig = loadNextConfig(failBuild)

  // If the next config exists, log warning if target isnt in acceptableTargets
  const acceptableTargets = ['serverless', 'experimental-serverless-trace']
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
