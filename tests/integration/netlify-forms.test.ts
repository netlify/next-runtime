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
  vi.resetModules()

  await startMockBlobStore(ctx)
})

it<FixtureTestContext>('should warn when netlify forms are used', async (ctx) => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

  await createFixture('netlify-forms', ctx)

  const runPluginPromise = await runPlugin(ctx)

  expect(warn).toBeCalledWith(
    '@netlify/plugin-next@5 does not support Netlify Forms. Refer to https://ntl.fyi/next-runtime-forms-migration for migration example.',
  )
})

it<FixtureTestContext>('should not warn when netlify forms are used with workaround', async (ctx) => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

  await createFixture('netlify-forms-workaround', ctx)

  const runPluginPromise = await runPlugin(ctx)

  expect(warn).not.toBeCalled()
})
