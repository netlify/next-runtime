import { load } from 'cheerio'
import { getLogger } from 'lambda-local'
import { v4 } from 'uuid'
import { beforeEach, describe, expect, test, vi } from 'vitest'
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
  vi.stubEnv('SITE_ID', ctx.siteID)
  vi.stubEnv('DEPLOY_ID', ctx.deployID)
  vi.stubEnv('NETLIFY_PURGE_API_TOKEN', 'fake-token')
  // hide debug logs in tests
  // vi.spyOn(console, 'debug').mockImplementation(() => {})

  await startMockBlobStore(ctx)
})

describe('page router', () => {
  test<FixtureTestContext>('page router with static revalidate', async (ctx) => {
    await createFixture('page-router', ctx)
    await runPlugin(ctx)
    // check if the blob entries where successful set on the build plugin
    const blobEntries = await getBlobEntries(ctx)
    expect(blobEntries).toEqual([
      {
        key: 'server/pages/static/revalidate',
        etag: expect.any(String),
      },
    ])

    // test the function call
    const call1 = await invokeFunction(ctx, { url: 'static/revalidate' })
    const call1Date = load(call1.body)('[data-testid="date-now"]').text()
    expect(call1.statusCode).toBe(200)
    expect(load(call1.body)('h1').text()).toBe('Show #71')
    expect(call1.headers, 'a cache hit on the first invocation of a prerendered page').toEqual(
      expect.objectContaining({
        'x-nextjs-cache': 'HIT',
        'netlify-cdn-cache-control': 's-maxage=3, stale-while-revalidate',
      }),
    )

    // wait to have a stale page
    await new Promise<void>((resolve) => setTimeout(resolve, 2_000))

    // now it should be a cache miss
    const call2 = await invokeFunction(ctx, { url: 'static/revalidate' })
    const call2Date = load(call2.body)('[data-testid="date-now"]').text()
    expect(call2.statusCode).toBe(200)
    expect(call2.headers, 'a cache miss on a stale page').toEqual(
      expect.objectContaining({
        'x-nextjs-cache': 'MISS',
      }),
    )
    expect(call2Date, 'the date was cached and is matching the initial one').not.toBe(call1Date)

    // it does not wait for the cache.set so we have to manually wait here until the blob storage got populated
    await new Promise<void>((resolve) => setTimeout(resolve, 100))

    // now the page should be in cache again and we should get a cache hit
    const call3 = await invokeFunction(ctx, { url: 'static/revalidate' })
    const call3Date = load(call3.body)('[data-testid="date-now"]').text()
    expect(call2Date, 'the date was not cached').toBe(call3Date)
    expect(call3.statusCode).toBe(200)
    expect(call3.headers, 'a cache hit after dynamically regenerating the stale page').toEqual(
      expect.objectContaining({
        'x-nextjs-cache': 'HIT',
      }),
    )
  })
})

describe('app router', () => {
  test<FixtureTestContext>('should have a page prerendered, then wait for it to get stale and on demand revalidate it', async (ctx) => {
    await createFixture('revalidate-fetch', ctx)
    console.time('runPlugin')
    await runPlugin(ctx)
    console.timeEnd('runPlugin')
    // check if the blob entries where successful set on the build plugin
    const blobEntries = await getBlobEntries(ctx)
    expect(blobEntries).toEqual([
      {
        key: 'cache/fetch-cache/460ed46cd9a194efa197be9f2571e51b729a039d1cff9834297f416dce5ada29',
        etag: expect.any(String),
      },
      {
        key: 'cache/fetch-cache/ad74683e49684ff4fe3d01ba1bef627bc0e38b61fa6bd8244145fbaca87f3c49',
        etag: expect.any(String),
      },
      { key: 'server/app/_not-found', etag: expect.any(String) },
      { key: 'server/app/index', etag: expect.any(String) },
      { key: 'server/app/posts/1', etag: expect.any(String) },
      { key: 'server/app/posts/2', etag: expect.any(String) },
    ])

    // test the function call
    const post1 = await invokeFunction(ctx, { url: 'posts/1' })
    const post1Date = load(post1.body)('[data-testid="date-now"]').text()
    expect(post1.statusCode).toBe(200)
    expect(load(post1.body)('h1').text()).toBe('Revalidate Fetch')
    expect(post1.headers, 'a cache hit on the first invocation of a prerendered page').toEqual(
      expect.objectContaining({
        'x-nextjs-cache': 'HIT',
        'netlify-cdn-cache-control': 's-maxage=3, stale-while-revalidate',
      }),
    )

    expect(await ctx.blobStore.get('server/app/posts/3')).toBeNull()
    // this page is not pre-rendered and should result in a cache miss
    const post3 = await invokeFunction(ctx, { url: 'posts/3' })
    expect(post3.statusCode).toBe(200)
    expect(load(post3.body)('h1').text()).toBe('Revalidate Fetch')
    expect(post3.headers, 'a cache miss on a non prerendered page').toEqual(
      expect.objectContaining({
        'x-nextjs-cache': 'MISS',
      }),
    )

    // wait to have a stale page
    await new Promise<void>((resolve) => setTimeout(resolve, 2_000))
    // after the dynamic call of `posts/3` it should be in cache, not this is after the timout as the cache set happens async
    expect(await ctx.blobStore.get('server/app/posts/3')).not.toBeNull()

    const stale = await invokeFunction(ctx, { url: 'posts/1' })
    const staleDate = load(stale.body)('[data-testid="date-now"]').text()
    expect(stale.statusCode).toBe(200)
    expect(stale.headers, 'a cache miss on a stale page').toEqual(
      expect.objectContaining({
        'x-nextjs-cache': 'MISS',
      }),
    )
    // it should have a new date rendered
    expect(staleDate, 'the date was cached and is matching the initial one').not.toBe(post1Date)

    // it does not wait for the cache.set so we have to manually wait here until the blob storage got populated
    await new Promise<void>((resolve) => setTimeout(resolve, 100))

    // now the page should be in cache again and we should get a cache hit
    const cached = await invokeFunction(ctx, { url: 'posts/1' })
    const cachedDate = load(cached.body)('[data-testid="date-now"]').text()
    expect(cached.statusCode).toBe(200)
    expect(staleDate, 'the date was not cached').toBe(cachedDate)
    expect(cached.headers, 'a cache hit after dynamically regenerating the stale page').toEqual(
      expect.objectContaining({
        'x-nextjs-cache': 'HIT',
      }),
    )
  })
})

