import { load } from 'cheerio'
import { getLogger } from 'lambda-local'
import { platform } from 'node:process'
import { v4 } from 'uuid'
import { beforeEach, expect, test, vi } from 'vitest'
import { type FixtureTestContext } from '../utils/contexts.js'
import { createFixture, invokeFunction, runPlugin } from '../utils/fixture.js'
import { generateRandomObjectID, startMockBlobStore } from '../utils/helpers.js'

// Disable the verbose logging of the lambda-local runtime
getLogger().level = 'alert'

beforeEach<FixtureTestContext>(async (ctx) => {
  // set for each test a new deployID and siteID
  ctx.deployID = generateRandomObjectID()
  ctx.siteID = v4()
  vi.stubEnv('DEPLOY_ID', ctx.deployID)
  // hide debug logs in tests
  // vi.spyOn(console, 'debug').mockImplementation(() => {})

  await startMockBlobStore(ctx)
})

test.skipIf(platform === 'win32')<FixtureTestContext>(
  'that the runtime works correctly with the pnpm package manager',
  async (ctx) => {
    await createFixture('pnpm', ctx)
    await runPlugin(ctx)

    const home = await invokeFunction(ctx)
    expect(home.statusCode).toBe(200)
    expect(load(home.body)('h1').text()).toBe('Home')
  },
)
