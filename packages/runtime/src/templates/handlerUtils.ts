// eslint-disable-next-line n/no-unsupported-features/node-builtins
import { AsyncLocalStorage } from 'async_hooks'
import fs, { createWriteStream, existsSync, writeFileSync } from 'fs'
import { ServerResponse } from 'http'
import { tmpdir } from 'os'
import path from 'path'
import { pipeline } from 'stream'
import { promisify } from 'util'

import { HandlerEvent, HandlerContext, HandlerResponse } from '@netlify/functions'
import { http, https } from 'follow-redirects'
import NextNodeServer from 'next/dist/server/next-server'

import type { StaticRoute } from '../helpers/types'

export type NextServerType = typeof NextNodeServer

const streamPipeline = promisify(pipeline)

/**
 * Downloads a file from the CDN to the local aliased filesystem. This is a fallback, because in most cases we'd expect
 * files required at runtime to not be sent to the CDN.
 */
export const downloadFile = async (url: string, destination: string): Promise<void> => {
  console.log(`Downloading ${url} to ${destination}`)

  const httpx = url.startsWith('https') ? https : http

  await new Promise((resolve, reject) => {
    const req = httpx.get(url, { timeout: 10000, maxRedirects: 1 }, (response) => {
      if (response.statusCode < 200 || response.statusCode > 299) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode} ${response.statusMessage || ''}`))
        return
      }
      const fileStream = createWriteStream(destination)
      streamPipeline(response, fileStream)
        .then(resolve)
        .catch((error) => {
          console.log(`Error downloading ${url}`, error)
          reject(error)
        })
    })
    req.on('error', (error) => {
      console.log(`Error downloading ${url}`, error)
      reject(error)
    })
  })
}

/**
 * Parse maxage from a cache-control header
 */
export const getMaxAge = (header: string): number => {
  const parts = header.split(',')
  let maxAge
  for (const part of parts) {
    const [key, value] = part.split('=')
    if (key?.trim() === 's-maxage') {
      maxAge = value?.trim()
    }
  }
  if (maxAge) {
    const result = Number.parseInt(maxAge)
    return Number.isNaN(result) ? 0 : result
  }
  return 0
}

export const getMultiValueHeaders = (
  headers: Record<string, string | Array<string>>,
): Record<string, Array<string>> => {
  const multiValueHeaders: Record<string, Array<string>> = {}
  for (const key of Object.keys(headers)) {
    const header = headers[key]

    if (Array.isArray(header)) {
      multiValueHeaders[key] = header
    } else {
      multiValueHeaders[key] = [header]
    }
  }
  return multiValueHeaders
}

/**
 * Monkey-patch the fs module to download missing files from the CDN
 */
// eslint-disable-next-line max-lines-per-function
export const augmentFsModule = ({
  promises,
  staticManifest,
  blobsManifest,
  pageRoot,
  getBase,
}: {
  promises: typeof fs.promises
  staticManifest: Array<[string, string]>
  blobsManifest: Set<string>
  pageRoot: string
  getBase: () => string
}) => {
  // Only do this if we have some static files moved to the CDN
  if (staticManifest.length === 0) {
    return
  }
  // These are static page files that have been removed from the function bundle
  // In most cases these are served from the CDN, but for rewrites Next may try to read them
  // from disk. We need to intercept these and load them from the CDN instead
  // Sadly the only way to do this is to monkey-patch fs.promises. Yeah, I know.
  const staticFiles = new Map(staticManifest)
  const downloadPromises = new Map<string, Promise<void>>()
  // Yes, you can cache stuff locally in a Lambda
  const cacheDir = path.join(tmpdir(), 'next-static-cache')
  // Grab the real fs.promises.readFile...
  const readfileOrig = promises.readFile
  const statsOrig = promises.stat

  console.log(`augmentfsmodule`, {
    pageRoot,
    base: getBase(),
  })
  // ...then monkey-patch it to see if it's requesting a CDN file
  promises.readFile = (async (file, options) => {
    const baseUrl = getBase()

    // We only care about page files
    if (file.startsWith(pageRoot)) {
      // We only want the part after `.next/server/`
      const filePath = file.slice(pageRoot.length + 1)

      const { isFirstODBRequest, event, context } = requestAsyncLocalStorage.getStore()
      if (isFirstODBRequest) {
        console.log(`fs augment: handling first ODB request, checking blob store`, {
          requestID: event?.headers?.['x-nf-request-id'],
          path: event.path,
          builderCache: event.headers['x-nf-builder-cache'],
          deployID: event.headers['x-nf-deploy-id'],
          filePath,
        })
        if (blobsManifest.has(filePath)) {
          const {
            clientContext: { custom: customContext },
          } = context

          if (customContext?.blobs) {
            // eslint-disable-next-line n/prefer-global/buffer
            const rawData = Buffer.from(customContext.blobs, 'base64')
            const data = JSON.parse(rawData.toString('ascii'))

            // this file will be magically here; It will be copied in the functions.ts file over to be available during request time
            const { Blobs, getNormalizedBlobKey } =
              // eslint-disable-next-line @typescript-eslint/no-var-requires
              require('./blobStorage') as typeof import('./blobStorage')

            const netliBlob = new Blobs({
              authentication: {
                contextURL: data.url,
                token: data.token,
              },
              context: `deploy:${event.headers['x-nf-deploy-id']}`,
              siteID: event.headers['x-nf-site-id'],
            })

            const blobKey = getNormalizedBlobKey(filePath)

            const blob = await netliBlob.get(blobKey, { type: 'json' })

            console.log(`has netliblob`, { blob })

            try {
              const cacheFile = path.join(cacheDir, filePath)
              if ((!existsSync(cacheFile) || process.env.NETLIFY_DEV) && baseUrl) {
                await promises.mkdir(path.dirname(cacheFile), { recursive: true })

                writeFileSync(cacheFile, blob)
              }
              const r = await readfileOrig(cacheFile, options)
              console.log(`read file`, { cacheFile, r })
              return r
            } catch (error) {
              console.log(`error while blobbing`, error, { error })
              throw error
            }
          }

          console.log(`doesn't have netliblob`)
        } else {
          console.log(`doesn't have blob`, { filePath })
        }

        // console.log(`augmentfsmodule readFile is in blob store`, {
        //   file,
        //   filePath,
        //   requestID: t?.event?.headers?.['x-nf-request-id'],
        // })
      }
      // Is it in the CDN and not local?
      if (staticFiles.has(filePath) && !existsSync(file)) {
        // This name is safe to use, because it's one that was already created by Next
        const cacheFile = path.join(cacheDir, filePath)
        const url = `${baseUrl}/${staticFiles.get(filePath)}`

        // If it's already downloading we can wait for it to finish
        if (downloadPromises.has(url)) {
          await downloadPromises.get(url)
        }
        // Have we already cached it? We download every time if running locally to avoid staleness
        if ((!existsSync(cacheFile) || process.env.NETLIFY_DEV) && baseUrl) {
          await promises.mkdir(path.dirname(cacheFile), { recursive: true })

          try {
            // Append the path to our host and we can load it like a regular page
            const downloadPromise = downloadFile(url, cacheFile)
            downloadPromises.set(url, downloadPromise)
            await downloadPromise
          } finally {
            downloadPromises.delete(url)
          }
        }
        // Return the cache file
        return readfileOrig(cacheFile, options)
      }
    }

    return readfileOrig(file, options)
  }) as typeof promises.readFile

  promises.stat = ((file, options) => {
    // We only care about page files
    if (file.startsWith(pageRoot)) {
      // We only want the part after `.next/server`
      const cacheFile = path.join(cacheDir, file.slice(pageRoot.length + 1))
      if (existsSync(cacheFile)) {
        return statsOrig(cacheFile, options)
      }
    }
    return statsOrig(file, options)
  }) as typeof promises.stat
}

