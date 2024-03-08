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
  if (ctx.publishDir === ctx.resolve(ctx.packagePath)) {
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
  if (!existsSync(ctx.standaloneRootDir)) {
    ctx.failBuild(
      `Your publish directory does not contain expected Next.js build output, please make sure you are using Next.js version (${SUPPORTED_NEXT_VERSIONS})`,
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
