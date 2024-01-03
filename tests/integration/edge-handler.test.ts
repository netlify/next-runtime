import { v4 } from 'uuid'
import { beforeEach, expect, test, vi } from 'vitest'
import {
  createFixture,
  invokeEdgeFunction,
  runPlugin,
  type FixtureTestContext,
} from '../utils/fixture.js'
import { generateRandomObjectID, startMockBlobStore } from '../utils/helpers.js'
import { LocalServer } from '../utils/local-server.js'

beforeEach<FixtureTestContext>(async (ctx) => {
  // set for each test a new deployID and siteID
  ctx.deployID = generateRandomObjectID()
  ctx.siteID = v4()
  vi.stubEnv('DEPLOY_ID', ctx.deployID)

  await startMockBlobStore(ctx)
})

test<FixtureTestContext>('should add request/response headers', async (ctx) => {
  await createFixture('middleware', ctx)
  await runPlugin(ctx)

  const origin = await LocalServer.run(async (req, res) => {
    expect(req.url).toBe('/test/next')
    expect(req.headers['x-hello-from-middleware-req']).toBe('hello')

    res.write('Hello from origin!')
    res.end()
  })

  ctx.cleanup?.push(() => origin.stop())

  const response1 = await invokeEdgeFunction(ctx, {
    functions: ['___netlify-edge-handler-middleware'],
    origin,
    url: '/test/next',
  })

  expect(await response1.text()).toBe('Hello from origin!')
  expect(response1.status).toBe(200)
  expect(response1.headers.get('x-hello-from-middleware-res'), 'added a response header').toEqual(
    'hello',
  )
  expect(origin.calls).toBe(1)
})

test<FixtureTestContext>('should return a redirect response', async (ctx) => {
  await createFixture('middleware', ctx)
  await runPlugin(ctx)

  const origin = new LocalServer()
  const response1 = await invokeEdgeFunction(ctx, {
    functions: ['___netlify-edge-handler-middleware'],
    origin,
    redirect: 'manual',
    url: '/test/redirect',
  })

  ctx.cleanup?.push(() => origin.stop())

  expect(response1.headers.get('location'), 'added a location header').toBeTypeOf('string')
  expect(
    new URL(response1.headers.get('location') as string).pathname,
    'redirected to the correct path',
  ).toEqual('/other')
  expect(origin.calls).toBe(0)
})

test<FixtureTestContext>('should rewrite to an external URL', async (ctx) => {
  await createFixture('middleware', ctx)
  await runPlugin(ctx)

  const external = await LocalServer.run(async (req, res) => {
    expect(req.url).toBe('/some-path')

    res.write('Hello from external host!')
    res.end()
  })
  ctx.cleanup?.push(() => external.stop())

  const origin = new LocalServer()
  ctx.cleanup?.push(() => origin.stop())

  const response1 = await invokeEdgeFunction(ctx, {
    functions: ['___netlify-edge-handler-middleware'],
    origin,
    url: `/test/rewrite-external?external-url=http://localhost:${external.port}/some-path`,
  })

  expect(await response1.text()).toBe('Hello from external host!')
  expect(response1.status).toBe(200)
  expect(external.calls).toBe(1)
  expect(origin.calls).toBe(0)
})