/**
 * Prefetch requests are used to check for middleware redirects, and shouldn't trigger SSR.
 */
export const getPrefetchResponse = (event: HandlerEvent, mode: string): HandlerResponse | false => {
  if (event.headers['x-middleware-prefetch'] && mode === 'ssr') {
    return {
      statusCode: 200,
      body: '{}',
      headers: {
        'Content-Type': 'application/json',
        'x-middleware-skip': '1',
        // https://github.com/vercel/next.js/pull/42936/files#r1027563953
        vary: 'x-middleware-prefetch',
      },
    }
  }
  return false
}

export const normalizePath = (event: HandlerEvent) => {
  if (event.headers?.rsc) {
    const originalPath = event.headers['x-rsc-route']
    if (originalPath) {
      if (event.headers['x-next-debug-logging']) {
        console.log('Original path:', originalPath)
      }
      return originalPath
    }
  }

  if (event.headers['x-original-path']) {
    if (event.headers['x-next-debug-logging']) {
      console.log('Original path:', event.headers['x-original-path'])
    }
    return event.headers['x-original-path']
  }
  // Ensure that paths are encoded - but don't double-encode them
  return new URL(event.rawUrl).pathname
}

// Simple Netlify API client
export const netlifyApiFetch = <T>({
  endpoint,
  payload,
  token,
  method = 'GET',
}: {
  endpoint: string
  payload: unknown
  token: string
  method: 'GET' | 'POST'
}): Promise<T> =>
  new Promise((resolve, reject) => {
    const body = JSON.stringify(payload)

    const req = https.request(
      {
        hostname: 'api.netlify.com',
        port: 443,
        path: `/api/v1/${endpoint}`,
        method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': body.length,
          Authorization: `Bearer ${token}`,
        },
      },
      (res: ServerResponse) => {
        let data = ''
        res.on('data', (chunk) => {
          data += chunk
        })
        res.on('end', () => {
          resolve(JSON.parse(data))
        })
      },
    )

    req.on('error', reject)

    req.write(body)
    req.end()
  })

