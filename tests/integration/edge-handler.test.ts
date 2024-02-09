import { v4 } from 'uuid'
import { beforeEach, describe, expect, test, vi } from 'vitest'
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

  const response = await invokeEdgeFunction(ctx, {
    functions: ['___netlify-edge-handler-middleware'],
    origin,
    url: '/test/next',
  })

  expect(await response.text()).toBe('Hello from origin!')
  expect(response.status).toBe(200)
  expect(response.headers.get('x-hello-from-middleware-res'), 'added a response header').toEqual(
    'hello',
  )
  expect(origin.calls).toBe(1)
})

test<FixtureTestContext>('should add request/response headers when using src dir', async (ctx) => {
  await createFixture('middleware-src', ctx)
  await runPlugin(ctx)

  const origin = await LocalServer.run(async (req, res) => {
    expect(req.url).toBe('/test/next')
    expect(req.headers['x-hello-from-middleware-req']).toBe('hello')

    res.write('Hello from origin!')
    res.end()
  })

  ctx.cleanup?.push(() => origin.stop())

  const response = await invokeEdgeFunction(ctx, {
    functions: ['___netlify-edge-handler-src-middleware'],
    origin,
    url: '/test/next',
  })

  expect(await response.text()).toBe('Hello from origin!')
  expect(response.status).toBe(200)
  expect(response.headers.get('x-hello-from-middleware-res'), 'added a response header').toEqual(
    'hello',
  )
  expect(origin.calls).toBe(1)
})

describe('redirect', () => {
  test<FixtureTestContext>('should return a redirect response', async (ctx) => {
    await createFixture('middleware', ctx)
    await runPlugin(ctx)

    const origin = new LocalServer()
    const response = await invokeEdgeFunction(ctx, {
      functions: ['___netlify-edge-handler-middleware'],
      origin,
      redirect: 'manual',
      url: '/test/redirect',
    })

    ctx.cleanup?.push(() => origin.stop())

    expect(response.status).toBe(307)
    expect(response.headers.get('location'), 'added a location header').toBeTypeOf('string')
    expect(
      new URL(response.headers.get('location') as string).pathname,
      'redirected to the correct path',
    ).toEqual('/other')
    expect(origin.calls).toBe(0)
  })

  test<FixtureTestContext>('should return a redirect response with additional headers', async (ctx) => {
    await createFixture('middleware', ctx)
    await runPlugin(ctx)

    const origin = new LocalServer()
    const response = await invokeEdgeFunction(ctx, {
      functions: ['___netlify-edge-handler-middleware'],
      origin,
      redirect: 'manual',
      url: '/test/redirect-with-headers',
    })

    ctx.cleanup?.push(() => origin.stop())

    expect(response.status).toBe(307)
    expect(response.headers.get('location'), 'added a location header').toBeTypeOf('string')
    expect(
      new URL(response.headers.get('location') as string).pathname,
      'redirected to the correct path',
    ).toEqual('/other')
    expect(response.headers.get('x-header-from-redirect'), 'hello').toBe('hello')
    expect(origin.calls).toBe(0)
  })
})

describe('rewrite', () => {
  test<FixtureTestContext>('should rewrite to an external URL', async (ctx) => {
    await createFixture('middleware', ctx)
    await runPlugin(ctx)

    const external = await LocalServer.run(async (req, res) => {
      const url = new URL(req.url ?? '', 'http://localhost')

      expect(url.pathname).toBe('/some-path')
      expect(url.searchParams.get('from')).toBe('middleware')

      res.write('Hello from external host!')
      res.end()
    })
    ctx.cleanup?.push(() => external.stop())

    const origin = new LocalServer()
    ctx.cleanup?.push(() => origin.stop())

    const response = await invokeEdgeFunction(ctx, {
      functions: ['___netlify-edge-handler-middleware'],
      origin,
      url: `/test/rewrite-external?external-url=http://localhost:${external.port}/some-path`,
    })

    expect(await response.text()).toBe('Hello from external host!')
    expect(response.status).toBe(200)
    expect(external.calls).toBe(1)
    expect(origin.calls).toBe(0)
  })

  test<FixtureTestContext>('rewriting to external URL that redirects should return said redirect', async (ctx) => {
    await createFixture('middleware', ctx)
    await runPlugin(ctx)

    const external = await LocalServer.run(async (req, res) => {
      res.writeHead(302, {
        location: 'http://example.com/redirected',
      })
      res.end()
    })
    ctx.cleanup?.push(() => external.stop())

    const origin = new LocalServer()
    ctx.cleanup?.push(() => origin.stop())

    const response = await invokeEdgeFunction(ctx, {
      functions: ['___netlify-edge-handler-middleware'],
      origin,
      url: `/test/rewrite-external?external-url=http://localhost:${external.port}/some-path`,
      redirect: 'manual',
    })

    expect(await response.text()).toBe('')

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('http://example.com/redirected')
  })
})

