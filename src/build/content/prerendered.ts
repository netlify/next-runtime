import type { NetlifyPluginOptions } from '@netlify/build'
import glob from 'fast-glob'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, resolve } from 'node:path'
import { join as joinPosix } from 'node:path/posix'
import { getPrerenderManifest } from '../config.js'
import { BLOB_DIR } from '../constants.js'

export type CacheEntry = {
  key: string
  value: CacheEntryValue
}

export type CacheEntryValue = {
  lastModified: number
  value: PageCacheValue | RouteCacheValue | FetchCacheValue
}

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

// static prerendered pages content with JSON data
const isPage = (key: string, routes: string[]) => {
  return key.startsWith('server/pages') && routes.includes(key.replace(/^server\/pages/, ''))
}
// static prerendered app content with RSC data
const isApp = (path: string) => {
  return path.startsWith('server/app') && extname(path) === '.html'
}
// static prerendered app route handler
const isRoute = (path: string) => {
  return path.startsWith('server/app') && extname(path) === '.body'
}
// fetch cache data (excluding tags manifest)
const isFetch = (path: string) => {
  return path.startsWith('cache/fetch-cache') && extname(path) === ''
}

/**
 * Transform content file paths into cache entries for the blob store
 */
const buildPrerenderedContentEntries = async (
  src: string,
  routes: string[],
): Promise<Promise<CacheEntry>[]> => {
  const paths = await glob([`cache/fetch-cache/*`, `server/+(app|pages)/**/*.+(html|body)`], {
    cwd: resolve(src),
    extglob: true,
  })

  return paths.map(async (path: string): Promise<CacheEntry> => {
    const key = joinPosix(dirname(path), basename(path, extname(path)))
    let value

    if (isPage(key, routes)) {
      value = {
        kind: 'PAGE',
        html: await readFile(resolve(src, `${key}.html`), 'utf-8'),
        pageData: JSON.parse(await readFile(resolve(src, `${key}.json`), 'utf-8')),
      } satisfies PageCacheValue
    }

    if (isApp(path)) {
      value = {
        kind: 'PAGE',
        html: await readFile(resolve(src, `${key}.html`), 'utf-8'),
        pageData: await readFile(resolve(src, `${key}.rsc`), 'utf-8'),
        ...JSON.parse(await readFile(resolve(src, `${key}.meta`), 'utf-8')),
      } satisfies PageCacheValue
    }

    if (isRoute(path)) {
      value = {
        kind: 'ROUTE',
        body: await readFile(resolve(src, `${key}.body`), 'utf-8'),
        ...JSON.parse(await readFile(resolve(src, `${key}.meta`), 'utf-8')),
      } satisfies RouteCacheValue
    }

    if (isFetch(path)) {
      value = {
        kind: 'FETCH',
        ...JSON.parse(await readFile(resolve(src, key), 'utf-8')),
      } satisfies FetchCacheValue
    }

    return {
      key,
      value: {
        lastModified: Date.now(),
        value,
      },
    }
  })
}

/**
 * Upload prerendered content to the blob store and remove it from the bundle
 */
export const uploadPrerenderedContent = async ({
  constants: { PUBLISH_DIR },
  utils,
}: Pick<NetlifyPluginOptions, 'constants' | 'utils'>) => {
  try {
    // read prerendered content and build JSON key/values for the blob store
    const manifest = await getPrerenderManifest({ PUBLISH_DIR })
    const entries = await Promise.all(
      await buildPrerenderedContentEntries(PUBLISH_DIR, Object.keys(manifest.routes)),
    )

    // movce JSON content to the blob store directory for upload
    await Promise.all(
      entries
        .filter((entry) => entry.value.value !== undefined)
        .map(async (entry) => {
          const dest = resolve(BLOB_DIR, entry.key)
          await mkdir(dirname(dest), { recursive: true })
          await writeFile(resolve(BLOB_DIR, entry.key), JSON.stringify(entry.value), 'utf-8')
        }),
    )
  } catch (error) {
    utils.build.failBuild(
      'Failed assembling prerendered content for upload',
      error instanceof Error ? { error } : {},
    )
    throw error
  }
}
