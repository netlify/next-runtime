import { existsSync } from 'node:fs'
import { cp, mkdir, readFile, rename, rm } from 'node:fs/promises'
import { basename, join } from 'node:path'

import { trace } from '@opentelemetry/api'
import { wrapTracer } from '@opentelemetry/api/experimental'
import glob from 'fast-glob'

import { PluginContext } from '../plugin-context.js'
import { verifyNetlifyForms } from '../verification.js'

const tracer = wrapTracer(trace.getTracer('Next runtime'))

/**
 * Assemble the static content for being uploaded to the blob storage
 */
export const copyStaticContent = async (ctx: PluginContext): Promise<void> => {
  return tracer.withActiveSpan('copyStaticContent', async () => {
    const srcDir = join(ctx.publishDir, 'server/pages')
    const destDir = ctx.blobDir

    const paths = await glob('**/*.+(html|json)', {
      cwd: srcDir,
      extglob: true,
    })

    try {
      await mkdir(destDir, { recursive: true })
      await Promise.all(
        paths
          .filter((path) => !paths.includes(`${path.slice(0, -5)}.json`))
          .map(async (path): Promise<void> => {
            const html = await readFile(join(srcDir, path), 'utf-8')
            verifyNetlifyForms(ctx, html)
            await ctx.setBlob(path, html)
          }),
      )
    } catch (error) {
      ctx.failBuild('Failed assembling static pages for upload', error)
    }
  })
}

/**
 * Copy static content to the static dir so it is uploaded to the CDN
 */
export const copyStaticAssets = async (ctx: PluginContext): Promise<void> => {
  return tracer.withActiveSpan('copyStaticAssets', async (span): Promise<void> => {
    try {
      await rm(ctx.staticDir, { recursive: true, force: true })
      const { basePath } = await ctx.getRoutesManifest()
      if (existsSync(ctx.resolveFromSiteDir('public'))) {
        await cp(ctx.resolveFromSiteDir('public'), join(ctx.staticDir, basePath), {
          recursive: true,
        })
      }
      if (existsSync(join(ctx.publishDir, 'static'))) {
        await cp(join(ctx.publishDir, 'static'), join(ctx.staticDir, basePath, '_next/static'), {
          recursive: true,
        })
      }
    } catch (error) {
      span.end()
      ctx.failBuild('Failed copying static assets', error)
    }
  })
}

export const copyStaticExport = async (ctx: PluginContext): Promise<void> => {
  await tracer.withActiveSpan('copyStaticExport', async () => {
    if (!ctx.exportDetail?.outDirectory) {
      ctx.failBuild('Export directory not found')
    }
    try {
      await rm(ctx.staticDir, { recursive: true, force: true })
      await cp(ctx.exportDetail.outDirectory, ctx.staticDir, { recursive: true })
    } catch (error) {
      ctx.failBuild('Failed copying static export', error)
    }
  })
}

/**
 * Swap the static dir with the publish dir so it is uploaded to the CDN
 */
export const publishStaticDir = async (ctx: PluginContext): Promise<void> => {
  try {
    await rm(ctx.tempPublishDir, { recursive: true, force: true })
    await mkdir(basename(ctx.tempPublishDir), { recursive: true })
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
