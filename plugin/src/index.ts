/* eslint-disable max-lines */
import { join, relative } from 'path'

import type { NetlifyPlugin } from '@netlify/build'
import { greenBright, yellowBright, bold } from 'chalk'
import { existsSync, readFileSync } from 'fs-extra'
import { outdent } from 'outdent'

import { HANDLER_FUNCTION_NAME, ODB_FUNCTION_NAME } from './constants'
import { restoreCache, saveCache } from './helpers/cache'
import {
  getNextConfig,
  getRequiredServerFiles,
  updateRequiredServerFiles,
  configureHandlerFunctions,
  generateCustomHeaders,
} from './helpers/config'
import { updateConfig, writeEdgeFunctions, loadMiddlewareManifest } from './helpers/edge'
import { moveStaticPages, movePublicFiles, patchNextFiles, unpatchNextFiles } from './helpers/files'
import { generateFunctions, setupImageFunction, generatePagesResolver } from './helpers/functions'
import { generateRedirects, generateStaticRedirects } from './helpers/redirects'
import { shouldSkip, isNextAuthInstalled } from './helpers/utils'
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

    let experimentalRemotePatterns = []
    const { appDir, basePath, i18n, images, target, ignore, trailingSlash, outdir, experimental } = await getNextConfig(
      {
        publish,
        failBuild,
      },
    )

    if (experimental.images) {
      experimentalRemotePatterns = experimental.images.remotePatterns || []
    }

    if (isNextAuthInstalled()) {
      const config = await getRequiredServerFiles(publish)

      const userDefinedNextAuthUrl = config.config.env.NEXTAUTH_URL

      if (userDefinedNextAuthUrl) {
        console.log(
          `NextAuth package detected, NEXTAUTH_URL environment variable set by user to ${userDefinedNextAuthUrl}`,
        )
      } else {
        const nextAuthUrl = `${process.env.URL}${basePath}`

        console.log(`NextAuth package detected, setting NEXTAUTH_URL environment variable to ${nextAuthUrl}`)
        config.config.env.NEXTAUTH_URL = nextAuthUrl

        await updateRequiredServerFiles(publish, config)
      }
    }

    const buildId = readFileSync(join(publish, 'BUILD_ID'), 'utf8').trim()

    await configureHandlerFunctions({ netlifyConfig, ignore, publish: relative(process.cwd(), publish) })

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

    await setupImageFunction({
      constants,
      imageconfig: images,
      netlifyConfig,
      basePath,
      remotePatterns: experimentalRemotePatterns,
    })

    await generateRedirects({
      netlifyConfig,
      nextConfig: { basePath, i18n, trailingSlash, appDir },
      buildId,
    })

    // We call this even if we don't have edge functions enabled because we still use it for images
    await writeEdgeFunctions(netlifyConfig)

    if (process.env.NEXT_USE_NETLIFY_EDGE) {
      console.log(outdent`
        ✨ Deploying to ${greenBright`Netlify Edge Functions`} ✨
        This feature is in beta. Please share your feedback here: https://ntl.fyi/next-netlify-edge
      `)
      await updateConfig(publish)
    }

    const middlewareManifest = await loadMiddlewareManifest(netlifyConfig)

    if (!process.env.NEXT_USE_NETLIFY_EDGE && middlewareManifest?.sortedMiddleware?.length) {
      console.log(
        yellowBright(outdent`
          You are using Next.js Middleware without Netlify Edge Functions.
          This will soon be deprecated because it negatively affects performance and will disable ISR and static rendering.
          To get the best performance and use Netlify Edge Functions, set the env var ${bold`NEXT_USE_NETLIFY_EDGE=true`}.
        `),
      )
    }
  },

  async onPostBuild({
    netlifyConfig: {
      build: { publish },
      redirects,
      headers,
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
    const nextConfig = await getNextConfig({ publish, failBuild })

    const { basePath, appDir } = nextConfig

    generateCustomHeaders(nextConfig, headers)

    warnForProblematicUserRewrites({ basePath, redirects })
    warnForRootRedirects({ appDir })
    await unpatchNextFiles(basePath)
  },
}
module.exports = plugin
/* eslint-enable max-lines */
