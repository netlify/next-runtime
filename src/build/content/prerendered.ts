import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import glob from 'fast-glob'

import type {
  CacheValue,
  FetchCacheValue,
  PageCacheValue,
  PluginContext,
  RouteCacheValue,
} from '../plugin-context.js'

/**
 * Normalize routes by stripping leading slashes and ensuring root path is index
 */
const routeToFilePath = (path: string) => path.replace(/^\//, '') || 'index'

const buildPagesCacheValue = async (path: string): Promise<PageCacheValue> => ({
  kind: 'PAGE',
  html: await readFile(`${path}.html`, 'utf-8'),
  pageData: JSON.parse(await readFile(`${path}.json`, 'utf-8')),
})

const buildAppCacheValue = async (path: string): Promise<PageCacheValue> => ({
  kind: 'PAGE',
  html: await readFile(`${path}.html`, 'utf-8'),
  pageData: await readFile(`${path}.rsc`, 'utf-8'),
  ...JSON.parse(await readFile(`${path}.meta`, 'utf-8')),
})

const buildRouteCacheValue = async (path: string): Promise<RouteCacheValue> => ({
  kind: 'ROUTE',
  body: await readFile(`${path}.body`, 'utf-8'),
  ...JSON.parse(await readFile(`${path}.meta`, 'utf-8')),
})

const buildFetchCacheValue = async (path: string): Promise<FetchCacheValue> => ({
  kind: 'FETCH',
  ...JSON.parse(await readFile(path, 'utf-8')),
})

/**
 * Upload prerendered content to the blob store
 */
export const copyPrerenderedContent = async (ctx: PluginContext): Promise<void> => {
  try {
    // read prerendered content and build JSON key/values for the blob store
    const manifest = await ctx.getPrerenderManifest()

    await Promise.all(
      Object.entries(manifest.routes).map(async ([route, meta]): Promise<void> => {
        const key = routeToFilePath(route)
        let value: CacheValue
        switch (true) {
          // Parallel route default layout has no prerendered page
          case meta.dataRoute?.endsWith('/default.rsc') &&
            !existsSync(join(ctx.publishDir, 'server/app', `${key}.html`)):
            return
          case meta.dataRoute?.endsWith('.json'):
            value = await buildPagesCacheValue(join(ctx.publishDir, 'server/pages', key))
            break
          case meta.dataRoute?.endsWith('.rsc'):
            value = await buildAppCacheValue(join(ctx.publishDir, 'server/app', key))
            break
          case meta.dataRoute === null:
            value = await buildRouteCacheValue(join(ctx.publishDir, 'server/app', key))
            break
          default:
            throw new Error(`Unrecognized content: ${route}`)
        }

        await ctx.writeCacheEntry(key, value)
      }),
    )

    // app router 404 pages are not in the prerender manifest
    // so we need to check for them manually
    if (existsSync(join(ctx.publishDir, `server/app/_not-found.html`))) {
      const key = '404'
      const value = await buildAppCacheValue(join(ctx.publishDir, 'server/app/_not-found'))
      await ctx.writeCacheEntry(key, value)
    }
  } catch (error) {
    ctx.failBuild('Failed assembling prerendered content for upload', error)
  }
}

/**
 * Upload fetch content to the blob store
 */
export const copyFetchContent = async (ctx: PluginContext): Promise<void> => {
  try {
    const paths = await glob(['!(*.*)'], {
      cwd: join(ctx.publishDir, 'cache/fetch-cache'),
      extglob: true,
    })

    await Promise.all(
      paths.map(async (key): Promise<void> => {
        const value = await buildFetchCacheValue(join(ctx.publishDir, 'cache/fetch-cache', key))
        await ctx.writeCacheEntry(key, value)
      }),
    )
  } catch (error) {
    ctx.failBuild('Failed assembling fetch content for upload', error)
  }
}
