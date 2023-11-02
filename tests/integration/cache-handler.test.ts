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

test<FixtureTestContext>(
  'should have two pages with fetch pre rendered and revalidated',
  async (ctx) => {
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

    // this page is not pre-rendered and should result in a cache miss
    const post3 = await invokeFunction(ctx, { url: 'posts/3' })
    expect(post3.statusCode).toBe(200)
    expect(load(post3.body)('h1').text()).toBe('Revalidate Fetch')
    expect(post3.headers).toEqual(
      expect.objectContaining({
        'x-nextjs-cache': 'MISS',
      }),
    )

    // TODO: uncomment once stale is implemented via the cache tags manifest
    // wait 500ms to have a stale page
    // await new Promise<void>((resolve) => setTimeout(resolve, 500))

    // const stale = await invokeFunction(ctx, { url: 'posts/1' })
    // expect(stale.statusCode).toBe(200)
    // // it should have a new date rendered
    // expect(load(stale.body)('[data-testid="date-now"]').text()).not.toBe(post1Date)
    // expect(stale.headers).toEqual(
    //   expect.objectContaining({
    //     'x-nextjs-cache': 'MISS',
    //   }),
    // )
  },
  { retry: 3 },
)
