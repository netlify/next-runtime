// @ts-check

const { join } = require('path')

const { copy } = require('fs-extra')

const { ODB_FUNCTION_NAME, HANDLER_FUNCTION_NAME } = require('./constants')
const { restoreCache, saveCache } = require('./helpers/cache')
const { getNextConfig, setIncludedFiles, generateRedirects, setBundler } = require('./helpers/config')
const { generateFunctions, setupImageFunction } = require('./helpers/functions')
const {
  verifyNetlifyBuildVersion,
  checkNextSiteHasBuilt,
  verifyBuildTarget,
  checkForRootPublish,
} = require('./helpers/verification')

module.exports = {
  async onPreBuild({
    constants,
    netlifyConfig,
    utils: {
      build: { failBuild },
      cache,
    },
  }) {
    const { publish } = netlifyConfig.build
    checkForRootPublish({ publish, failBuild })
    verifyNetlifyBuildVersion({ failBuild, ...constants })

    await restoreCache({ cache, publish })
  },

  async onBuild({
    constants,
    netlifyConfig,
    utils: {
      build: { failBuild },
    },
  }) {
    const { publish } = netlifyConfig.build

    checkNextSiteHasBuilt({ publish, failBuild })

    const { images, target, appDir } = await getNextConfig({ publish, failBuild })

    setBundler({ netlifyConfig, target })

    verifyBuildTarget(target)

    setIncludedFiles({ netlifyConfig, publish })

    await generateFunctions(constants, appDir)

    await copy(`${appDir}/public`, `${publish}/`)

    await setupImageFunction({ constants, imageconfig: images, netlifyConfig })

    await generateRedirects({
      netlifyConfig,
    })
  },

  async onPostBuild({ netlifyConfig, constants: { FUNCTIONS_DIST = '.netlify/functions' }, utils: { run, cache } }) {
    // Remove swc binaries from the zipfile if present. Yes, it's a hack, but it drops >10MB from the zipfile when bundling with zip-it-and-ship-it
    for (const func of [ODB_FUNCTION_NAME, HANDLER_FUNCTION_NAME]) {
      await run(`zip`, [`-d`, join(FUNCTIONS_DIST, `${func}.zip`), '*node_modules/@next/swc-*']).catch(() => {
        // This throws if there's none of these in the zipfile
      })
    }

    return saveCache({ cache, publish: netlifyConfig.build.publish })
  },
}
