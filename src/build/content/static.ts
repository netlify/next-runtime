import { existsSync } from 'node:fs'
import { cp, mkdir, rename, rm } from 'node:fs/promises'
import { join } from 'node:path'

import glob from 'fast-glob'

import { encodeBlobKey } from '../../shared/blobkey.js'
import { PluginContext } from '../plugin-context.js'

/**
 * Assemble the static content for being uploaded to the blob storage
 */
export const copyStaticContent = async (ctx: PluginContext): Promise<void> => {
  const srcDir = join(ctx.publishDir, 'server/pages')
  const destDir = ctx.blobDir

  const paths = await glob('**/*.+(html|json)', {
    cwd: srcDir,
    extglob: true,
  })

  try {
    await Promise.all(
      paths
        .filter((path) => !paths.includes(`${path.slice(0, -5)}.json`))
        .map(async (path): Promise<void> => {
          await cp(join(srcDir, path), join(destDir, await encodeBlobKey(path)), {
            recursive: true,
            force: true,
          })
        }),
    )
  } catch (error) {
    ctx.failBuild('Failed assembling static pages for upload', error)
  }
}

/**
 * Copy static content to the static dir so it is uploaded to the CDN
 */
export const copyStaticAssets = async (ctx: PluginContext): Promise<void> => {
  try {
    await rm(ctx.staticDir, { recursive: true, force: true })
    const { basePath } = await ctx.getRoutesManifest()
    if (existsSync(ctx.resolve('public'))) {
      await cp(ctx.resolve('public'), join(ctx.staticDir, basePath), { recursive: true })
    }
    if (existsSync(join(ctx.publishDir, 'static'))) {
      await cp(join(ctx.publishDir, 'static'), join(ctx.staticDir, basePath, '_next/static'), {
        recursive: true,
      })
    }
  } catch (error) {
    ctx.failBuild('Failed copying static assets', error)
  }
}

/**
 * Swap the static dir with the publish dir so it is uploaded to the CDN
 */
export const publishStaticDir = async (ctx: PluginContext): Promise<void> => {
  try {
    await rm(ctx.tempPublishDir, { recursive: true, force: true })
    await mkdir(ctx.tempPublishDir, { recursive: true })
    await rename(ctx.publishDir, ctx.tempPublishDir)
    await rename(ctx.staticDir, ctx.publishDir)
  } catch (error) {
    ctx.failBuild('Failed publishing static content', error instanceof Error ? { error } : {})
  }
}

/**
 * Restore the publish dir that was swapped with the static dir
 */
export const unpublishStaticDir = async (ctx: PluginContext): Promise<void> => {
  try {
    if (existsSync(ctx.tempPublishDir)) {
      await rename(ctx.publishDir, ctx.staticDir)
      await rename(ctx.tempPublishDir, ctx.publishDir)
    }
  } catch {
    // ignore
  }
}
