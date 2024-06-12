// @ts-check

import { Buffer } from 'node:buffer'

import { BLOB_TOKEN } from './constants.mjs'
/**
 * @param ctx {import('./contexts').FixtureTestContext}
 * @returns {string}
 */
export const createBlobContext = (ctx) =>
  Buffer.from(
    JSON.stringify({
      edgeURL: `http://${ctx.blobStoreHost}`,
      uncachedEdgeURL: `http://${ctx.blobStoreHost}`,
      token: BLOB_TOKEN,
      siteID: ctx.siteID,
      deployID: ctx.deployID,
      primaryRegion: 'us-test-1',
    }),
  ).toString('base64')
