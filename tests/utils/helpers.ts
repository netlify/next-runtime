import getPort from 'get-port'
import { BLOB_TOKEN, type FixtureTestContext } from './fixture.js'

import { BlobsServer, getDeployStore } from '@netlify/blobs'
import type { NetlifyPluginUtils } from '@netlify/build'
import IncrementalCache from 'next/dist/server/lib/incremental-cache/index.js'
import { Buffer } from 'node:buffer'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { assert, vi } from 'vitest'

/**
 * Uses next.js incremental cache to compute the same cache key for a URL that is automatically generated
 * This is needed for mocking out fetch calls to test them
 */
export const getFetchCacheKey = async (url: string) => {
  const incCache = new IncrementalCache.IncrementalCache({
    requestHeaders: {},
    getPrerenderManifest: () => ({}),
  } as any)

  const key = await incCache.fetchCacheKey(url)
  return key
}

/**
 * Generates a 24char deploy ID (this is validated in the blob storage so we cant use a uuidv4)
 * @returns
 */
export const generateRandomObjectID = () => {
  const characters = 'abcdef0123456789'
  let objectId = ''

  for (let i = 0; i < 24; i++) {
    objectId += characters[Math.floor(Math.random() * characters.length)]
  }

  return objectId
}

export const createBlobContext = (ctx: FixtureTestContext) =>
  Buffer.from(
    JSON.stringify({
      edgeURL: `http://${ctx.blobStoreHost}`,
      token: BLOB_TOKEN,
      siteID: ctx.siteID,
      deployID: ctx.deployID,
    }),
  ).toString('base64')

/**
 * Starts a new mock blob storage
 * @param ctx
 */
export const startMockBlobStore = async (ctx: FixtureTestContext) => {
  const port = await getPort()
  // create new blob store server
  ctx.blobServer = new BlobsServer({
    port,
    token: BLOB_TOKEN,
    directory: await mkdtemp(join(tmpdir(), 'netlify-next-runtime-blob-')),
  })
  await ctx.blobServer.start()
  ctx.blobStoreHost = `localhost:${port}`
  vi.stubEnv('NETLIFY_BLOBS_CONTEXT', createBlobContext(ctx))

  ctx.blobStore = getDeployStore({
    apiURL: `http://${ctx.blobStoreHost}`,
    deployID: ctx.deployID,
    siteID: ctx.siteID,
    token: BLOB_TOKEN,
  })
}

/**
 * Retrieves an array of blob store entries
 */
export const getBlobEntries = async (ctx: FixtureTestContext) => {
  ctx.blobStore = ctx.blobStore
    ? ctx.blobStore
    : getDeployStore({
        apiURL: `http://${ctx.blobStoreHost}`,
        deployID: ctx.deployID,
        siteID: ctx.siteID,
        token: BLOB_TOKEN,
      })

  const { blobs } = await ctx.blobStore.list()
  return blobs
}

/**
 * Converts a string to base64 blob key
 */
export const encodeBlobKey = (key: string) => Buffer.from(key).toString('base64')

/**
 * Converts a base64 blob key to a string
 */
export const decodeBlobKey = (key: string) => Buffer.from(key, 'base64').toString('utf-8')

/**
 * Fake build utils that are passed to a build plugin execution
 */
export const mockBuildUtils = {
  failBuild: (message: string, options: { error?: Error }) => {
    assert.fail(`${message}: ${options?.error || ''}`)
  },
  failPlugin: (message: string, options: { error?: Error }) => {
    assert.fail(`${message}: ${options?.error || ''}`)
  },
  cancelBuild: (message: string, options: { error?: Error }) => {
    assert.fail(`${message}: ${options?.error || ''}`)
  },
} as unknown as NetlifyPluginUtils
