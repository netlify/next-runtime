const { join, relative } = require('path')

const { ODB_FUNCTION_NAME } = require('./constants')
const { restoreCache, saveCache } = require('./helpers/cache')
const { getNextConfig, configureHandlerFunctions, generateRedirects } = require('./helpers/config')
const { moveStaticPages, movePublicFiles } = require('./helpers/files')
const { generateFunctions, setupImageFunction, generatePagesResolver } = require('./helpers/functions')
const {
  verifyNetlifyBuildVersion,
  checkNextSiteHasBuilt,
  checkForRootPublish,
  logBetaMessage,
  checkZipSize,
  checkForOldFunctions,
} = require('./helpers/verification')

/** @type import("@netlify/build").NetlifyPlugin */
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

    netlifyConfig.build.environment ||= {}
    // eslint-disable-next-line unicorn/consistent-destructuring
    netlifyConfig.build.environment.NEXT_PRIVATE_TARGET = 'server'
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

    const { appDir, basePath, i18n, images, target, ignore } = await getNextConfig({ publish, failBuild })

    configureHandlerFunctions({ netlifyConfig, ignore, publish: relative(process.cwd(), publish) })

    await generateFunctions(constants, appDir)
    await generatePagesResolver({ netlifyConfig, target, constants })

    await movePublicFiles({ appDir, publish })

    if (process.env.EXPERIMENTAL_MOVE_STATIC_PAGES) {
      console.log(
        "The flag 'EXPERIMENTAL_MOVE_STATIC_PAGES' is no longer required, as it is now the default. To disable this behavior, set the env var 'SERVE_STATIC_FILES_FROM_ORIGIN' to 'true'",
      )
    }

    if (!process.env.SERVE_STATIC_FILES_FROM_ORIGIN) {
      await moveStaticPages({ target, failBuild, netlifyConfig, i18n })
    }

    await setupImageFunction({ constants, imageconfig: images, netlifyConfig, basePath })

    await generateRedirects({
      netlifyConfig,
      basePath,
      i18n,
    })
  },

  async onPostBuild({ netlifyConfig, utils: { cache, functions }, constants: { FUNCTIONS_DIST } }) {
    await saveCache({ cache, publish: netlifyConfig.build.publish })
    await checkForOldFunctions({ functions })
    await checkZipSize(join(FUNCTIONS_DIST, `${ODB_FUNCTION_NAME}.zip`))
  },
  onEnd() {
    logBetaMessage()
  },
}
