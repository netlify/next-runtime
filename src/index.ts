import { existsSync } from 'node:fs'

import type { NetlifyPluginOptions } from '@netlify/build'

import { restoreBuildCache, saveBuildCache } from './build/cache.js'
import { copyFetchContent, copyPrerenderedContent } from './build/content/prerendered.js'
import {
  copyStaticAssets,
  copyStaticContent,
  publishStaticDir,
  unpublishStaticDir,
} from './build/content/static.js'
import { createEdgeHandlers } from './build/functions/edge.js'
import { createServerHandler } from './build/functions/server.js'
import { PluginContext } from './build/plugin-context.js'

export const onPreBuild = async (options: NetlifyPluginOptions) => {
  // Enable Next.js standalone mode at build time
  process.env.NEXT_PRIVATE_STANDALONE = 'true'
  await restoreBuildCache(new PluginContext(options))
}

export const onBuild = async (options: NetlifyPluginOptions) => {
  const ctx = new PluginContext(options)
  if (!existsSync(ctx.publishDir)) {
    ctx.failBuild('Publish directory not found, please check your netlify.toml')
  }
  await saveBuildCache(ctx)

  await Promise.all([
    copyStaticAssets(ctx),
    copyStaticContent(ctx),
    copyPrerenderedContent(ctx),
    copyFetchContent(ctx),
    createServerHandler(ctx),
    createEdgeHandlers(ctx),
  ])
}

export const onPostBuild = async (options: NetlifyPluginOptions) => {
  await publishStaticDir(new PluginContext(options))
}

export const onEnd = async (options: NetlifyPluginOptions) => {
  await unpublishStaticDir(new PluginContext(options))
}