describe("aborts middleware execution when the matcher conditions don't match the request", () => {
  test<FixtureTestContext>('when the path is excluded', async (ctx) => {
    await createFixture('middleware', ctx)
    await runPlugin(ctx)

    const origin = await LocalServer.run(async (req, res) => {
      expect(req.url).toBe('/_next/data')
      expect(req.headers['x-hello-from-middleware-req']).toBeUndefined()

      res.write('Hello from origin!')
      res.end()
    })

    ctx.cleanup?.push(() => origin.stop())

    const response = await invokeEdgeFunction(ctx, {
      functions: ['___netlify-edge-handler-middleware'],
      origin,
      url: '/_next/data',
    })

    expect(await response.text()).toBe('Hello from origin!')
    expect(response.status).toBe(200)
    expect(response.headers.has('x-hello-from-middleware-res')).toBeFalsy()
    expect(origin.calls).toBe(1)
  })

  test<FixtureTestContext>('when a request header matches a condition', async (ctx) => {
    await createFixture('middleware-conditions', ctx)
    await runPlugin(ctx)

    const origin = await LocalServer.run(async (req, res) => {
      expect(req.url).toBe('/foo')
      expect(req.headers['x-hello-from-middleware-req']).toBeUndefined()

      res.write('Hello from origin!')
      res.end()
    })

    ctx.cleanup?.push(() => origin.stop())

    // Request 1: Middleware should run because we're not sending the header.
    const response1 = await invokeEdgeFunction(ctx, {
      functions: ['___netlify-edge-handler-middleware'],
      origin,
      url: '/foo',
    })

    expect(await response1.text()).toBe('Hello from origin!')
    expect(response1.status).toBe(200)
    expect(response1.headers.has('x-hello-from-middleware-res')).toBeTruthy()
    expect(origin.calls).toBe(1)

    // Request 2: Middleware should not run because we're sending the header.
    const response2 = await invokeEdgeFunction(ctx, {
      headers: {
        'x-custom-header': 'custom-value',
      },
      functions: ['___netlify-edge-handler-middleware'],
      origin,
      url: '/foo',
    })

    expect(await response2.text()).toBe('Hello from origin!')
    expect(response2.status).toBe(200)
    expect(response2.headers.has('x-hello-from-middleware-res')).toBeFalsy()
    expect(origin.calls).toBe(2)
  })
})

describe('should run middleware on data requests', () => {
  test<FixtureTestContext>('when `trailingSlash: false`', async (ctx) => {
    await createFixture('middleware', ctx)
    await runPlugin(ctx)

    const origin = new LocalServer()
    const response = await invokeEdgeFunction(ctx, {
      functions: ['___netlify-edge-handler-middleware'],
      origin,
      redirect: 'manual',
      url: '/_next/data/dJvEyLV8MW7CBLFf0Ecbk/test/redirect-with-headers.json',
    })

    ctx.cleanup?.push(() => origin.stop())

    expect(response.status).toBe(307)
    expect(response.headers.get('location'), 'added a location header').toBeTypeOf('string')
    expect(
      new URL(response.headers.get('location') as string).pathname,
      'redirected to the correct path',
    ).toEqual('/other')
    expect(response.headers.get('x-header-from-redirect'), 'hello').toBe('hello')
    expect(origin.calls).toBe(0)
  })

  test<FixtureTestContext>('when `trailingSlash: true`', async (ctx) => {
    await createFixture('middleware-trailing-slash', ctx)
    await runPlugin(ctx)

    const origin = new LocalServer()
    const response = await invokeEdgeFunction(ctx, {
      functions: ['___netlify-edge-handler-middleware'],
      origin,
      redirect: 'manual',
      url: '/_next/data/dJvEyLV8MW7CBLFf0Ecbk/test/redirect-with-headers.json',
    })

    ctx.cleanup?.push(() => origin.stop())

    expect(response.status).toBe(307)
    expect(response.headers.get('location'), 'added a location header').toBeTypeOf('string')
    expect(
      new URL(response.headers.get('location') as string).pathname,
      'redirected to the correct path',
    ).toEqual('/other')
    expect(response.headers.get('x-header-from-redirect'), 'hello').toBe('hello')
    expect(origin.calls).toBe(0)
  })
})

describe('page router', () => {
  test<FixtureTestContext>('should rewrite data requests', async (ctx) => {
    await createFixture('middleware-pages', ctx)
    await runPlugin(ctx)
    const origin = await LocalServer.run(async (req, res) => {
      res.write(
        JSON.stringify({
          url: req.url,
          headers: req.headers,
        }),
      )
      res.end()
    })
    ctx.cleanup?.push(() => origin.stop())
    const response = await invokeEdgeFunction(ctx, {
      functions: ['___netlify-edge-handler-middleware'],
      headers: {
        'x-nextjs-data': '1',
      },
      origin,
      url: `/_next/data/build-id/ssr-page.json`,
    })
    const res = await response.json()
    const url = new URL(res.url, 'http://n/')
    expect(url.pathname).toBe('/_next/data/build-id/ssr-page-2.json')
    expect(response.headers.get('x-nextjs-rewrite')).toBe('/ssr-page-2/')
    expect(response.status).toBe(200)
  })
})
