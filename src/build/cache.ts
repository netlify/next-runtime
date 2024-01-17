import { existsSync } from 'node:fs'
import { join } from 'node:path'

import type { PluginContext } from './plugin-context.js'

export const saveBuildCache = async (ctx: PluginContext) => {
  if (await ctx.utils.cache.save(join(ctx.publishDir, 'cache'))) {
    console.log('Next.js cache saved.')
  } else {
    console.log('No Next.js cache to save.')
  }
}

export const restoreBuildCache = async (ctx: PluginContext) => {
  const { cache } = ctx.utils

  if (existsSync(join(ctx.publishDir, 'cache'))) {
    console.log('Next.js cache found.')
  } else if (await cache.restore(join(ctx.publishDir, 'cache'))) {
    console.log('Next.js cache restored.')
  } else {
    console.log('No Next.js cache to restore.')
  }
}
