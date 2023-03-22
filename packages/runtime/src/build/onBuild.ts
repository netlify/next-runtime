import { join, relative } from 'path'

import { bold, redBright } from 'chalk'
import destr from 'destr'
import { readFileSync } from 'fs-extra'
import { outdent } from 'outdent'

import {
  getNextConfig,
  getRequiredServerFiles,
  updateRequiredServerFiles,
  configureHandlerFunctions,
} from '../helpers/config'
import { writeEdgeFunctions, loadMiddlewareManifest, cleanupEdgeFunctions } from '../helpers/edge'
import { moveStaticPages, movePublicFiles, patchNextFiles } from '../helpers/files'
import {
  generateFunctions,
  setupImageFunction,
  generatePagesResolver,
  getExtendedApiRouteConfigs,
} from '../helpers/functions'
import { generateRedirects, generateStaticRedirects } from '../helpers/redirects'
import { shouldSkip, isNextAuthInstalled, getCustomImageResponseHeaders, getRemotePatterns } from '../helpers/utils'
import {
  checkNextSiteHasBuilt,
} from '../helpers/verification'

export const onBuild = async ({
  constants,
  netlifyConfig,
  utils: {
    build: { failBuild },
  },
}) => {
  if (shouldSkip()) {
    return
  }
  const { publish } = netlifyConfig.build

  checkNextSiteHasBuilt({ publish, failBuild })

  const { appDir, basePath, i18n, images, target, ignore, trailingSlash, outdir, experimental, routesManifest } =
    await getNextConfig({
      publish,
      failBuild,
    })
  await cleanupEdgeFunctions(constants)

  const middlewareManifest = await loadMiddlewareManifest(netlifyConfig)

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
    const config = await getRequiredServerFiles(publish)

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

  await configureHandlerFunctions({ netlifyConfig, ignore, publish: relative(process.cwd(), publish) })
  const apiRoutes = await getExtendedApiRouteConfigs(publish, appDir)

  await generateFunctions(constants, appDir, apiRoutes)
  await generatePagesResolver(constants)

  await movePublicFiles({ appDir, outdir, publish, basePath })

  await patchNextFiles(appDir)

  if (!destr(process.env.SERVE_STATIC_FILES_FROM_ORIGIN)) {
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
    remotePatterns: getRemotePatterns(experimental, images),
    responseHeaders: getCustomImageResponseHeaders(netlifyConfig.headers),
  })

  await generateRedirects({
    netlifyConfig,
    nextConfig: { basePath, i18n, trailingSlash, appDir },
    buildId,
    apiRoutes,
  })

  await writeEdgeFunctions({ netlifyConfig, routesManifest })
}
