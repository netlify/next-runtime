import { load } from 'cheerio'
import getPort from 'get-port'
import { getLogger } from 'lambda-local'
import { createServer, type Server } from 'node:http'
import { v4 } from 'uuid'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import {
  createFixture,
  invokeFunction,
  runPlugin,
  type FixtureTestContext,
} from '../utils/fixture.js'
import {
  decodeBlobKey,
  encodeBlobKey,
  generateRandomObjectID,
  getBlobEntries,
  getFetchCacheKey,
  startMockBlobStore,
} from '../utils/helpers.js'

// Disable the verbose logging of the lambda-local runtime
getLogger().level = 'alert'

let apiBase: string
let testServer: Server
let handlerCalled = 0

beforeEach<FixtureTestContext>(async (ctx) => {
  // set for each test a new deployID and siteID
  ctx.deployID = generateRandomObjectID()
  ctx.siteID = v4()
  vi.stubEnv('SITE_ID', ctx.siteID)
  vi.stubEnv('DEPLOY_ID', ctx.deployID)
  // hide debug logs in tests
  // vi.spyOn(console, 'debug').mockImplementation(() => {})

  await startMockBlobStore(ctx)

  // create a fake endpoint to test if it got called
  const port = await getPort({ host: '0.0.0.0', exclude: [ctx.blobStorePort] })
  handlerCalled = 0

  testServer = createServer((_, res) => {
    handlerCalled++
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'cache-control': 'public, max-age=10000',
    })
    res.end(JSON.stringify({ id: '1', name: 'Fake response' }))
  })
  apiBase = await new Promise<string>((resolve) => {
    // we need always the same port so that the hash is the same
    testServer.listen(port, () => resolve(`http://0.0.0.0:${port}`))
  })
})

afterEach(async () => {
  testServer.closeAllConnections()
  await new Promise((resolve) => {
    testServer.on('close', resolve)
    testServer.close()
  })
})

test<FixtureTestContext>('if the fetch call is cached correctly', async (ctx) => {
  await createFixture('revalidate-fetch', ctx)
  console.time('TimeUntilStale')
  await runPlugin(ctx)

  // replace the build time fetch cache with our mocked hash
  const cacheKey = await getFetchCacheKey(new URL('/1', apiBase).href)
  const originalKey = '460ed46cd9a194efa197be9f2571e51b729a039d1cff9834297f416dce5ada29'
  const fakeKey = cacheKey
  const fetchEntry = await ctx.blobStore.get(encodeBlobKey(originalKey), { type: 'json' })

  await Promise.all([
    // delete the page cache so that it falls back to the fetch call
    ctx.blobStore.delete(encodeBlobKey('/posts/1')),
    // delete the original key as we use the fake key only
    ctx.blobStore.delete(encodeBlobKey(originalKey)),
    ctx.blobStore.setJSON(encodeBlobKey(fakeKey), fetchEntry),
  ])

  const blobEntries = await getBlobEntries(ctx)
  expect(blobEntries.map(({ key }) => decodeBlobKey(key)).sort()).toEqual(
    [
      '/404',
      '/index',
      '/posts/2',
      fakeKey,
      '404.html',
      '500.html',
      'ad74683e49684ff4fe3d01ba1bef627bc0e38b61fa6bd8244145fbaca87f3c49',
    ].sort(),
  )
  const post1 = await invokeFunction(ctx, {
    url: 'posts/1',
    env: {
      REVALIDATE_SECONDS: 10,
      API_BASE: apiBase,
    },
  })
  console.timeEnd('TimeUntilStale')

  const post1Name = load(post1.body)('[data-testid="name"]').text()
  // should still get the old value
  expect(handlerCalled, 'should not call the API as the request should be cached').toBe(0)
  expect(post1.statusCode).toBe(200)
  expect(post1Name).toBe('Under the Dome')
  expect(post1.headers, 'the page should be a miss').toEqual(
    expect.objectContaining({
      'cache-status': expect.stringMatching(/"Next.js"; miss/),
    }),
  )

  await new Promise<void>((resolve) => setTimeout(resolve, 10_000))
  // delete the generated page again to have a miss but go to the underlaying fetch call
  await ctx.blobStore.delete('server/app/posts/1')
  const post2 = await invokeFunction(ctx, {
    url: 'posts/1',
    env: {
      REVALIDATE_SECONDS: 10,
      API_BASE: apiBase,
    },
  })
  const post2Name = load(post2.body)('[data-testid="name"]').text()
  expect(post2.statusCode).toBe(200)
  expect.soft(post2Name).toBe('Fake response')
  expect(handlerCalled).toBe(1)
})
