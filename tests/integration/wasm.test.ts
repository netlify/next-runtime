import { load } from 'cheerio'
import { getLogger } from 'lambda-local'
import { v4 } from 'uuid'
import { beforeEach, expect, test, vi, describe } from 'vitest'
import {
  createFixture,
  invokeFunction,
  runPlugin,
  type FixtureTestContext,
} from '../utils/fixture.js'
import { generateRandomObjectID, startMockBlobStore } from '../utils/helpers.js'

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

describe('WASM', () => {
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
})
