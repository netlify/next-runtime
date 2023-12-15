import type { NetlifyPluginOptions } from '@netlify/build'
import glob from 'fast-glob'
import { Buffer } from 'node:buffer'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { getPrerenderManifest } from '../config.js'
import { BLOB_DIR } from '../constants.js'

export type CacheEntry = {
  lastModified: number
  value: CacheValue
}

type CacheValue = PageCacheValue | RouteCacheValue | FetchCacheValue

export type PageCacheValue = {
  kind: 'PAGE'
  html: string
  pageData: string
  headers?: { [k: string]: string }
  status?: number
}

type RouteCacheValue = {
  kind: 'ROUTE'
  body: string
  headers: { [k: string]: string }
  status: number
}

type FetchCacheValue = {
  kind: 'FETCH'
  data: {
    headers: { [k: string]: string }
    body: string
    url: string
    status?: number
    tags?: string[]
  }
}

/**
 * Write a cache entry to the blob upload directory using
 * base64 keys to avoid collisions with directories
 */
const writeCacheEntry = async (key: string, value: CacheValue) => {
  const path = resolve(BLOB_DIR, Buffer.from(key).toString('base64'))
  const entry = JSON.stringify({
    lastModified: Date.now(),
    value,
  } satisfies CacheEntry)

  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, entry, 'utf-8')
}

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
export const copyPrerenderedContent = async ({
  constants: { PUBLISH_DIR },
  utils: {
    build: { failBuild },
  },
}: Pick<NetlifyPluginOptions, 'constants' | 'utils'>) => {
  try {
    // read prerendered content and build JSON key/values for the blob store
    const manifest = await getPrerenderManifest({ PUBLISH_DIR })

    await Promise.all(
      Object.entries(manifest.routes).map(async ([route, meta]) => {
        const key = routeToFilePath(route)
        let value: CacheValue

        switch (true) {
          case meta.dataRoute?.endsWith('.json'):
            value = await buildPagesCacheValue(resolve(PUBLISH_DIR, 'server/pages', key))
            break

          case meta.dataRoute?.endsWith('.rsc'):
            value = await buildAppCacheValue(resolve(PUBLISH_DIR, 'server/app', key))
            break

          case meta.dataRoute === null:
            value = await buildRouteCacheValue(resolve(PUBLISH_DIR, 'server/app', key))
            break

          default:
            throw new Error(`Unrecognized content: ${route}`)
        }

        await writeCacheEntry(key, value)
      }),
    )

    // app router 404 pages are not in the prerender manifest
    // so we need to check for them manually
    if (existsSync(resolve(PUBLISH_DIR, `server/app/_not-found.html`))) {
      const key = '404'
      const value = await buildAppCacheValue(resolve(PUBLISH_DIR, 'server/app/_not-found'))
      await writeCacheEntry(key, value)
    }
  } catch (error) {
    failBuild(
      'Failed assembling prerendered content for upload',
      error instanceof Error ? { error } : {},
    )
  }
}

/**
 * Upload fetch content to the blob store
 */
export const copyFetchContent = async ({
  constants: { PUBLISH_DIR },
  utils: {
    build: { failBuild },
  },
}: Pick<NetlifyPluginOptions, 'constants' | 'utils'>) => {
  try {
    const paths = await glob(['!(*.*)'], {
      cwd: resolve(PUBLISH_DIR, 'cache/fetch-cache'),
      extglob: true,
    })

    await Promise.all(
      paths.map(async (key) => {
        const value = await buildFetchCacheValue(resolve(PUBLISH_DIR, 'cache/fetch-cache', key))
        await writeCacheEntry(key, value)
      }),
    )
  } catch (error) {
    failBuild('Failed assembling fetch content for upload', error instanceof Error ? { error } : {})
  }
}
