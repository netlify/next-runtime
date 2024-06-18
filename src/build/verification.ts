import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { satisfies } from 'semver'

import { ApiRouteType, getAPIRoutesConfigs } from './advanced-api-routes.js'
import type { PluginContext } from './plugin-context.js'

const SUPPORTED_NEXT_VERSIONS = '>=13.5.0'

export function verifyPublishDir(ctx: PluginContext) {
  if (!existsSync(ctx.publishDir)) {
    ctx.failBuild(
      `Your publish directory was not found at: ${ctx.publishDir}. Please check your build settings`,
    )
  }
  // for next.js sites the publish directory should never equal the package path which should be
  // root of site project (where site's package.json is located)
  // it always must point to Next.js `distDir` directory:
  //  - by default will be`<packagePath>/.next`
  //  - users might configure distDir in next.config.js and for most cases of that it will be
  //    somewhere nested under packagePath, but there are cases (like nx-integrated) where
  //    that directory will be above packagePath
  if (ctx.publishDir === ctx.resolveFromPackagePath('')) {
    ctx.failBuild(
      `Your publish directory cannot be the same as the base directory of your site. Please check your build settings`,
    )
  }
  try {
    // `PluginContext.buildConfig` is getter and we only test whether it throws
    // and don't actually need to use its value
    // eslint-disable-next-line no-unused-expressions
    ctx.buildConfig
  } catch {
    ctx.failBuild(
      'Your publish directory does not contain expected Next.js build output. Please check your build settings',
    )
  }
  if (ctx.buildConfig.output === 'standalone' || ctx.buildConfig.output === undefined) {
    if (!existsSync(join(ctx.publishDir, 'BUILD_ID'))) {
      ctx.failBuild(
        'Your publish directory does not contain expected Next.js build output. Please check your build settings',
      )
    }
    if (!existsSync(ctx.standaloneRootDir)) {
      ctx.failBuild(
        `Your publish directory does not contain expected Next.js build output. Please make sure you are using Next.js version (${SUPPORTED_NEXT_VERSIONS})`,
      )
    }

    if (
      ctx.nextVersion &&
      !satisfies(ctx.nextVersion, SUPPORTED_NEXT_VERSIONS, { includePrerelease: true })
    ) {
      ctx.failBuild(
        `@netlify/plugin-next@5 requires Next.js version ${SUPPORTED_NEXT_VERSIONS}, but found ${ctx.nextVersion}. Please upgrade your project's Next.js version.`,
      )
    }
  }
  if (ctx.buildConfig.output === 'export') {
    if (!ctx.exportDetail?.success) {
      ctx.failBuild(`Your export failed to build. Please check your build settings`)
    }
    if (!existsSync(ctx.exportDetail?.outDirectory)) {
      ctx.failBuild(
        `Your export directory was not found at: ${ctx.exportDetail?.outDirectory}. Please check your build settings`,
      )
    }
  }
}

export async function verifyNoAdvancedAPIRoutes(ctx: PluginContext) {
  const apiRoutesConfigs = await getAPIRoutesConfigs(ctx)

  const unsupportedAPIRoutes = apiRoutesConfigs.filter((apiRouteConfig) => {
    return (
      apiRouteConfig.config.type === ApiRouteType.BACKGROUND ||
      apiRouteConfig.config.type === ApiRouteType.SCHEDULED
    )
  })

  if (unsupportedAPIRoutes.length !== 0) {
    ctx.failBuild(
      `@netlify/plugin-next@5 does not support advanced API routes. The following API routes should be migrated to Netlify background or scheduled functions:\n${unsupportedAPIRoutes.map((apiRouteConfig) => ` - ${apiRouteConfig.apiRoute} (type: "${apiRouteConfig.config.type}")`).join('\n')}\n\nRefer to https://ntl.fyi/next-scheduled-bg-function-migration as migration example.`,
    )
  }
}
