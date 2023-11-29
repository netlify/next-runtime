import { v4 } from 'uuid'
import { beforeEach, expect, test, vi } from 'vitest'
import {
  createFixture,
  invokeEdgeFunction,
  runPlugin,
  type FixtureTestContext,
} from '../utils/fixture.js'
import { generateRandomObjectID, startMockBlobStore } from '../utils/helpers.js'

beforeEach<FixtureTestContext>(async (ctx) => {
  // set for each test a new deployID and siteID
  ctx.deployID = generateRandomObjectID()
  ctx.siteID = v4()
  vi.stubEnv('DEPLOY_ID', ctx.deployID)

  await startMockBlobStore(ctx)
})

test<FixtureTestContext>('simple test if everything works', async (ctx) => {
  await createFixture('middleware', ctx)
  await runPlugin(ctx)

  const response1 = await invokeEdgeFunction(ctx)
  expect(response1.status).toBe(200)
  expect(await response1.json()).toEqual({ success: true })
})
