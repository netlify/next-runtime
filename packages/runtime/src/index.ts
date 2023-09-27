import { join, relative } from 'path'

import type { Blobs as IBlobs } from '@netlify/blobs/dist/src/main'
import type { NetlifyPlugin, NetlifyPluginConstants, NetlifyPluginOptions } from '@netlify/build/types'
import { bold, redBright } from 'chalk'
import destr from 'destr'
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
import { onPreDev } from './helpers/dev'
import { writeEdgeFunctions, loadMiddlewareManifest, cleanupEdgeFunctions } from './helpers/edge'
import { moveStaticPages, movePublicFiles, removeMetadataFiles } from './helpers/files'
import { bundleBasedOnNftFiles, splitApiRoutes } from './helpers/flags'
import {
  generateFunctions,
  setupImageFunction,
  generatePagesResolver,
  warnOnApiRoutes,
  getAPILambdas,
  packSingleFunction,
  getExtendedApiRouteConfigs,
  APILambda,
  getSSRLambdas,
} from './helpers/functions'
import { generateRedirects, generateStaticRedirects } from './helpers/redirects'
import { shouldSkip, isNextAuthInstalled, getCustomImageResponseHeaders, getRemotePatterns } from './helpers/utils'
import {
  verifyNetlifyBuildVersion,
  checkNextSiteHasBuilt,
  checkForRootPublish,
  checkZipSize,
  checkForOldFunctions,
  warnForProblematicUserRewrites,
  warnForRootRedirects,
} from './helpers/verification'
import { Blobs, isBlobStorageAvailable } from './templates/blobStorage'

type EnhancedNetlifyPluginConstants = NetlifyPluginConstants & {
  NETLIFY_API_HOST?: string
  NETLIFY_API_TOKEN?: string
}

