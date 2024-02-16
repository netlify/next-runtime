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
  vi.stubEnv('SITE_ID', ctx.siteID)
  vi.stubEnv('DEPLOY_ID', ctx.deployID)
  // hide debug logs in tests
  vi.spyOn(console, 'debug').mockImplementation(() => {})

  await startMockBlobStore(ctx)
})

test<FixtureTestContext>('Test that the simple next app is working', async (ctx) => {
  await createFixture('simple-next-app', ctx)
  await runPlugin(ctx)
  // check if the blob entries where successful set on the build plugin
  const blobEntries = await getBlobEntries(ctx)
  expect(blobEntries.map(({ key }) => decodeBlobKey(key)).sort()).toEqual([
    '/404',
    '/image',
    '/index',
    '/other',
    '/redirect',
    '/redirect/response',
    '404.html',
    '500.html',
  ])

  // test the function call
  const home = await invokeFunction(ctx)
  expect(home.statusCode).toBe(200)
  expect(load(home.body)('h1').text()).toBe('Home')

  const other = await invokeFunction(ctx, { url: 'other' })
  expect(other.statusCode).toBe(200)
  expect(load(other.body)('h1').text()).toBe('Other')

  const notFound = await invokeFunction(ctx, { url: 'not-found' })
  expect(notFound.statusCode).toBe(404)
  expect(load(notFound.body)('h1').text()).toBe('404')
})

test<FixtureTestContext>('Should add cache-tags to prerendered app pages', async (ctx) => {
  await createFixture('simple-next-app', ctx)
  await runPlugin(ctx)

  const staticFetch1 = await invokeFunction(ctx, { url: '/other' })

  expect(staticFetch1.headers?.['netlify-cache-tag']).toBe(
    '_N_T_/layout,_N_T_/other/layout,_N_T_/other/page,_N_T_/other',
  )
})

test<FixtureTestContext>('index should be normalized within the cacheHandler and have cache-tags', async (ctx) => {
  await createFixture('simple-next-app', ctx)
  await runPlugin(ctx)
  const index = await invokeFunction(ctx, { url: '/' })
  expect(index.statusCode).toBe(200)
  expect(index.headers?.['netlify-cache-tag']).toBe('_N_T_/layout,_N_T_/page,_N_T_/')
})

test<FixtureTestContext>('stale-while-revalidate headers should be normalized to include delta-seconds', async (ctx) => {
  await createFixture('simple-next-app', ctx)
  await runPlugin(ctx)
  const index = await invokeFunction(ctx, { url: '/' })
  expect(index.headers?.['netlify-cdn-cache-control']).toContain('stale-while-revalidate=31536000')
})

test<FixtureTestContext>('handlers receive correct site domain', async (ctx) => {
  await createFixture('simple-next-app', ctx)
  await runPlugin(ctx)
  const index = await invokeFunction(ctx, { url: '/api/url' })
  const data = JSON.parse(index.body)
  const url = new URL(data.url)
  expect(url.hostname).toBe('example.netlify')
})

// adapted from https://github.com/vercel/next.js/blob/bd605245aae4c8545bdd38a597b89ad78ca3d978/test/e2e/app-dir/actions/app-action.test.ts#L119-L127
test<FixtureTestContext>('handlers can add cookies in route handlers with the correct overrides', async (ctx) => {
  await createFixture('simple-next-app', ctx)
  await runPlugin(ctx)
  const index = await invokeFunction(ctx, { url: '/api/headers' })
  expect(index.headers['content-type']).toEqual('text/custom')
  const setCookieHeader = index.headers['set-cookie']
  expect(setCookieHeader).toContain('bar=bar2; Path=/')
  expect(setCookieHeader).toContain('baz=baz2; Path=/')
  expect(setCookieHeader).toContain('foo=foo1; Path=/')
  expect(setCookieHeader).toContain('test1=value1; Path=/; Secure')
  expect(setCookieHeader).toContain('test2=value2; Path=/handler; HttpOnly')
})
