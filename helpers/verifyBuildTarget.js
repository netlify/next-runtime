const getNextConfig = require('./getNextConfig')
const findUp = require('find-up')
const { writeFile, unlink } = require('fs-extra')
const path = require('path')

// Checks if site has the correct next.config.js
const verifyBuildTarget = async ({ failBuild }) => {
  const { target } = await getNextConfig(failBuild)

  // If the next config exists, log warning if target isnt in acceptableTargets
  const acceptableTargets = ['serverless', 'experimental-serverless-trace']
  const isValidTarget = acceptableTargets.includes(target)
  if (isValidTarget) {
    return
  }
  console.log(
    `The "target" config property must be one of "${acceptableTargets.join(
      '", "',
    )}". Building with "serverless" target.`,
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

  // Creating a config file, because otherwise Next won't reload the config and pick up the new target

  if (!(await findUp('next.config.js'))) {
    await writeFile(
      path.resolve('next.config.js'),
      `module.exports = {
  // Supported targets are "serverless" and "experimental-serverless-trace"
  target: "serverless"
}`,
    )
  }
  // Force the new config to be generated
  await getNextConfig(failBuild)

  // Reset the value in case something else is looking for it
  process.env.NOW_BUILDER = false
  /* eslint-enable fp/no-delete, node/no-unpublished-require */
}

module.exports = verifyBuildTarget
