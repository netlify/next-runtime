import { load } from 'cheerio'
import { getLogger } from 'lambda-local'
import { v4 } from 'uuid'
import { beforeEach, expect, test, vi } from 'vitest'
import {
  createFixture,
  invokeFunction,
  runPlugin,
  type FixtureTestContext,
} from '../utils/fixture.js'
import {
  encodeBlobKey,
  generateRandomObjectID,
  getBlobEntries,
  startMockBlobStore,
} from '../utils/helpers.js'
import { glob } from 'fast-glob'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { rm } from 'node:fs/promises'

// Disable the verbose logging of the lambda-local runtime
getLogger().level = 'alert'

beforeEach<FixtureTestContext>(async (ctx) => {
  // set for each test a new deployID and siteID
  ctx.deployID = generateRandomObjectID()
  ctx.siteID = v4()
  vi.stubEnv('SITE_ID', ctx.siteID)
  vi.stubEnv('DEPLOY_ID', ctx.deployID)
  vi.stubEnv('NETLIFY_PURGE_API_TOKEN', 'fake-token')

  await startMockBlobStore(ctx)
})

// monorepo test uses process.chdir which is not working inside vite workers
// so I'm disabling that test for now will revisit later in a follow up PR.
// we have at least a e2e test that tests the monorepo functionality
test.skip<FixtureTestContext>('should create the files in the correct directories', async (ctx) => {
  await createFixture('turborepo-npm', ctx)
  await runPlugin(ctx, { PACKAGE_PATH: 'apps/web' })

  // test if the files got generated in the correct locations
  expect(
    existsSync(join(ctx.cwd, '.netlify')),
    'should not have a .netlify folder in the repository root',
  ).toBeFalsy()

  expect(existsSync(join(ctx.cwd, 'apps/web/.netlify'))).toBeTruthy()

  await rm(join(ctx.cwd, 'apps/web/.netlify'), { recursive: true, force: true })
  await runPlugin(ctx, { PACKAGE_PATH: 'apps/page-router' })

  const staticPageInitial = await invokeFunction(ctx, { url: '/static/revalidate-manual' })
  console.log(staticPageInitial.body)
  expect(staticPageInitial.statusCode < 400).toBeTruthy()
})
