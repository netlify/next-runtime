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
  runPluginStep,
  type FixtureTestContext,
} from '../utils/fixture.js'
import { generateRandomObjectID, startMockBlobStore } from '../utils/helpers.js'

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
    const date = new Date().toISOString()
    res.end(JSON.stringify({ id: '1', name: 'Fake response', date }))
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

test<FixtureTestContext>('if the fetch call is cached correctly (force-dynamic page)', async (ctx) => {
  await createFixture('revalidate-fetch', ctx)
  await runPluginStep(ctx, 'onPreBuild')
  await runPlugin(ctx)

  handlerCalled = 0
  const post1 = await invokeFunction(ctx, {
    url: 'dynamic-posts/1',
    env: {
      REVALIDATE_SECONDS: 5,
      API_BASE: apiBase,
    },
  })

  // allow for background regeneration to happen
  await new Promise<void>((resolve) => setTimeout(resolve, 500))

  const post1FetchDate = load(post1.body)('[data-testid="date-from-response"]').text()
  const post1Name = load(post1.body)('[data-testid="name"]').text()

  expect(
    handlerCalled,
    'API should be hit as fetch did NOT happen during build for dynamic page',
  ).toBeGreaterThan(0)
  expect(post1.statusCode).toBe(200)
  expect(post1Name).toBe('Fake response')
  expect(post1.headers, 'the page should not be cacheable').toEqual(
    expect.not.objectContaining({
      'cache-status': expect.any(String),
    }),
  )

  handlerCalled = 0
  const post2 = await invokeFunction(ctx, {
    url: 'dynamic-posts/1',
    env: {
      REVALIDATE_SECONDS: 5,
      API_BASE: apiBase,
    },
  })

  // allow for any potential background regeneration to happen
  await new Promise<void>((resolve) => setTimeout(resolve, 500))

  const post2FetchDate = load(post2.body)('[data-testid="date-from-response"]').text()
  const post2Name = load(post2.body)('[data-testid="name"]').text()

  expect(handlerCalled, 'API should NOT be hit as fetch-cache is still fresh').toBe(0)
  expect(post2FetchDate, 'Cached fetch response should be used').toBe(post1FetchDate)
  expect(post2.statusCode).toBe(200)
  expect(post2Name).toBe('Fake response')
  expect(post2.headers, 'the page should not be cacheable').toEqual(
    expect.not.objectContaining({
      'cache-status': expect.any(String),
    }),
  )

  // make fetch-cache stale
  await new Promise<void>((resolve) => setTimeout(resolve, 7_000))

  handlerCalled = 0
  const post3 = await invokeFunction(ctx, {
    url: 'dynamic-posts/1',
    env: {
      REVALIDATE_SECONDS: 5,
      API_BASE: apiBase,
    },
  })

  // allow for any potential background regeneration to happen
  await new Promise<void>((resolve) => setTimeout(resolve, 500))

  const post3FetchDate = load(post3.body)('[data-testid="date-from-response"]').text()
  const post3Name = load(post3.body)('[data-testid="name"]').text()

  // note here that we are testing if API was called it least once and not that it was
  // hit exactly once - this is because of Next.js quirk that seems to cause multiple
  // fetch calls being made for single request
  // https://github.com/vercel/next.js/issues/44655
  expect(
    handlerCalled,
    'API should be hit as fetch did go stale and should be revalidated',
  ).toBeGreaterThan(0)
  expect(
    post3FetchDate,
    'Cached fetch response should be used (revalidation happen in background)',
  ).toBe(post1FetchDate)
  expect(post3.statusCode).toBe(200)
  expect(post3Name).toBe('Fake response')
  expect(post3.headers, 'the page should not be cacheable').toEqual(
    expect.not.objectContaining({
      'cache-status': expect.any(String),
    }),
  )

  handlerCalled = 0
  const post4 = await invokeFunction(ctx, {
    url: 'dynamic-posts/1',
    env: {
      REVALIDATE_SECONDS: 5,
      API_BASE: apiBase,
    },
  })

  // allow for any potential background regeneration to happen
  await new Promise<void>((resolve) => setTimeout(resolve, 500))

  const post4FetchDate = load(post4.body)('[data-testid="date-from-response"]').text()
  const post4Name = load(post4.body)('[data-testid="name"]').text()

  expect(
    handlerCalled,
    'API should NOT be hit as fetch-cache is still fresh after being revalidated in background by previous request',
  ).toBe(0)
  expect(
    post4FetchDate,
    'Response cached in background by previous request should be used',
  ).not.toBe(post3FetchDate)
  expect(post4.statusCode).toBe(200)
  expect(post4Name).toBe('Fake response')
  expect(post4.headers, 'the page should not be cacheable').toEqual(
    expect.not.objectContaining({
      'cache-status': expect.any(String),
    }),
  )
})

