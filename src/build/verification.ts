import { existsSync } from 'node:fs'

import { satisfies } from 'semver'

import type { PluginContext } from './plugin-context.js'

const SUPPORTED_NEXT_VERSIONS = '>=13.5.0'

export function verifyPublishDir(ctx: PluginContext) {
  if (!existsSync(ctx.publishDir)) {
    ctx.failBuild(
      `Your publish directory was not found at: ${ctx.publishDir}, please check your build settings`,
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
      `Your publish directory cannot be the same as the base directory of your site, please check your build settings`,
    )
  }
  try {
    // `PluginContext.buildConfig` is getter and we only test wether it throws
    // and don't actually need to use its value
    // eslint-disable-next-line no-unused-expressions
    ctx.buildConfig
  } catch {
    ctx.failBuild(
      'Your publish directory does not contain expected Next.js build output, please check your build settings',
    )
  }
  if (
    (ctx.buildConfig.output === 'standalone' || ctx.buildConfig.output === undefined) &&
    !existsSync(ctx.standaloneRootDir)
  ) {
    ctx.failBuild(
      `Your publish directory does not contain expected Next.js build output, please make sure you are using Next.js version (${SUPPORTED_NEXT_VERSIONS})`,
    )
  }
  if (ctx.buildConfig.output === 'export' && !existsSync(ctx.resolveFromSiteDir('out'))) {
    ctx.failBuild(
      `Your export directory was not found at: ${ctx.resolveFromSiteDir(
        'out',
      )}, please check your build settings`,
    )
  }
}

export function verifyNextVersion(ctx: PluginContext, nextVersion: string): void | never {
  if (!satisfies(nextVersion, SUPPORTED_NEXT_VERSIONS, { includePrerelease: true })) {
    ctx.failBuild(
      `@netlify/plugin-next@5 requires Next.js version ${SUPPORTED_NEXT_VERSIONS}, but found ${nextVersion}. Please upgrade your project's Next.js version.`,
    )
  }
}

export function verifyBuildConfig(ctx: PluginContext) {
  if (ctx.buildConfig.experimental.ppr) {
    console.log(
      `Partial prerendering is not yet fully supported on Netlify, see https://ntl.fyi/nextjs-ppr for details`,
    )
  }
}
