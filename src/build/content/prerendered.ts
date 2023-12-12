import type { NetlifyPluginOptions } from '@netlify/build'
import glob from 'fast-glob'
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

const writeCacheEntry = async (key: string, value: CacheValue) => {
  await mkdir(dirname(resolve(BLOB_DIR, key)), { recursive: true })
  await writeFile(
    resolve(BLOB_DIR, key),
    JSON.stringify({ lastModified: Date.now(), value } satisfies CacheEntry),
    'utf-8',
  )
}

const urlPathToFilePath = (path: string) => (path === '/' ? '/index' : path)

const buildPagesCacheValue = async (path: string): Promise<PageCacheValue> => ({
  kind: 'PAGE',
  html: await readFile(resolve(`${path}.html`), 'utf-8'),
  pageData: JSON.parse(await readFile(resolve(`${path}.json`), 'utf-8')),
})

const buildAppCacheValue = async (path: string): Promise<PageCacheValue> => ({
  kind: 'PAGE',
  html: await readFile(resolve(`${path}.html`), 'utf-8'),
  pageData: await readFile(resolve(`${path}.rsc`), 'utf-8'),
  ...JSON.parse(await readFile(resolve(`${path}.meta`), 'utf-8')),
})

const buildRouteCacheValue = async (path: string): Promise<RouteCacheValue> => ({
  kind: 'ROUTE',
  body: await readFile(resolve(`${path}.body`), 'utf-8'),
  ...JSON.parse(await readFile(resolve(`${path}.meta`), 'utf-8')),
})

const buildFetchCacheValue = async (path: string): Promise<FetchCacheValue> => ({
  kind: 'FETCH',
  ...JSON.parse(await readFile(resolve(path), 'utf-8')),
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
    const routes = Object.entries(manifest.routes)
    const notFoundRoute = 'server/app/_not-found'

    await Promise.all(
      routes.map(async ([path, route]) => {
        let key, value

        switch (true) {
          case route.dataRoute?.endsWith('.json'):
            key = `server/pages/${urlPathToFilePath(path)}`
            value = await buildPagesCacheValue(resolve(PUBLISH_DIR, key))
            break

          case route.dataRoute?.endsWith('.rsc'):
            key = `server/app/${urlPathToFilePath(path)}`
            value = await buildAppCacheValue(resolve(PUBLISH_DIR, key))
            break

          case route.dataRoute === null:
            key = `server/app/${urlPathToFilePath(path)}`
            value = await buildRouteCacheValue(resolve(PUBLISH_DIR, key))
            break

          default:
            throw new Error(`Unrecognized prerendered content: ${path}`)
        }

        await writeCacheEntry(key, value)
      }),
    )

    // app router 404 pages are not in the prerender manifest
    // so we need to check for them manually
    if (existsSync(resolve(PUBLISH_DIR, `${notFoundRoute}.html`))) {
      await writeCacheEntry(
        notFoundRoute,
        await buildAppCacheValue(resolve(PUBLISH_DIR, notFoundRoute)),
      )
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
    const paths = await glob([`cache/fetch-cache/!(*.*)`], {
      cwd: resolve(PUBLISH_DIR),
      extglob: true,
    })

    await Promise.all(
      paths.map(async (key) => {
        await writeCacheEntry(key, await buildFetchCacheValue(resolve(PUBLISH_DIR, key)))
      }),
    )
  } catch (error) {
    failBuild('Failed assembling fetch content for upload', error instanceof Error ? { error } : {})
  }
}
