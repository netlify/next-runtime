import { BlobsServer } from '@netlify/blobs'
import getPort from 'get-port'
import { getLogger } from 'lambda-local'
import { v4 } from 'uuid'
import { beforeEach, expect, test, vi } from 'vitest'
import {
  BLOB_TOKEN,
  createFixture,
  runPlugin,
  invokeFunction,
  type FixtureTestContext,
} from '../utils/fixture.js'
import { load } from 'cheerio'

// Disable the verbose logging of the lambda-local runtime
getLogger().level = 'alert'

beforeEach<FixtureTestContext>(async (ctx) => {
  const port = await getPort()
  // create new blob store server
  ctx.blobStore = new BlobsServer({
    port,
    token: BLOB_TOKEN,
    directory: '',
  })
  ctx.blobStoreHost = `localhost:${port}`

  // set for each test a new deployID and siteID
  ctx.deployID = v4()
  ctx.siteID = v4()
  vi.stubEnv('DEPLOY_ID', ctx.deployID)
})

test<FixtureTestContext>('Test that the simple next app is working', async (ctx) => {
  await createFixture('simple-next-app', ctx)
  await runPlugin(ctx)
  const home = await invokeFunction(ctx)
  expect(home.statusCode).toBe(200)
  expect(load(home.body)('h1').text()).toBe('Home')

  const other = await invokeFunction(ctx, { url: 'other' })
  expect(other.statusCode).toBe(200)
  expect(load(other.body)('h1').text()).toBe('Other')
})
