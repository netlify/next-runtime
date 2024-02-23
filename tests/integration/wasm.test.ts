import { load } from 'cheerio'
import { getLogger } from 'lambda-local'
import { v4 } from 'uuid'
import { beforeEach, expect, test, vi, describe } from 'vitest'
import {
  createFixture,
  invokeFunction,
  runPlugin,
  type FixtureTestContext,
  invokeEdgeFunction,
} from '../utils/fixture.js'
import { generateRandomObjectID, startMockBlobStore } from '../utils/helpers.js'
import { LocalServer } from '../utils/local-server.js'
import { platform } from 'node:process'

// Disable the verbose logging of the lambda-local runtime
getLogger().level = 'alert'

beforeEach<FixtureTestContext>(async (ctx) => {
  // set for each test a new deployID and siteID
  ctx.deployID = generateRandomObjectID()
  ctx.siteID = v4()
  vi.stubEnv('SITE_ID', ctx.siteID)
  vi.stubEnv('DEPLOY_ID', ctx.deployID)
  // hide debug logs in tests
  vi.spyOn(console, 'debug').mockImplementation(() => {})

  await startMockBlobStore(ctx)
})

describe.skipIf(platform === 'win32')('WASM', () => {
  beforeEach<FixtureTestContext>(async (ctx) => {
    // set for each test a new deployID and siteID
    ctx.deployID = generateRandomObjectID()
    ctx.siteID = v4()
    vi.stubEnv('SITE_ID', ctx.siteID)
    vi.stubEnv('DEPLOY_ID', ctx.deployID)
    // hide debug logs in tests
    vi.spyOn(console, 'debug').mockImplementation(() => {})

    await startMockBlobStore(ctx)

    await createFixture('wasm', ctx)
    await runPlugin(ctx)
  })

  test<FixtureTestContext>('should work in pages/api', async (ctx) => {
    const api = await invokeFunction(ctx, { url: '/api/og' })
    expect(api.statusCode).toBe(200)
    expect(api.headers['content-type']).toBe('image/png')
  })

  test<FixtureTestContext>('should work in app route', async (ctx) => {
    const og = await invokeFunction(ctx, { url: '/og' })
    expect(og.statusCode).toBe(200)
    expect(og.headers['content-type']).toBe('image/png')
  })

  test<FixtureTestContext>('should work in app route with node runtime', async (ctx) => {
    const ogNode = await invokeFunction(ctx, { url: '/og-node' })
    expect(ogNode.statusCode).toBe(200)
    expect(ogNode.headers['content-type']).toBe('image/png')
  })

  test<FixtureTestContext>('should work in middleware', async (ctx) => {
    const origin = new LocalServer()
    const response = await invokeEdgeFunction(ctx, {
      functions: ['___netlify-edge-handler-middleware'],
      origin,
      url: '/wasm?input=3',
    })

    ctx.cleanup?.push(() => origin.stop())

    const data = response.headers.get('data')

    expect(data).toBeDefined()

    const parsed = JSON.parse(data ?? '{}')
    expect(parsed.value).toBe(4)
  })
})
