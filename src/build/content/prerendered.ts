import { getDeployStore } from '@netlify/blobs'
import { NetlifyPluginConstants } from '@netlify/build'
import { globby } from 'globby'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { cpus } from 'os'
import pLimit from 'p-limit'
import { parse, ParsedPath } from 'path'
import { BUILD_DIR } from '../constants.js'

export type CacheEntry = {
  key: string
  value: CacheEntryValue
}

export type CacheEntryValue = {
  lastModified: number
  value: PageCacheValue | RouteCacheValue | FetchCacheValue
}

type PageCacheValue = {
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
const isPage = ({ dir, name, ext }: ParsedPath, paths: string[]) => {
  return dir.startsWith('server/pages') && ext === '.html' && paths.includes(`${dir}/${name}.json`)
}
// static prerendered app content with RSC data
const isApp = ({ dir, ext }: ParsedPath) => {
  return dir.startsWith('server/app') && ext === '.html'
}
// static prerendered app route handler
const isRoute = ({ dir, ext }: ParsedPath) => {
  return dir.startsWith('server/app') && ext === '.body'
}
// fetch cache data
const isFetch = ({ dir }: ParsedPath) => {
  return dir.startsWith('cache/fetch-cache')
}

/**
 * Transform content file paths into cache entries for the blob store
 */
const buildPrerenderedContentEntries = async (cwd: string): Promise<Promise<CacheEntry>[]> => {
  const paths = await globby(
    [`cache/fetch-cache/*`, `server/+(app|pages)/**/*.+(html|body|json)`],
    {
      cwd,
      extglob: true,
    },
  )

  return paths
    .map(parse)
    .filter((path: ParsedPath) => {
      return isPage(path, paths) || isApp(path) || isRoute(path) || isFetch(path)
    })
    .map(async (path: ParsedPath): Promise<CacheEntry> => {
      const { dir, name, ext } = path
      const key = join(dir, name)
      let value

      if (isPage(path, paths)) {
        value = {
          kind: 'PAGE',
          html: await readFile(`${cwd}/${key}.html`, 'utf-8'),
          pageData: JSON.parse(await readFile(`${cwd}/${key}.json`, 'utf-8')),
        } satisfies PageCacheValue
      }

      if (isApp(path)) {
        value = {
          kind: 'PAGE',
          html: await readFile(`${cwd}/${key}.html`, 'utf-8'),
          pageData: await readFile(`${cwd}/${key}.rsc`, 'utf-8'),
          ...JSON.parse(await readFile(`${cwd}/${key}.meta`, 'utf-8')),
        } satisfies PageCacheValue
      }

      if (isRoute(path)) {
        value = {
          kind: 'ROUTE',
          body: await readFile(`${cwd}/${key}.body`, 'utf-8'),
          ...JSON.parse(await readFile(`${cwd}/${key}.meta`, 'utf-8')),
        } satisfies RouteCacheValue
      }

      if (isFetch(path)) {
        value = {
          kind: 'FETCH',
          data: JSON.parse(await readFile(`${cwd}/${key}`, 'utf-8')),
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
  NETLIFY_API_TOKEN,
  NETLIFY_API_HOST,
  SITE_ID,
}: NetlifyPluginConstants) => {
  // initialize the blob store
  const blob = getDeployStore({
    deployID: process.env.DEPLOY_ID,
    siteID: SITE_ID,
    token: NETLIFY_API_TOKEN,
    apiURL: `https://${NETLIFY_API_HOST}`,
  })
  // limit concurrent uploads to 2x the number of CPUs
  const limit = pLimit(Math.max(2, cpus().length))

  // read prerendered content and build JSON key/values for the blob store
  const entries = await Promise.allSettled(
    await buildPrerenderedContentEntries(join(process.cwd(), BUILD_DIR, '.next')),
  )
  entries.forEach((result) => {
    if (result.status === 'rejected') {
      console.error(`Unable to read prerendered content: ${result.reason.message}`)
    }
  })

  // upload JSON content data to the blob store
  const uploads = await Promise.allSettled(
    entries
      .filter((entry) => entry.status === 'fulfilled')
      .map((entry: PromiseSettledResult<CacheEntry>) => {
        const result = entry as PromiseFulfilledResult<CacheEntry>
        const { key, value } = result.value
        return limit(() => blob.setJSON(key, value))
      }),
  )
  uploads.forEach((upload, index) => {
    if (upload.status === 'rejected') {
      const result = entries[index] as PromiseFulfilledResult<CacheEntry>
      console.error(`Unable to store ${result.value.key}: ${upload.reason.message}`)
    }
  })
}
