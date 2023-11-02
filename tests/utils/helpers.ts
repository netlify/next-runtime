import getPort from 'get-port'
import { BLOB_TOKEN, type FixtureTestContext } from './fixture'

import { cp, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { BlobsServer, getDeployStore } from '@netlify/blobs'

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
  ctx.blobStore = new BlobsServer({
    port,
    token: BLOB_TOKEN,
    directory: await mkdtemp(join(tmpdir(), 'netlify-next-runtime-blob-')),
  })
  await ctx.blobStore.start()
  ctx.blobStoreHost = `localhost:${port}`
}

/**
 * Retrieves an array of blob store entries
 */
export const getBlobEntries = async (ctx: FixtureTestContext) => {
  const store = getDeployStore({
    apiURL: `http://${ctx.blobStoreHost}`,
    deployID: ctx.deployID,
    siteID: ctx.siteID,
    token: BLOB_TOKEN,
  })

  const { blobs } = await store.list()
  return blobs
}
