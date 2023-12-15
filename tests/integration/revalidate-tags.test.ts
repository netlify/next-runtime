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
import { encodeBlobKey, generateRandomObjectID, startMockBlobStore } from '../utils/helpers.js'

// Disable the verbose logging of the lambda-local runtime
getLogger().level = 'alert'

beforeEach<FixtureTestContext>(async (ctx) => {
  // set for each test a new deployID and siteID
  ctx.deployID = generateRandomObjectID()
  ctx.siteID = v4()
  vi.stubEnv('SITE_ID', ctx.siteID)
  vi.stubEnv('DEPLOY_ID', ctx.deployID)
  vi.stubEnv('NETLIFY_PURGE_API_TOKEN', 'fake-token')
  // hide debug logs in tests
  // vi.spyOn(console, 'debug').mockImplementation(() => {})

  await startMockBlobStore(ctx)
})

test<FixtureTestContext>('should revalidate a route by tag', async (ctx) => {
  await createFixture('server-components', ctx)
  await runPlugin(ctx)

  expect(await ctx.blobStore.get(encodeBlobKey('static-fetch-1'))).not.toBeNull()

  // test the function call
  const post1 = await invokeFunction(ctx, { url: '/static-fetch-1' })
  const post1Date = load(post1.body)('[data-testid="date-now"]').text()
  expect(post1.statusCode).toBe(200)
  expect(load(post1.body)('h1').text()).toBe('Hello, Static Fetch 1')
  expect(post1.headers, 'a cache hit on the first invocation of a prerendered page').toEqual(
    expect.objectContaining({
      'x-nextjs-cache': 'HIT',
      'netlify-cdn-cache-control': 's-maxage=31536000, stale-while-revalidate=31536000',
    }),
  )

  const revalidate = await invokeFunction(ctx, { url: '/api/on-demand-revalidate/tag' })
  expect(revalidate.statusCode).toBe(200)
  expect(JSON.parse(revalidate.body)).toEqual({ revalidated: true, now: expect.any(String) })

  // it does not wait for the revalidation
  await new Promise<void>((resolve) => setTimeout(resolve, 100))

  const post2 = await invokeFunction(ctx, { url: '/static-fetch-1' })
  const post2Date = load(post2.body)('[data-testid="date-now"]').text()
  expect(post2.statusCode).toBe(200)
  expect(load(post2.body)('h1').text()).toBe('Hello, Static Fetch 1')
  expect(post2.headers, 'a cache miss on the on demand revalidated page').toEqual(
    expect.objectContaining({
      'x-nextjs-cache': 'MISS',
      'netlify-cdn-cache-control': 's-maxage=31536000, stale-while-revalidate=31536000',
    }),
  )
  expect(post2Date).not.toBe(post1Date)

  // it does not wait for the cache.set so we have to manually wait here until the blob storage got populated
  await new Promise<void>((resolve) => setTimeout(resolve, 100))

  const post3 = await invokeFunction(ctx, { url: '/static-fetch-1' })
  const post3Date = load(post3.body)('[data-testid="date-now"]').text()
  expect(post3.statusCode).toBe(200)
  expect(load(post3.body)('h1').text()).toBe('Hello, Static Fetch 1')
  expect(post3.headers, 'a cache hit on the revalidated and regenerated page').toEqual(
    expect.objectContaining({
      'x-nextjs-cache': 'HIT',
      'netlify-cdn-cache-control': 's-maxage=31536000, stale-while-revalidate=31536000',
    }),
  )
  expect(post3Date).toBe(post2Date)
})
