const getNextConfig = require('./getNextConfig')
// Checks if site has the correct next.config.js
const hasCorrectNextConfig = async ({ nextConfigPath, failBuild }) => {
  // In the plugin's case, no config is valid because we'll make it ourselves
  if (nextConfigPath === undefined) return true

  const { target } = await getNextConfig(failBuild)

  // If the next config exists, log warning if target isnt in acceptableTargets
  const acceptableTargets = ['serverless', 'experimental-serverless-trace']
  const isValidTarget = acceptableTargets.includes(target)
  if (!isValidTarget) {
    console.log(
      `The "target" config property must be one of "${acceptableTargets.join('", "')}". Setting it to "serverless".`,
    )

    /* eslint-disable fp/no-delete, node/no-unpublished-require */

    // We emulate Vercel so that we can set target to serverless if needed
    process.env.NOW_BUILDER = true
    // If no valid target is set, we use an internal Next env var to force it
    process.env.NEXT_PRIVATE_TARGET = 'serverless'

    // 🐉 We need Next to recalculate "isZeitNow" var so we can set the target, but it's
    // set as an import side effect so we need to clear the require cache first. 🐲
    // https://github.com/vercel/next.js/blob/canary/packages/next/telemetry/ci-info.ts

    delete require.cache[require.resolve('next/dist/telemetry/ci-info')]
    delete require.cache[require.resolve('next/dist/next-server/server/config')]

    // Clear memoized cache
    getNextConfig.clear()

    /* eslint-enable fp/no-delete, node/no-unpublished-require */
  }

  return isValidTarget
}

module.exports = hasCorrectNextConfig
