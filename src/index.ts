import { join, relative } from 'path'

import { NetlifyPlugin } from '@netlify/build'
import { existsSync } from 'fs-extra'

import { HANDLER_FUNCTION_NAME, ODB_FUNCTION_NAME } from './constants'
import { restoreCache, saveCache } from './helpers/cache'
import { getNextConfig, configureHandlerFunctions } from './helpers/config'
import { moveStaticPages, movePublicFiles, patchNextFiles, unpatchNextFiles } from './helpers/files'
import { generateFunctions, setupImageFunction, generatePagesResolver } from './helpers/functions'
import { generateRedirects, generateStaticRedirects } from './helpers/redirects'
import { shouldSkip } from './helpers/utils'
import {
  verifyNetlifyBuildVersion,
  checkNextSiteHasBuilt,
  checkForRootPublish,
  checkZipSize,
  checkForOldFunctions,
  warnForProblematicUserRewrites,
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
    if (shouldSkip()) {
      await restoreCache({ cache, publish })
      console.log('Not running Essential Next.js plugin')
      if (existsSync(join(constants.INTERNAL_FUNCTIONS_SRC, HANDLER_FUNCTION_NAME))) {
        console.log(`Please ensure you remove any generated functions from ${constants.INTERNAL_FUNCTIONS_SRC}`)
      }
      return
    }
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
    if (shouldSkip()) {
      return
    }
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

    await generateStaticRedirects({
      netlifyConfig,
      nextConfig: { basePath, i18n },
    })

    await setupImageFunction({ constants, imageconfig: images, netlifyConfig, basePath })

    await generateRedirects({
      netlifyConfig,
      nextConfig: { basePath, i18n, trailingSlash, appDir },
    })
  },

  async onPostBuild({
    netlifyConfig: {
      build: { publish },
      redirects,
    },
    utils: {
      status,
      cache,
      functions,
      build: { failBuild },
    },
    constants: { FUNCTIONS_DIST },
  }) {
    await saveCache({ cache, publish })

    if (shouldSkip()) {
      status.show({
        title: 'Essential Next.js plugin did not run',
        summary: `Next cache was stored, but all other functions were skipped because ${
          process.env.NETLIFY_NEXT_PLUGIN_SKIP
            ? `NETLIFY_NEXT_PLUGIN_SKIP is set`
            : `NEXT_PLUGIN_FORCE_RUN is set to ${process.env.NEXT_PLUGIN_FORCE_RUN}`
        }`,
      })
      return
    }

    await checkForOldFunctions({ functions })
    await checkZipSize(join(FUNCTIONS_DIST, `${ODB_FUNCTION_NAME}.zip`))
    const { basePath } = await getNextConfig({ publish, failBuild })
    warnForProblematicUserRewrites({ basePath, redirects })
    await unpatchNextFiles(basePath)
  },
}
module.exports = plugin
