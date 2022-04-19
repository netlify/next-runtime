import { join, relative } from 'path'

import type { NetlifyPlugin } from '@netlify/build'
import { greenBright } from 'chalk'
import { existsSync, readFileSync } from 'fs-extra'
import { outdent } from 'outdent'

import { HANDLER_FUNCTION_NAME, ODB_FUNCTION_NAME } from './constants'
import { restoreCache, saveCache } from './helpers/cache'
import { getNextConfig, configureHandlerFunctions } from './helpers/config'
import { updateConfig, writeMiddleware } from './helpers/edge'
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
  warnForRootRedirects,
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

    const buildId = readFileSync(join(publish, 'BUILD_ID'), 'utf8').trim()

    configureHandlerFunctions({ netlifyConfig, ignore, publish: relative(process.cwd(), publish) })

    await generateFunctions(constants, appDir)
    await generatePagesResolver({ target, constants })

    await movePublicFiles({ appDir, outdir, publish })

    await patchNextFiles(basePath)

    if (!process.env.SERVE_STATIC_FILES_FROM_ORIGIN) {
      await moveStaticPages({ target, netlifyConfig, i18n, basePath })
    }

    await generateStaticRedirects({
      netlifyConfig,
      nextConfig: { basePath, i18n },
    })

    await setupImageFunction({ constants, imageconfig: images, netlifyConfig, basePath })

    await generateRedirects({
      netlifyConfig,
      nextConfig: { basePath, i18n, trailingSlash, appDir },
      buildId,
    })

    if (process.env.NEXT_USE_NETLIFY_EDGE) {
      console.log(outdent`
        ✨ Deploying to ${greenBright`Netlify Edge Functions`} ✨
        This feature is in beta. Please share your feedback here: https://ntl.fyi/next-netlify-edge
      `)
      await writeMiddleware(netlifyConfig)
      await updateConfig(publish)
    }
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
    const { basePath, appDir } = await getNextConfig({ publish, failBuild })
    warnForProblematicUserRewrites({ basePath, redirects })
    warnForRootRedirects({ appDir })
    await unpatchNextFiles(basePath)
  },
}
module.exports = plugin
