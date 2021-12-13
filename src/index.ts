import { join, relative } from 'path'

import { NetlifyPlugin } from '@netlify/build'

import { ODB_FUNCTION_NAME } from './constants'
import { restoreCache, saveCache } from './helpers/cache'
import { getNextConfig, configureHandlerFunctions } from './helpers/config'
import { moveStaticPages, movePublicFiles, patchNextFiles, unpatchNextFiles } from './helpers/files'
import { generateFunctions, setupImageFunction, generatePagesResolver } from './helpers/functions'
import { generateRedirects } from './helpers/redirects'
import {
  verifyNetlifyBuildVersion,
  checkNextSiteHasBuilt,
  checkForRootPublish,
  checkZipSize,
  checkForOldFunctions,
} from './helpers/verification'

const plugin: NetlifyPlugin = {
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

    const { appDir, basePath, i18n, images, target, ignore, trailingSlash, outdir } = await getNextConfig({
      publish,
      failBuild,
    })

    configureHandlerFunctions({ netlifyConfig, ignore, publish: relative(process.cwd(), publish) })

    await generateFunctions(constants, appDir)
    await generatePagesResolver({ target, constants })

    await movePublicFiles({ appDir, outdir, publish })

    if (process.env.EXPERIMENTAL_ODB_TTL) {
      await patchNextFiles(basePath)
    }

    if (process.env.EXPERIMENTAL_MOVE_STATIC_PAGES) {
      console.log(
        "The flag 'EXPERIMENTAL_MOVE_STATIC_PAGES' is no longer required, as it is now the default. To disable this behavior, set the env var 'SERVE_STATIC_FILES_FROM_ORIGIN' to 'true'",
      )
    }

    if (!process.env.SERVE_STATIC_FILES_FROM_ORIGIN) {
      await moveStaticPages({ target, netlifyConfig, i18n })
    }

    await setupImageFunction({ constants, imageconfig: images, netlifyConfig, basePath })

    await generateRedirects({
      netlifyConfig,
      nextConfig: { basePath, i18n, trailingSlash, appDir },
    })
  },

  async onPostBuild({
    netlifyConfig,
    utils: {
      cache,
      functions,
      build: { failBuild },
    },
    constants: { FUNCTIONS_DIST },
  }) {
    await saveCache({ cache, publish: netlifyConfig.build.publish })
    await checkForOldFunctions({ functions })
    await checkZipSize(join(FUNCTIONS_DIST, `${ODB_FUNCTION_NAME}.zip`))
    const { basePath } = await getNextConfig({ publish: netlifyConfig.build.publish, failBuild })
    await unpatchNextFiles(basePath)
  },
}
module.exports = plugin
