const path = require('path')

const { writeFile } = require('fs-extra')

const getNextConfig = require('./getNextConfig')
const getNextRoot = require('./getNextRoot')
const resolveNextModule = require('./resolveNextModule')

// Checks if site has the correct next.config.js
const verifyBuildTarget = async ({ failBuild, netlifyConfig }) => {
  const nextRoot = getNextRoot({ netlifyConfig })

  const { target, configFile } = await getNextConfig(failBuild, nextRoot)

  if (!configFile) {
    await writeFile(
      path.resolve(nextRoot, 'next.config.js'),
      `module.exports = {
  // Supported targets are "serverless" and "experimental-serverless-trace"
  target: "serverless",
  generateBuildId: () => "build"
}`,
    )
  }

  // If the next config exists, log warning if target isn't in acceptableTargets
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

  // We emulate Vercel so that we can set target to serverless if needed
  process.env.NOW_BUILDER = true
  // If no valid target is set, we use an internal Next env var to force it
  process.env.NEXT_PRIVATE_TARGET = 'serverless'

  // 🐉 We need Next to recalculate "isZeitNow" var so we can set the target, but it's
  // set as an import side effect so we need to clear the require cache first. 🐲
  // https://github.com/vercel/next.js/blob/canary/packages/next/telemetry/ci-info.ts

  delete require.cache[resolveNextModule('next/dist/telemetry/ci-info', nextRoot)]
  delete require.cache[
    resolveNextModule(
      [
        // next <= 11.0.1
        'next/dist/next-server/server/config',
        // next > 11.0.1
        'next/dist/server/config',
      ],
      nextRoot,
    )
  ]

  // Clear memoized cache
  getNextConfig.clear()

  // Force the new config to be generated
  await getNextConfig(failBuild, nextRoot)
  // Reset the value in case something else is looking for it
  process.env.NOW_BUILDER = false
}

module.exports = verifyBuildTarget
