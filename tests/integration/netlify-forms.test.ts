import { getLogger } from 'lambda-local'
import { v4 } from 'uuid'
import { beforeEach, expect, it, vi } from 'vitest'
import { type FixtureTestContext } from '../utils/contexts.js'
import { createFixture, runPlugin } from '../utils/fixture.js'
import { generateRandomObjectID, startMockBlobStore } from '../utils/helpers.js'

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

// test skipped until we actually start failing builds - right now we are just showing a warning
it.skip<FixtureTestContext>('should fail build when netlify forms are used', async (ctx) => {
  await createFixture('netlify-forms', ctx)

  const runPluginPromise = runPlugin(ctx)

  await expect(runPluginPromise).rejects.toThrow(
    '@netlify/plugin-next@5 does not support Netlify Forms',
  )
})