// Remove trailing slash from a route (except for the root route)
export const normalizeRoute = (route: string): string => (route.endsWith('/') ? route.slice(0, -1) || '/' : route)

// Join multiple paths together, ensuring that there is only one slash between them
export const joinPaths = (...paths: string[]): string =>
  paths.reduce((a, b) => (a.endsWith('/') ? `${a}${b}` : `${a}/${b}`))

// Check if a route has a locale prefix (including the root route)
export const isLocalized = (route: string, i18n: { defaultLocale: string; locales: string[] }): boolean =>
  i18n.locales.some((locale) => route === `/${locale}` || route.startsWith(`/${locale}/`))

// Remove the locale prefix from a route (if any)
export const unlocalizeRoute = (route: string, i18n: { defaultLocale: string; locales: string[] }): string =>
  isLocalized(route, i18n) ? `/${route.split('/').slice(2).join('/')}` : route

// Add the default locale prefix to a route (if necessary)
export const localizeRoute = (route: string, i18n: { defaultLocale: string; locales: string[] }): string =>
  isLocalized(route, i18n) ? route : normalizeRoute(`/${i18n.defaultLocale}${route}`)

// Normalize a data route to include the locale prefix and remove the index suffix
export const localizeDataRoute = (dataRoute: string, localizedRoute: string): string => {
  if (dataRoute.endsWith('.rsc')) return dataRoute
  const locale = localizedRoute.split('/').find(Boolean)
  return dataRoute
    .replace(new RegExp(`/_next/data/(.+?)/(${locale}/)?`), `/_next/data/$1/${locale}/`)
    .replace(/\/index\.json$/, '.json')
}

export const getMatchedRoute = (
  paths: string,
  routesManifest: Array<StaticRoute>,
  parsedUrl: string,
  basePath: string,
  trailingSlash: boolean,
  // eslint-disable-next-line max-params
): StaticRoute =>
  routesManifest?.find((route) => {
    // Some internationalized routes are automatically removing the locale prefix making the path not match the route
    // we can use the parsedURL, which has the locale included and will match
    const base = '/'
    return new RegExp(route.regex).test(
      new URL(
        // If using basepath config, we have to use the original path to match the route
        // This seems to only be an issue on the index page when using group routes
        parsedUrl ||
          (basePath && paths === (trailingSlash && !basePath?.endsWith('/') ? `${basePath}/` : basePath)
            ? base
            : paths),
        'http://n',
      ).pathname,
    )
  })

export const requestAsyncLocalStorage = new AsyncLocalStorage<{
  event: HandlerEvent
  context: HandlerContext
  isFirstODBRequest: boolean
}>()
