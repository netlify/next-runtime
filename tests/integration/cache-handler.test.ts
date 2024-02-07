import { load } from 'cheerio'
import { getLogger } from 'lambda-local'
import { v4 } from 'uuid'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import {
  createFixture,
  invokeFunction,
  runPlugin,
  type FixtureTestContext,
  runPluginStep,
} from '../utils/fixture.js'
import {
  changeMDate,
  decodeBlobKey,
  encodeBlobKey,
  generateRandomObjectID,
  getBlobEntries,
  startMockBlobStore,
} from '../utils/helpers.js'
import { join } from 'path'
import { existsSync } from 'node:fs'
import { minify } from 'next/dist/build/swc/index.js'

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
    console.time('runPlugin')
    const {
      constants: { PUBLISH_DIR },
    } = await runPluginStep(ctx, 'onPreBuild')
    const filePaths = [
      'server/pages/static/revalidate-automatic.html',
      'server/pages/static/revalidate-automatic.json',
      'server/pages/static/revalidate-slow.html',
      'server/pages/static/revalidate-slow.json',
    ]

    filePaths.forEach(async (filePath) => {
      if (existsSync(filePath)) {
        // Changing the fetch files modified date to a past date since the test files are copied and dont preserve the mtime locally
        await changeMDate(join(PUBLISH_DIR, filePath), 1674690060000)
      }
    })
    await runPlugin(ctx)
    console.timeEnd('runPlugin')
    // check if the blob entries where successful set on the build plugin
    const blobEntries = await getBlobEntries(ctx)
    expect(blobEntries.map(({ key }) => decodeBlobKey(key.substring(0, 50))).sort()).toEqual([
      // the real key is much longer and ends in a hash, but we only assert on the first 50 chars to make it easier
      '/products/an-incredibly-long-product-',
      '/static/revalidate-automatic',
      '/static/revalidate-manual',
      '/static/revalidate-slow',
      '404.html',
      '500.html',
    ])

    // blob mtime is unpredictable, so this is just waiting for all blobs used from builds to get stale
    await new Promise<void>((resolve) => setTimeout(resolve, 10_000))

    // test the function call
    const call1 = await invokeFunction(ctx, { url: 'static/revalidate-automatic' })
    const call1Date = load(call1.body)('[data-testid="date-now"]').text()
    expect(call1.statusCode).toBe(200)
    expect(load(call1.body)('h1').text()).toBe('Show #71')
    // We waited for blobs to get stale so first invocation will actually be a cache hit
    // with stale being served, while fresh is generated in background
    expect(call1.headers, 'a stale page served with swr').toEqual(
      expect.objectContaining({
        'cache-status': '"Next.js"; hit; fwd=stale',
        'netlify-cdn-cache-control': 's-maxage=5, stale-while-revalidate=31536000',
      }),
    )

    // wait to have page regenerated in the background
    await new Promise<void>((resolve) => setTimeout(resolve, 500))

    const call2 = await invokeFunction(ctx, { url: 'static/revalidate-automatic' })
    const call2Date = load(call2.body)('[data-testid="date-now"]').text()
    expect(call2.statusCode).toBe(200)
    expect(load(call2.body)('h1').text()).toBe('Show #71')
    expect(
      call2.headers,
      'fresh page that was generated in background during previous call was served',
    ).toEqual(
      expect.objectContaining({
        'cache-status': '"Next.js"; hit',
        'netlify-cdn-cache-control': 's-maxage=5, stale-while-revalidate=31536000',
      }),
    )
    expect(
      call2Date.localeCompare(call1Date),
      'the date of regenerated page is newer than initial stale page',
    ).toBeGreaterThan(0)

    // ping that should serve the stale page for static/revalidate-slow, while revalidating in background
    await invokeFunction(ctx, { url: 'static/revalidate-slow' })

    // wait to have a stale page
    await new Promise<void>((resolve) => setTimeout(resolve, 6_000))

    // Ping this now so we can wait in parallel
    const callLater = await invokeFunction(ctx, { url: 'static/revalidate-slow' })

    // over 5 seconds since it was regenerated, so we should get stale response,
    // while fresh is generated in the background
    const call3 = await invokeFunction(ctx, { url: 'static/revalidate-automatic' })
    const call3Date = load(call3.body)('[data-testid="date-now"]').text()
    expect(call3.statusCode).toBe(200)
    expect(call3.headers, 'a stale page served with swr').toEqual(
      expect.objectContaining({
        'cache-status': '"Next.js"; hit; fwd=stale',
      }),
    )
    expect(call3Date, 'the date was cached and is matching the initially regenerated one').toBe(
      call2Date,
    )

    // Slow revalidate should still be a hit, but the maxage should be updated
    const callLater2 = await invokeFunction(ctx, { url: 'static/revalidate-slow' })

    expect(callLater2.statusCode).toBe(200)

    expect(callLater2.headers, 'date header matches the cached value').toEqual(
      expect.objectContaining({
        'cache-status': '"Next.js"; hit',
        date: callLater.headers['date'],
      }),
    )

    // it does not wait for the cache.set so we have to manually wait here until the blob storage got populated
    await new Promise<void>((resolve) => setTimeout(resolve, 500))

    // now the page should be in cache again and we should get a cache hit
    const call4 = await invokeFunction(ctx, { url: 'static/revalidate-automatic' })
    const call4Date = load(call4.body)('[data-testid="date-now"]').text()
    expect(call4Date, 'the date was not cached').not.toBe(call3Date)
    expect(call4.statusCode).toBe(200)
    expect(
      call4.headers,
      'a cache hit after dynamically regenerating the stale page in the background',
    ).toEqual(
      expect.objectContaining({
        'cache-status': expect.stringMatching(/"Next.js"; hit/),
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
    expect(blobEntries.map(({ key }) => decodeBlobKey(key)).sort()).toEqual([
      '/404',
      '/index',
      '/posts/1',
      '/posts/2',
      '404.html',
      '460ed46cd9a194efa197be9f2571e51b729a039d1cff9834297f416dce5ada29',
      '500.html',
      'ad74683e49684ff4fe3d01ba1bef627bc0e38b61fa6bd8244145fbaca87f3c49',
    ])

    // blob mtime is unpredictable, so this is just waiting for all blobs used from builds to get stale
    await new Promise<void>((resolve) => setTimeout(resolve, 10_000))

    // test the function call
    const post1 = await invokeFunction(ctx, { url: 'posts/1' })
    const post1Date = load(post1.body)('[data-testid="date-now"]').text()
    expect(post1.statusCode).toBe(200)
    expect(load(post1.body)('h1').text()).toBe('Revalidate Fetch')
    expect(post1.headers, 'a stale response on the first invocation of a prerendered page').toEqual(
      // It will be stale instead of hit
      expect.objectContaining({
        'cache-status': '"Next.js"; hit; fwd=stale',
        'netlify-cdn-cache-control': 's-maxage=5, stale-while-revalidate=31536000',
      }),
    )

    expect(await ctx.blobStore.get(encodeBlobKey('/posts/3'))).toBeNull()
    // this page is not pre-rendered and should result in a cache miss
    const post3 = await invokeFunction(ctx, { url: 'posts/3' })
    expect(post3.statusCode).toBe(200)
    expect(load(post3.body)('h1').text()).toBe('Revalidate Fetch')
    expect(post3.headers, 'a cache miss on a non prerendered page').toEqual(
      expect.objectContaining({
        'cache-status': '"Next.js"; fwd=miss',
      }),
    )

    // wait to have a stale page
    await new Promise<void>((resolve) => setTimeout(resolve, 6_000))
    // after the dynamic call of `posts/3` it should be in cache, not this is after the timout as the cache set happens async
    expect(await ctx.blobStore.get(encodeBlobKey('/posts/3'))).not.toBeNull()

    const stale = await invokeFunction(ctx, { url: 'posts/1' })
    const staleDate = load(stale.body)('[data-testid="date-now"]').text()
    expect(stale.statusCode).toBe(200)
    expect(stale.headers, 'a stale swr page is served').toEqual(
      expect.objectContaining({
        'cache-status': '"Next.js"; hit; fwd=stale',
      }),
    )
    // it should've been regenerated in the background after the first call
    // so the date should be different
    expect(staleDate, 'the date was cached and is matching the initial one').not.toBe(post1Date)

    // it does not wait for the cache.set so we have to manually wait here until the blob storage got populated
    await new Promise<void>((resolve) => setTimeout(resolve, 500))

    // now the page should be in cache again and we should get a cache hit
    const cached = await invokeFunction(ctx, { url: 'posts/1' })
    const cachedDate = load(cached.body)('[data-testid="date-now"]').text()
    expect(cached.statusCode).toBe(200)
    expect(cachedDate, 'the date is not stale').not.toBe(staleDate)
    expect(cached.headers, 'a cache hit after dynamically regenerating the stale page').toEqual(
      expect.objectContaining({
        'cache-status': '"Next.js"; hit',
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
    expect(blobEntries.map(({ key }) => decodeBlobKey(key)).sort()).toEqual([
      '/404',
      '/api/revalidate-handler',
      '/index',
      '/revalidate-fetch',
      '/static-fetch-1',
      '/static-fetch-2',
      '/static-fetch-3',
      '/static-fetch/1',
      '/static-fetch/2',
      '404.html',
      '460ed46cd9a194efa197be9f2571e51b729a039d1cff9834297f416dce5ada29',
      '500.html',
      'ac26c54e17c3018c17bfe5ae6adc0e6d37dbfaf28445c1f767ff267144264ac9',
      'ad74683e49684ff4fe3d01ba1bef627bc0e38b61fa6bd8244145fbaca87f3c49',
    ])
  })
})

describe('route', () => {
  test<FixtureTestContext>('route handler with revalidate', async (ctx) => {
    await createFixture('server-components', ctx)
    await runPlugin(ctx)

    // check if the route got prerendered
    const blobEntry = await ctx.blobStore.get(encodeBlobKey('/api/revalidate-handler'), {
      type: 'json',
    })
    expect(blobEntry).not.toBeNull()

    // blob mtime is unpredictable, so this is just waiting for all blobs used from builds to get stale
    await new Promise<void>((resolve) => setTimeout(resolve, 10_000))

    // test the first invocation of the route - we should get stale response while fresh is generated in the background
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
    expect(call1.headers, 'a stale route served with swr').toEqual(
      expect.objectContaining({
        'cache-status': '"Next.js"; hit; fwd=stale',
      }),
    )

    // it does not wait for the cache.set so we have to manually wait here until the blob storage got populated
    await new Promise<void>((resolve) => setTimeout(resolve, 500))

    const call2 = await invokeFunction(ctx, { url: '/api/revalidate-handler' })
    const call2Body = JSON.parse(call2.body)
    const call2Time = call2Body.time
    expect(call2.statusCode).toBe(200)
    expect(call2Body).toMatchObject({
      data: expect.objectContaining({
        id: 1,
        name: 'Under the Dome',
      }),
    })
    expect(call2.headers, 'a cache hit on the second invocation').toEqual(
      expect.objectContaining({
        'cache-status': '"Next.js"; hit',
      }),
    )
    expect(call2Time, 'the date is new').not.toBe(call1Time)

    // wait to have a stale route again
    await new Promise<void>((resolve) => setTimeout(resolve, 8_000))

    const call3 = await invokeFunction(ctx, { url: '/api/revalidate-handler' })
    const call3Body = JSON.parse(call3.body)
    const call3Time = call3Body.time
    expect(call3.statusCode).toBe(200)
    expect(call3Body).toMatchObject({ data: expect.objectContaining({ id: 1 }) })
    expect(call3.headers, 'a stale route served with swr').toEqual(
      expect.objectContaining({
        'cache-status': '"Next.js"; hit; fwd=stale',
      }),
    )
    expect(
      call2Time,
      'the date is the old one on the stale route, while the refresh is happening in the background',
    ).toBe(call3Time)

    // it does not wait for the cache.set so we have to manually wait here until the blob storage got populated
    await new Promise<void>((resolve) => setTimeout(resolve, 500))

    const call4 = await invokeFunction(ctx, { url: '/api/revalidate-handler' })
    expect(call4.statusCode).toBe(200)
    const call4Body = JSON.parse(call4.body)
    const call4Time = call4Body.time
    expect(call4Body).toMatchObject({ data: expect.objectContaining({ id: 1 }) })
    expect(call4.headers, 'a cache hit after dynamically regenerating the stale route').toEqual(
      expect.objectContaining({
        'cache-status': '"Next.js"; hit',
      }),
    )
    expect(call4Time, 'the date is new').not.toBe(call3Time)
  })
})