describe('plugin', () => {
  test<FixtureTestContext>('server-components blob store created correctly', async (ctx) => {
    await createFixture('server-components', ctx)
    await runPlugin(ctx)
    // check if the blob entries where successful set on the build plugin
    const blobEntries = await getBlobEntries(ctx)
    expect(blobEntries.map((entry) => entry.key)).toEqual([
      'cache/fetch-cache/460ed46cd9a194efa197be9f2571e51b729a039d1cff9834297f416dce5ada29',
      'cache/fetch-cache/ac26c54e17c3018c17bfe5ae6adc0e6d37dbfaf28445c1f767ff267144264ac9',
      'cache/fetch-cache/ad74683e49684ff4fe3d01ba1bef627bc0e38b61fa6bd8244145fbaca87f3c49',
      'server/app/_not-found',
      'server/app/api/revalidate-handler',
      'server/app/index',
      'server/app/revalidate-fetch',
      'server/app/static-fetch/1',
      'server/app/static-fetch/2',
      'server/app/static-fetch-1',
      'server/app/static-fetch-2',
      'server/app/static-fetch-3',
    ])
  })
})

describe('route', () => {
  test<FixtureTestContext>('route handler with revalidate', async (ctx) => {
    await createFixture('server-components', ctx)
    await runPlugin(ctx)

    // check if the route got prerendered
    const blobEntry = await ctx.blobStore.get('server/app/api/revalidate-handler', { type: 'json' })
    expect(blobEntry).not.toBeNull()

    // test the first invocation of the route
    const call1 = await invokeFunction(ctx, { url: '/api/revalidate-handler' })
    const call1Body = JSON.parse(call1.body)
    const call1Time = call1Body.time
    expect(call1.statusCode).toBe(200)
    expect(call1Body).toMatchObject({
      data: expect.objectContaining({
        id: 1,
        name: 'Under the Dome',
      }),
    })
    expect(call1.headers, 'a cache hit on the first invocation of a prerendered route').toEqual(
      expect.objectContaining({
        'x-nextjs-cache': 'HIT',
      }),
    )
    // wait to have a stale route
    await new Promise<void>((resolve) => setTimeout(resolve, 2_000))

    const call2 = await invokeFunction(ctx, { url: '/api/revalidate-handler' })
    const call2Body = JSON.parse(call2.body)
    const call2Time = call2Body.time
    expect(call2.statusCode).toBe(200)
    // it should have a new date rendered
    expect(call2Body).toMatchObject({ data: expect.objectContaining({ id: 1 }) })
    expect(call2.headers, 'a cache miss on a stale route').toEqual(
      expect.objectContaining({
        'x-nextjs-cache': 'MISS',
      }),
    )
    expect(call1Time, 'the date is a new one on a stale route').not.toBe(call2Time)

    // it does not wait for the cache.set so we have to manually wait here until the blob storage got populated
    await new Promise<void>((resolve) => setTimeout(resolve, 100))

    const call3 = await invokeFunction(ctx, { url: '/api/revalidate-handler' })
    expect(call3.statusCode).toBe(200)
    const call3Body = JSON.parse(call3.body)
    const call3Time = call3Body.time
    expect(call3Body).toMatchObject({ data: expect.objectContaining({ id: 1 }) })
    expect(call3.headers, 'a cache hit after dynamically regenerating the stale  route').toEqual(
      expect.objectContaining({
        'x-nextjs-cache': 'HIT',
      }),
    )
    expect(call3Time, 'the date was cached as well').toBe(call2Time)
  })
})
