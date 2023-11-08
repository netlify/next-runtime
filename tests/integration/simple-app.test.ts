import { load } from 'cheerio'
import { getLogger } from 'lambda-local'
import { v4 } from 'uuid'
import { beforeEach, expect, test, vi } from 'vitest'
import {
  createFixture,
  invokeFunction,
  runPlugin,
  type FixtureTestContext,
} from '../utils/fixture.js'
import { generateRandomObjectID, getBlobEntries, startMockBlobStore } from '../utils/helpers.js'

// Disable the verbose logging of the lambda-local runtime
getLogger().level = 'alert'

beforeEach<FixtureTestContext>(async (ctx) => {
  // set for each test a new deployID and siteID
  ctx.deployID = generateRandomObjectID()
  ctx.siteID = v4()
  vi.stubEnv('DEPLOY_ID', ctx.deployID)
  // hide debug logs in tests
  // vi.spyOn(console, 'debug').mockImplementation(() => {})

  await startMockBlobStore(ctx)
})
test<FixtureTestContext>('Test that the simple next app is working', async (ctx) => {
  await createFixture('simple-next-app', ctx)
  await runPlugin(ctx)
  // check if the blob entries where successful set on the build plugin
  const blobEntries = await getBlobEntries(ctx)
  expect(blobEntries).toEqual([
    { key: 'server/app/_not-found', etag: expect.any(String) },
    { key: 'server/app/index', etag: expect.any(String) },
    { key: 'server/app/other', etag: expect.any(String) },
  ])

  // test the function call
  const home = await invokeFunction(ctx)
  expect(home.statusCode).toBe(200)
  expect(load(home.body)('h1').text()).toBe('Home')

  const other = await invokeFunction(ctx, { url: 'other' })
  expect(other.statusCode).toBe(200)
  expect(load(other.body)('h1').text()).toBe('Other')
})
