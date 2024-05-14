import { load } from 'cheerio'
import { getLogger } from 'lambda-local'
import { v4 } from 'uuid'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { type FixtureTestContext } from '../utils/contexts.js'
import { createFixture, invokeFunction, runPlugin } from '../utils/fixture.js'
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

describe('ppr', () => {
  test.skipIf(process.env.NEXT_VERSION !== 'canary')<FixtureTestContext>(
    'Test that a simple next app with PPR is working',
    async (ctx) => {
      await createFixture('ppr', ctx)
      await runPlugin(ctx)

      // test the function call
      const home = await invokeFunction(ctx)

      console.log(JSON.stringify(home.headers, null, 2))

      const body = load(home.body)

      expect(home.statusCode).toBe(200)
      expect(body('h3').text()).toBe('Partial Prerendering')
      expect(body('#S\\:3').text()).toContain('Recommended Products for You')
    },
  )
})
