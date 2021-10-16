// @ts-check

const { join, relative } = require('path')

const { copy, existsSync } = require('fs-extra')

const { restoreCache, saveCache } = require('./helpers/cache')
const { getNextConfig, configureHandlerFunctions, generateRedirects } = require('./helpers/config')
const { generateFunctions, setupImageFunction, generatePagesResolver } = require('./helpers/functions')
const {
  verifyNetlifyBuildVersion,
  checkNextSiteHasBuilt,
  verifyBuildTarget,
  checkForRootPublish,
  logBetaMessage,
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
    logBetaMessage()
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

    const { appDir, basePath, i18n, images, target } = await getNextConfig({ publish, failBuild })

    verifyBuildTarget(target)

    configureHandlerFunctions({ netlifyConfig, publish: relative(process.cwd(), publish) })

    await generateFunctions(constants, appDir)
    await generatePagesResolver({ netlifyConfig, target, constants })

    const publicDir = join(appDir, 'public')
    if (existsSync(publicDir)) {
      await copy(publicDir, `${publish}/`)
    }
    await setupImageFunction({ constants, imageconfig: images, netlifyConfig, basePath })

    await generateRedirects({
      netlifyConfig,
      basePath,
      i18n,
    })
  },

  async onPostBuild({ netlifyConfig, utils: { cache } }) {
    return saveCache({ cache, publish: netlifyConfig.build.publish })
  },
  onEnd() {
    logBetaMessage()
  },
}
