// @ts-check
const path = require('path')

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

    const { images } = await getNextConfig(failBuild, siteRoot)

    await setupImageFunction({ constants, imageconfig: images, netlifyConfig })

    await writeRedirects({
      siteRoot,
      netlifyConfig,
    })

    // Some type of monorepo setup
    if (siteRoot !== process.cwd()) {
      copyNextDist(siteRoot)
    }
  },

  async onPostBuild({
    netlifyConfig,
    utils: {
      build: { failBuild },
      cache,
    },
  }) {
    const siteRoot = getNextRoot({ netlifyConfig })
    const { distDir } = await getNextConfig(failBuild, siteRoot)
    await saveCache({ cache, distDir, siteRoot })
  },
}
