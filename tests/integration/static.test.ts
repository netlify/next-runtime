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
import {
  decodeBlobKey,
  generateRandomObjectID,
  getBlobEntries,
  startMockBlobStore,
} from '../utils/helpers.js'

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

test<FixtureTestContext>('requesting a non existing page route that needs to be fetched from the CDN', async (ctx) => {
  await createFixture('page-router', ctx)
  await runPlugin(ctx)

  const entries = await getBlobEntries(ctx)
  expect(entries.map(({ key }) => decodeBlobKey(key)).sort()).toEqual([
    '404.html',
    '500.html',
    'static/revalidate-automatic',
    'static/revalidate-manual',
  ])

  // test that it should request the 404.html file
  const call1 = await invokeFunction(ctx, { url: 'static/revalidate-not-existing' })
  expect(call1.statusCode).toBe(404)
  expect(load(call1.body)('h1').text()).toBe('404')
  expect(call1.headers, 'a cache hit on the first invocation of a prerendered page').toEqual(
    expect.objectContaining({
      'netlify-cdn-cache-control': 'no-cache, no-store, max-age=0, must-revalidate',
    }),
  )
})