type EnhancedNetlifyPluginOptions = NetlifyPluginOptions & { constants: EnhancedNetlifyPluginConstants } & {
  featureFlags?: Record<string, unknown>
}

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
      console.log('Not running Next Runtime')
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

  // eslint-disable-next-line max-lines-per-function
  async onBuild({
    constants,
    netlifyConfig,
    utils: {
      build: { failBuild },
    },
    featureFlags = {},
  }: EnhancedNetlifyPluginOptions) {
    if (shouldSkip()) {
      return
    }
    const { publish } = netlifyConfig.build

    checkNextSiteHasBuilt({ publish, failBuild })

    const {
      appDir,
      basePath,
      i18n,
      images,
      target,
      ignore,
      trailingSlash,
      outdir,
      experimental,
      routesManifest,
      pageExtensions,
    } = await getNextConfig({
      publish,
      failBuild,
    })
    await cleanupEdgeFunctions(constants)

    const middlewareManifest = await loadMiddlewareManifest(netlifyConfig)
    const config = await getRequiredServerFiles(publish)

    if (
      middlewareManifest?.functions &&
      Object.keys(middlewareManifest.functions).length !== 0 &&
      destr(process.env.NEXT_DISABLE_NETLIFY_EDGE)
    ) {
      failBuild(outdent`
        You are using Next.js experimental edge runtime, but have set NEXT_DISABLE_NETLIFY_EDGE to true. This is not supported.
        To use edge runtime, remove the env var ${bold`NEXT_DISABLE_NETLIFY_EDGE`}.
      `)
    }

    if (
      middlewareManifest?.middleware &&
      Object.keys(middlewareManifest.middleware).length !== 0 &&
      destr(process.env.NEXT_DISABLE_NETLIFY_EDGE)
    ) {
      console.log(
        redBright(outdent`
          You are using Next.js Middleware without Netlify Edge Functions.
          This is deprecated because it negatively affects performance and will disable ISR and static rendering.
          It also disables advanced middleware features from @netlify/next
          To get the best performance and use Netlify Edge Functions, remove the env var ${bold`NEXT_DISABLE_NETLIFY_EDGE`}.
        `),
      )
    }

    if (isNextAuthInstalled()) {
      const userDefinedNextAuthUrl = config.config.env.NEXTAUTH_URL

      if (userDefinedNextAuthUrl) {
        console.log(
          `NextAuth package detected, NEXTAUTH_URL environment variable set by user in next.config.js to ${userDefinedNextAuthUrl}`,
        )
      } else if (process.env.NEXTAUTH_URL) {
        // When the value is specified in the netlify.toml or the Netlify UI (will be evaluated in this order)
        const nextAuthUrl = `${process.env.NEXTAUTH_URL}${basePath}`

        console.log(
          `NextAuth package detected, NEXTAUTH_URL environment variable set by user in Netlify configuration to ${nextAuthUrl}`,
        )
        config.config.env.NEXTAUTH_URL = nextAuthUrl

        await updateRequiredServerFiles(publish, config)
      } else {
        // Using the deploy prime url in production leads to issues because the unique deploy ID is part of the generated URL
        // and will not match the expected URL in the callback URL of an OAuth application.
        const nextAuthUrl = `${
          process.env.CONTEXT === 'production' ? process.env.URL : process.env.DEPLOY_PRIME_URL
        }${basePath}`

        console.log(`NextAuth package detected, setting NEXTAUTH_URL environment variable to ${nextAuthUrl}`)
        config.config.env.NEXTAUTH_URL = nextAuthUrl

        await updateRequiredServerFiles(publish, config)
      }
    }

    const buildId = readFileSync(join(publish, 'BUILD_ID'), 'utf8').trim()

    const apiLambdas: APILambda[] = splitApiRoutes(featureFlags, publish)
      ? await getAPILambdas(publish, appDir, pageExtensions)
      : await getExtendedApiRouteConfigs(publish, appDir, pageExtensions).then((extendedRoutes) =>
          extendedRoutes.map(packSingleFunction),
        )

    const ssrLambdas = bundleBasedOnNftFiles(featureFlags) ? await getSSRLambdas(publish) : []
    await generateFunctions(constants, appDir, apiLambdas, ssrLambdas)
    await generatePagesResolver(constants)

    await configureHandlerFunctions({
      netlifyConfig,
      ignore,
      publish: relative(process.cwd(), publish),
      apiLambdas,
      ssrLambdas,
      splitApiRoutes: splitApiRoutes(featureFlags, publish),
    })

    await movePublicFiles({ appDir, outdir, publish, basePath })

    if (!destr(process.env.SERVE_STATIC_FILES_FROM_ORIGIN)) {
      const { NETLIFY_API_HOST, NETLIFY_API_TOKEN, SITE_ID } = constants

      const testBlobStorage = new Blobs({
        authentication: {
          apiURL: `https://${NETLIFY_API_HOST}`,
          token: NETLIFY_API_TOKEN,
        },
        context: `deploy:${process.env.DEPLOY_ID}`,
        // context: `deploy:650c4da1c2e4f734db8855c2`,
        siteID: SITE_ID,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any) as unknown as IBlobs

      console.log('get blob storage', {
        context: `deploy:${process.env.DEPLOY_ID}`,
        testBlobStorage,
        available: await isBlobStorageAvailable(testBlobStorage),
      })

      const netliBlob = (await isBlobStorageAvailable(testBlobStorage)) ? testBlobStorage : undefined

      await moveStaticPages({ target, netlifyConfig, nextConfig: { basePath, i18n, trailingSlash }, netliBlob })
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
      remotePatterns: getRemotePatterns(experimental, images),
      responseHeaders: getCustomImageResponseHeaders(netlifyConfig.headers),
    })

    await generateRedirects({
      netlifyConfig,
      nextConfig: { basePath, i18n, trailingSlash, appDir },
      buildId,
      apiLambdas,
    })

    await writeEdgeFunctions({ constants, netlifyConfig, routesManifest })
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
        title: 'Next Runtime did not run',
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

    const { basePath, appDir, experimental } = nextConfig

    generateCustomHeaders(nextConfig, headers)

    warnForProblematicUserRewrites({ basePath, redirects })
    warnForRootRedirects({ appDir })
    await warnOnApiRoutes({ FUNCTIONS_DIST })

    // we are removing metadata files from Publish directory
    // we have to do this after functions were bundled as bundling still
    // require those files, but we don't want to publish them
    await removeMetadataFiles(publish)

    if (experimental?.appDir) {
      console.log(
        '🧪 Thank you for testing "appDir" support on Netlify. For known issues and to give feedback, visit https://ntl.fyi/next-13-feedback',
      )
    }
  },
}
// The types haven't been updated yet
const nextRuntime = (
  _inputs,
  meta: { events?: Set<string> } = {},
): NetlifyPlugin & { onPreDev?: NetlifyPlugin['onPreBuild'] } => {
  if (!meta?.events?.has('onPreDev')) {
    return {
      ...plugin,
      onEnd: ({ utils }) => {
        utils.status.show({
          title: 'Please upgrade to the latest version of the Netlify CLI',
          summary:
            'To support for the latest Next.js features, please upgrade to the latest version of the Netlify CLI',
        })
      },
    }
  }
  return {
    ...plugin,
    onPreDev,
  }
}

module.exports = nextRuntime
