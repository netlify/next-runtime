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
  createBlobContext,
  generateRandomObjectID,
  getBlobEntries,
  startMockBlobStore,
} from '../utils/helpers.js'

// Disable the verbose logging of the lambda-local runtime
getLogger().level = 'alert'

beforeEach<FixtureTestContext>(async (ctx) => {
  await startMockBlobStore(ctx)
  // set for each test a new deployID and siteID
  ctx.deployID = generateRandomObjectID()
  ctx.siteID = v4()
  vi.stubEnv('DEPLOY_ID', ctx.deployID)
  vi.stubEnv('NETLIFY_BLOBS_CONTEXT', createBlobContext(ctx))
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
  expect(post1.headers).toEqual(
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
  expect(post3.headers).toEqual(
    expect.objectContaining({
      'x-nextjs-cache': 'MISS',
    }),
  )

  // wait to have a stale page
  await new Promise<void>((resolve) => setTimeout(resolve, 1_000))
  // after the dynamic call of `posts/3` it should be in cache, not this is after the timout as the cache set happens async
  expect(await ctx.blobStore.get('server/app/posts/3')).not.toBeNull()

  const stale = await invokeFunction(ctx, { url: 'posts/1' })
  const staleDate = load(stale.body)('[data-testid="date-now"]').text()
  expect(stale.statusCode).toBe(200)
  // it should have a new date rendered
  expect(staleDate, 'the date was cached and is matching the initial one').not.toBe(post1Date)
  expect(stale.headers).toEqual(
    expect.objectContaining({
      'x-nextjs-cache': 'MISS',
    }),
  )

  // it does not wait for the cache.set so we have to manually wait here until the blob storage got populated
  await new Promise<void>((resolve) => setTimeout(resolve, 100))

  // now the page should be in cache again and we should get a cache hit
  const cached = await invokeFunction(ctx, { url: 'posts/1' })
  const cachedDate = load(cached.body)('[data-testid="date-now"]').text()
  expect(cached.statusCode).toBe(200)
  expect(staleDate, 'the date was not cached').toBe(cachedDate)
  expect(cached.headers).toEqual(
    expect.objectContaining({
      'x-nextjs-cache': 'HIT',
    }),
  )
})