test<FixtureTestContext>('if the fetch call is cached correctly (cached page response)', async (ctx) => {
  await createFixture('revalidate-fetch', ctx)
  await runPluginStep(ctx, 'onPreBuild')
  await runPlugin(ctx)

  handlerCalled = 0
  const post1 = await invokeFunction(ctx, {
    url: 'posts/1',
    env: {
      REVALIDATE_SECONDS: 5,
      API_BASE: apiBase,
    },
  })

  // allow for background regeneration to happen
  await new Promise<void>((resolve) => setTimeout(resolve, 500))

  const post1FetchDate = load(post1.body)('[data-testid="date-from-response"]').text()
  const post1Name = load(post1.body)('[data-testid="name"]').text()

  expect(handlerCalled, 'API should be hit as page was revalidated in background').toBeGreaterThan(
    0,
  )
  expect(post1.statusCode).toBe(200)
  expect(post1Name, 'a stale page served with swr').not.toBe('Fake response')
  expect(post1.headers, 'a stale page served with swr').toEqual(
    expect.objectContaining({
      'cache-status': '"Next.js"; hit; fwd=stale',
      'netlify-cdn-cache-control': 's-maxage=5, stale-while-revalidate=31536000',
    }),
  )

  handlerCalled = 0
  const post2 = await invokeFunction(ctx, {
    url: 'posts/1',
    env: {
      REVALIDATE_SECONDS: 5,
      API_BASE: apiBase,
    },
  })

  // allow for any potential background regeneration to happen
  await new Promise<void>((resolve) => setTimeout(resolve, 500))

  const post2FetchDate = load(post2.body)('[data-testid="date-from-response"]').text()
  const post2Name = load(post2.body)('[data-testid="name"]').text()

  expect(
    handlerCalled,
    'API should NOT be hit as fetch-cache is still fresh after being revalidated in background by previous request',
  ).toBe(0)
  expect(
    post2FetchDate,
    'Response cached after being revalidated in background should be now used',
  ).not.toBe(post1FetchDate)
  expect(post2.statusCode).toBe(200)
  expect(
    post2Name,
    'Response cached after being revalidated in background should be now used',
  ).toBe('Fake response')
  expect(
    post2.headers,
    'Still fresh response after being regenerated in background by previous request',
  ).toEqual(
    expect.objectContaining({
      'cache-status': '"Next.js"; hit',
      'netlify-cdn-cache-control': 's-maxage=5, stale-while-revalidate=31536000',
    }),
  )

  // make response and fetch-cache stale
  await new Promise<void>((resolve) => setTimeout(resolve, 7_000))

  handlerCalled = 0
  const post3 = await invokeFunction(ctx, {
    url: 'posts/1',
    env: {
      REVALIDATE_SECONDS: 5,
      API_BASE: apiBase,
    },
  })

  // allow for any potential background regeneration to happen
  await new Promise<void>((resolve) => setTimeout(resolve, 500))

  const post3FetchDate = load(post3.body)('[data-testid="date-from-response"]').text()
  const post3Name = load(post3.body)('[data-testid="name"]').text()

  // note here that we are testing if API was called it least once and not that it was
  // hit exactly once - this is because of Next.js quirk that seems to cause multiple
  // fetch calls being made for single request
  // https://github.com/vercel/next.js/issues/44655
  expect(
    handlerCalled,
    'API should be hit as fetch did go stale and should be revalidated',
  ).toBeGreaterThan(0)
  expect(
    post3FetchDate,
    'Cached fetch response should be used (revalidation happen in background)',
  ).toBe(post2FetchDate)
  expect(post3.statusCode).toBe(200)
  expect(post3Name).toBe('Fake response')
  expect(post3.headers, 'a stale page served with swr').toEqual(
    expect.objectContaining({
      'cache-status': '"Next.js"; hit; fwd=stale',
      'netlify-cdn-cache-control': 's-maxage=5, stale-while-revalidate=31536000',
    }),
  )

  handlerCalled = 0
  const post4 = await invokeFunction(ctx, {
    url: 'posts/1',
    env: {
      REVALIDATE_SECONDS: 5,
      API_BASE: apiBase,
    },
  })

  // allow for any potential background regeneration to happen
  await new Promise<void>((resolve) => setTimeout(resolve, 500))

  const post4FetchDate = load(post4.body)('[data-testid="date-from-response"]').text()
  const post4Name = load(post4.body)('[data-testid="name"]').text()

  expect(
    handlerCalled,
    'API should NOT be hit as fetch-cache is still fresh after being revalidated in background by previous request',
  ).toBe(0)
  expect(
    post4FetchDate,
    'Response cached in background by previous request should be used',
  ).not.toBe(post3FetchDate)
  expect(post4.statusCode).toBe(200)
  expect(post4Name).toBe('Fake response')
  expect(
    post4.headers,
    'Still fresh response after being regenerated in background by previous request',
  ).toEqual(
    expect.objectContaining({
      'cache-status': '"Next.js"; hit',
      'netlify-cdn-cache-control': 's-maxage=5, stale-while-revalidate=31536000',
    }),
  )
})
