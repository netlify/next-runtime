// @ts-check
const path = require('path')

const { ODB_FUNCTION_NAME, HANDLER_FUNCTION_NAME } = require('./constants')
const { restoreCache, saveCache } = require('./helpers/cacheBuild')
const copyNextDist = require('./helpers/copyNextDist')
const generateFunctions = require('./helpers/generateFunctions')
const getNextConfig = require('./helpers/getNextConfig')
const getNextRoot = require('./helpers/getNextRoot')
const setIncludedFiles = require('./helpers/setIncludedFiles')
const setupImageFunction = require('./helpers/setupImageFunction')
const shouldSkipPlugin = require('./helpers/shouldSkipPlugin')
const verifyBuildTarget = require('./helpers/verifyBuildTarget')
const verifyNetlifyBuildVersion = require('./helpers/verifyNetlifyBuildVersion')
const verifyPublishDir = require('./helpers/verifyPublishDir')
const writeRedirects = require('./helpers/writeRedirects')

module.exports = {
  async onPreBuild({
    constants,
    netlifyConfig,
    packageJson,
    utils: {
      build: { failBuild },
      cache,
    },
  }) {
    if (shouldSkipPlugin({ netlifyConfig, packageJson, failBuild })) {
      return
    }

    verifyNetlifyBuildVersion({ failBuild, ...constants })

    const siteRoot = getNextRoot({ netlifyConfig })
    const { distDir, target } = await getNextConfig(failBuild, siteRoot)

    verifyPublishDir({ netlifyConfig, siteRoot, distDir, failBuild })

    verifyBuildTarget(target)

    setIncludedFiles({ netlifyConfig, distDir })

    await restoreCache({ cache, distDir, siteRoot })
  },

  async onBuild({
    constants,
    netlifyConfig,
    packageJson,
    utils: {
      build: { failBuild },
    },
  }) {
    if (shouldSkipPlugin({ netlifyConfig, packageJson, failBuild })) {
      return
    }

    await generateFunctions(constants)

    const siteRoot = getNextRoot({ netlifyConfig })

    const { distDir, images } = await getNextConfig(failBuild, siteRoot)

    await setupImageFunction({ constants, imageconfig: images, netlifyConfig })

    await writeRedirects({
      siteRoot,
      distDir,
      netlifyConfig,
    })

    // Some type of monorepo setup
    if (siteRoot !== process.cwd()) {
      copyNextDist(siteRoot)
    }
  },

  async onPostBuild({
    netlifyConfig,
    constants: { FUNCTIONS_DIST = '.netlify/functions' },
    utils: {
      build: { failBuild },
      run,
      cache,
    },
  }) {
    // Remove swc binaries from the zipfile if present. Yes, it's a hack, but it drops >10MB from the zipfile when bundling with zip-it-and-ship-it
    for (const func of [ODB_FUNCTION_NAME, HANDLER_FUNCTION_NAME]) {
      await run(`zip`, [`-d`, path.join(FUNCTIONS_DIST, `${func}.zip`), '*node_modules/@next/swc-*']).catch(() => {
        // This throws if there's none of these in the zipfile
      })
    }

    const siteRoot = getNextRoot({ netlifyConfig })
    const { distDir } = await getNextConfig(failBuild, siteRoot)
    await saveCache({ cache, distDir, siteRoot })
  },
}
