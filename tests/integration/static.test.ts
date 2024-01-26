import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { load } from 'cheerio'
import { getLogger } from 'lambda-local'
import glob from 'fast-glob'
import { v4 } from 'uuid'
import { beforeEach, expect, test, vi } from 'vitest'
import {
  createFixture,
  invokeFunction,
  runPlugin,
  runPluginStep,
  type FixtureTestContext,
} from '../utils/fixture.js'
import {
  decodeBlobKey,
  generateRandomObjectID,
  getBlobEntries,
  startMockBlobStore,
} from '../utils/helpers.js'

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

test<FixtureTestContext>('requesting a non existing page route that needs to be fetched from the CDN', async (ctx) => {
  await createFixture('page-router', ctx)
  await runPlugin(ctx)

  const entries = await getBlobEntries(ctx)
  expect(entries.map(({ key }) => decodeBlobKey(key.substring(0, 50))).sort()).toEqual([
    '404.html',
    '500.html',
    // the real key is much longer and ends in a hash, but we only assert on the first 50 chars to make it easier
    'products/an-incredibly-long-product-n',
    'static/revalidate-automatic',
    'static/revalidate-manual',
    'static/revalidate-slow',
  ])

  // test that it should request the 404.html file
  const call1 = await invokeFunction(ctx, { url: 'static/revalidate-not-existing' })
  expect(call1.statusCode).toBe(404)
  expect(load(call1.body)('h1').text()).toBe('404')
  expect(call1.headers, 'a cache hit on the first invocation of a prerendered page').toEqual(
    expect.objectContaining({
      'netlify-cdn-cache-control': 'no-cache, no-store, max-age=0, must-revalidate',
    }),
  )
})

test<FixtureTestContext>('linked static resources are placed in correct place in publish directory (no basePath)', async (ctx) => {
  await createFixture('simple-next-app', ctx)
  const {
    constants: { PUBLISH_DIR },
  } = await runPlugin(ctx)

  const publishDirAfterBuild = (
    await glob('**/*', { cwd: PUBLISH_DIR, dot: true, absolute: true })
  ).sort()

  await runPluginStep(ctx, 'onPostBuild')

  // fetch index page
  const call1 = await invokeFunction(ctx, { url: '/' })
  expect(call1.statusCode).toBe(200)

  const document = load(call1.body)

  // collect linked resources - those should
  // contain scripts and an image (can contain duplicates)
  const resourcesPaths = [
    ...Array.from(document('script[src]')).map((elem) => {
      return elem.attribs.src
    }),
    ...Array.from(document('link[href]')).map((elem) => {
      return elem.attribs.href
    }),
    ...Array.from(document('img[src]')).map((elem) => {
      return elem.attribs.src
    }),
  ]

  // To make sure test works as expected, we will check if we found
  // at least one script and one image
  expect(resourcesPaths.find((path) => path.endsWith('.js'))).not.toBeUndefined()
  expect(resourcesPaths.find((path) => path.endsWith('.jpg'))).not.toBeUndefined()

  // check if linked resources are accessible in publish dir in expected locations
  for (const path of resourcesPaths) {
    expect(existsSync(join(PUBLISH_DIR, path))).toBe(true)
  }

  // check if we restore publish dir to its original state
  await runPluginStep(ctx, 'onEnd')
  expect((await glob('**/*', { cwd: PUBLISH_DIR, dot: true, absolute: true })).sort()).toEqual(
    publishDirAfterBuild,
  )
})

test<FixtureTestContext>('linked static resources are placed in correct place in publish directory (with basePath)', async (ctx) => {
  await createFixture('simple-next-app-base-path', ctx)
  const {
    constants: { PUBLISH_DIR },
  } = await runPlugin(ctx)

  const publishDirAfterBuild = (
    await glob('**/*', { cwd: PUBLISH_DIR, dot: true, absolute: true })
  ).sort()

  await runPluginStep(ctx, 'onPostBuild')

  // fetch index page
  const call1 = await invokeFunction(ctx, { url: 'base/path' })
  expect(call1.statusCode).toBe(200)

  const document = load(call1.body)

  // collect linked resources - those should
  // contain scripts and an image (can contain duplicates because of preload links)
  const resourcesPaths = [
    ...Array.from(document('script[src]')).map((elem) => {
      return elem.attribs.src
    }),
    ...Array.from(document('link[href]')).map((elem) => {
      return elem.attribs.href
    }),
    ...Array.from(document('img[src]')).map((elem) => {
      return elem.attribs.src
    }),
  ]

  // To make sure test works as expected, we will check if we found
  // at least one script and one image
  expect(resourcesPaths.find((path) => path.endsWith('.js'))).not.toBeUndefined()
  expect(resourcesPaths.find((path) => path.endsWith('.jpg'))).not.toBeUndefined()

  // check if linked resources are accessible in publish dir in expected locations
  for (const path of resourcesPaths) {
    expect(existsSync(join(PUBLISH_DIR, path))).toBe(true)
  }
  // check if we restore publish dir to its original state
  await runPluginStep(ctx, 'onEnd')
  expect((await glob('**/*', { cwd: PUBLISH_DIR, dot: true, absolute: true })).sort()).toEqual(
    publishDirAfterBuild,
  )
})
