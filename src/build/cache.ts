import { existsSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'

import type { PluginContext } from './plugin-context.js'

export const saveBuildCache = async (ctx: PluginContext) => {
  const { cache } = ctx.utils
  const cacheDir = join(ctx.publishDir, 'cache')

  if (existsSync(cacheDir)) {
    // remove the fetch responses because they are never updated once
    // created at build time and would always be stale if saved
    await rm(join(cacheDir, 'fetch-cache'), { recursive: true, force: true })

    await cache.save(cacheDir)

    console.log('Next.js cache saved')
  } else {
    console.log('No Next.js cache to save')
  }
}

export const restoreBuildCache = async (ctx: PluginContext) => {
  const { cache } = ctx.utils
  const cacheDir = join(ctx.publishDir, 'cache')

  if (await cache.restore(cacheDir)) {
    console.log('Next.js cache restored')
  } else {
    console.log('No Next.js cache to restore')
  }
}
