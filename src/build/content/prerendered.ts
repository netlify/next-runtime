import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { glob } from 'fast-glob'
import type { CacheHandlerValue } from 'next/dist/server/lib/incremental-cache/index.js'
import type { IncrementalCacheValue } from 'next/dist/server/response-cache/types.js'

import { encodeBlobKey } from '../../shared/blobkey.js'
import type { PluginContext } from '../plugin-context.js'

type CachedPageValue = Extract<IncrementalCacheValue, { kind: 'PAGE' }>
type CachedRouteValue = Extract<IncrementalCacheValue, { kind: 'ROUTE' }>
type CachedFetchValue = Extract<IncrementalCacheValue, { kind: 'FETCH' }>

/**
 * Write a cache entry to the blob upload directory.
 */
const writeCacheEntry = async (
  route: string,
  value: IncrementalCacheValue,
  lastModified: number,
  ctx: PluginContext,
): Promise<void> => {
  const path = join(ctx.blobDir, await encodeBlobKey(route))
  const entry = JSON.stringify({
    lastModified,
    value,
  } satisfies CacheHandlerValue)

  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, entry, 'utf-8')
}

/**
 * Normalize routes by stripping leading slashes and ensuring root path is index
 */
const routeToFilePath = (path: string) => (path === '/' ? '/index' : path)

const buildPagesCacheValue = async (path: string): Promise<CachedPageValue> => ({
  kind: 'PAGE',
  html: await readFile(`${path}.html`, 'utf-8'),
  pageData: JSON.parse(await readFile(`${path}.json`, 'utf-8')),
  postponed: undefined,
  headers: undefined,
  status: undefined,
})

const buildAppCacheValue = async (path: string): Promise<CachedPageValue> => ({
  kind: 'PAGE',
  html: await readFile(`${path}.html`, 'utf-8'),
  pageData: await readFile(`${path}.rsc`, 'utf-8'),
  ...JSON.parse(await readFile(`${path}.meta`, 'utf-8')),
})

const buildRouteCacheValue = async (path: string): Promise<CachedRouteValue> => ({
  kind: 'ROUTE',
  body: await readFile(`${path}.body`, 'base64'),
  ...JSON.parse(await readFile(`${path}.meta`, 'utf-8')),
})

const buildFetchCacheValue = async (path: string): Promise<CachedFetchValue> => ({
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
        const lastModified = meta.initialRevalidateSeconds ? 1 : Date.now()
        const key = routeToFilePath(route)
        let value: IncrementalCacheValue
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

        await writeCacheEntry(key, value, lastModified, ctx)
      }),
    )

    // app router 404 pages are not in the prerender manifest
    // so we need to check for them manually
    if (existsSync(join(ctx.publishDir, `server/app/_not-found.html`))) {
      const lastModified = Date.now()
      const key = '/404'
      const value = await buildAppCacheValue(join(ctx.publishDir, 'server/app/_not-found'))
      await writeCacheEntry(key, value, lastModified, ctx)
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
        const lastModified = 1
        const path = join(ctx.publishDir, 'cache/fetch-cache', key)
        const value = await buildFetchCacheValue(path)
        await writeCacheEntry(key, value, lastModified, ctx)
      }),
    )
  } catch (error) {
    ctx.failBuild('Failed assembling fetch content for upload', error)
  }
}
