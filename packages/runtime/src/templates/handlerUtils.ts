import fs, { createWriteStream, existsSync } from 'fs'
import http from 'http'
import https from 'https'
import { tmpdir } from 'os'
import path from 'path'
import { pipeline } from 'stream'
import { promisify } from 'util'

import type NextNodeServer from 'next/dist/server/next-server'

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
    const req = httpx.get(url, { timeout: 10000 }, (response) => {
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
export const augmentFsModule = ({
  promises,
  staticManifest,
  pageRoot,
  getBase,
}: {
  promises: typeof fs.promises
  staticManifest: Array<[string, string]>
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
  // ...then money-patch it to see if it's requesting a CDN file
  promises.readFile = (async (file, options) => {
    const base = getBase()
    // We only care about page files
    if (file.startsWith(pageRoot)) {
      // We only want the part after `pages/`
      const filePath = file.slice(pageRoot.length + 1)

      // Is it in the CDN and not local?
      if (staticFiles.has(filePath) && !existsSync(file)) {
        // This name is safe to use, because it's one that was already created by Next
        const cacheFile = path.join(cacheDir, filePath)
        const url = `${base}/${staticFiles.get(filePath)}`

        // If it's already downloading we can wait for it to finish
        if (downloadPromises.has(url)) {
          await downloadPromises.get(url)
        }
        // Have we already cached it? We download every time if running locally to avoid staleness
        if ((!existsSync(cacheFile) || process.env.NETLIFY_DEV) && base) {
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
      // We only want the part after `pages/`
      const cacheFile = path.join(cacheDir, file.slice(pageRoot.length + 1))
      if (existsSync(cacheFile)) {
        return statsOrig(cacheFile, options)
      }
    }
    return statsOrig(file, options)
  }) as typeof promises.stat
}

/**
 * Next.js has an annoying habit of needing deep imports, but then moving those in patch releases. This is our abstraction.
 */
export const getNextServer = (): NextServerType => {
  let NextServer: NextServerType
  try {
    // next >= 11.0.1. Yay breaking changes in patch releases!
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    NextServer = require('next/dist/server/next-server').default
  } catch (error) {
    if (!error.message.includes("Cannot find module 'next/dist/server/next-server'")) {
      // A different error, so rethrow it
      throw error
    }
    // Probably an old version of next, so fall through and find it elsewhere.
  }

  if (!NextServer) {
    try {
      // next < 11.0.1
      // eslint-disable-next-line n/no-missing-require, import/no-unresolved, @typescript-eslint/no-var-requires
      NextServer = require('next/dist/next-server/server/next-server').default
    } catch (error) {
      if (!error.message.includes("Cannot find module 'next/dist/next-server/server/next-server'")) {
        throw error
      }
      throw new Error('Could not find Next.js server')
    }
  }
  return NextServer
}
