import { getLogger } from 'lambda-local'
import { v4 } from 'uuid'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { type FixtureTestContext } from '../../utils/contexts.js'
import { createFixture, invokeFunction, runPlugin } from '../../utils/fixture.js'
import { generateRandomObjectID, startMockBlobStore } from '../../utils/helpers.js'

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

describe('`serverless_functions_nextjs_durable_cache_disable` feature flag', () => {
  test<FixtureTestContext>('uses durable cache when flag is nil', async (ctx) => {
    await createFixture('simple', ctx)
    await runPlugin(ctx)

    const { headers } = await invokeFunction(ctx, {
      flags: { serverless_functions_nextjs_durable_cache_disable: undefined },
    })

    expect(headers['netlify-cdn-cache-control']).toContain('durable')
  })

  test<FixtureTestContext>('uses durable cache when flag is `false`', async (ctx) => {
    await createFixture('simple', ctx)
    await runPlugin(ctx)

    const { headers } = await invokeFunction(ctx, {
      flags: { serverless_functions_nextjs_durable_cache_disable: false },
    })

    expect(headers['netlify-cdn-cache-control']).toContain('durable')
  })

  test<FixtureTestContext>('does not use durable cache when flag is `true`', async (ctx) => {
    await createFixture('simple', ctx)
    await runPlugin(ctx)

    const { headers } = await invokeFunction(ctx, {
      flags: { serverless_functions_nextjs_durable_cache_disable: true },
    })

    expect(headers['netlify-cdn-cache-control']).not.toContain('durable')
  })
})
