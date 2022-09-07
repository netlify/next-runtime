import { assert, assertEquals, assertFalse } from 'https://deno.land/std@0.148.0/testing/asserts.ts'
import { Header, Redirect, Rewrite, RoutesManifest } from './next-utils.ts'
import {
  applyHeaderRule,
  applyHeaders,
  applyRedirectRule,
  applyRedirects,
  applyRewriteRule,
  applyRewrites,
  matchesRule,
  runPostMiddleware,
} from './router.ts'
import manifestImport from './test-routes-manifest.json' assert { type: 'json' }
const manifest = manifestImport as unknown as RoutesManifest
const staticRoutes = new Set([
  '/blog/data.json',
  '/static/hello.txt',
  '/_error',
  '/_app',
  '/auto-export/another',
  '/api/hello',
  '/hello-again',
  '/docs/v2/more/now-for-github',
  '/hello',
  '/nav',
  '/multi-rewrites',
  '/redirect-override',
  '/with-params',
  '/overridden',
  '/_document',
  '/404',
])

Deno.test('rewrites paths', () => {
  const rule = {
    source: '/catchall-query/:path*',
    destination: '/with-params/:path*?foo=:path*',
    regex: '/catchall-query(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))?(?:/)?$',
  }
  const result = applyRewriteRule({
    request: new Request('http://n/catchall-query/something/else'),
    rule,
  })
  assert(result)
  assertEquals(result.url, 'http://n/with-params/something/else?foo=something%2Felse')
})

Deno.test('rewrite matches headers "has" rule', () => {
  const rule: Rewrite = {
    source: '/has-rewrite-1',
    regex: '/has-rewrite-1(?:/)?$',
    has: [
      {
        type: 'header',
        key: 'x-my-header',
        value: '(?<myHeader>.*)',
      },
    ],
    destination: '/with-params?myHeader=:myHeader',
  }

  const request = new Request('http://n/has-rewrite-1', {
    headers: new Headers({
      'x-my-header': 'my-value',
    }),
  })

  const result = matchesRule({ request, rule })
  assert(result)
  assertEquals(result.myHeader, 'my-value')
})

Deno.test('matches named regex param', () => {
  const rule: Rewrite = {
    source: '/old-blog/:post(\\d{1,})',
    destination: '/blog/:post', // Matched parameters can be used in the destination
    regex: '/old-blog/(?<post>\\d{1,})(?:/)?$',
  }
  const request = new Request('http://localhost/old-blog/123')
  const result = matchesRule({ request, rule })
  assert(result)
  assertEquals(result.post, '123')
})

Deno.test('applies headers', () => {
  const rule: Header = {
    source: '/apply-header',
    regex: '/apply-header(?:/)?$',
    headers: [
      {
        key: 'x-my-header',
        value: 'my-value',
      },
    ],
  }

  const request = new Request('http://n/apply-header')

  const result = applyHeaderRule({ request, rule })
  assert(result)
  assertEquals(result.headers.get('x-my-header'), 'my-value')
})

Deno.test('applies dynamic headers', () => {
  const rule: Header = {
    source: '/blog/:slug',
    regex: '/blog/(?<slug>[^/]+?)(?:/)?$',
    headers: [
      {
        key: 'x-slug',
        value: ':slug', // Matched parameters can be used in the value
      },
      {
        key: 'x-slug-:slug', // Matched parameters can be used in the key
        value: 'my other custom header value',
      },
    ],
  }

  const request = new Request('http://n/blog/hello-world')

  const result = applyHeaderRule({ request, rule })
  assert(result)
  assertEquals(result.headers.get('x-slug'), 'hello-world')
  assertEquals(result.headers.get('x-slug-hello-world'), 'my other custom header value')
})

Deno.test('applies wildcard headers', () => {
  const rule: Header = {
    source: '/blog/:slug*',
    regex: '/blog(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))?(?:/)?$',
    headers: [
      {
        key: 'x-slug',
        value: ':slug*', // Matched parameters can be used in the value
      },
      {
        key: 'x-slug-:slug*', // Matched parameters can be used in the key
        value: 'my other custom header value',
      },
    ],
  }

  const request = new Request('http://n/blog/a/b/c/d/hello-world')

  const result = applyHeaderRule({ request, rule })
  assert(result)
  assertEquals(result.headers.get('x-slug'), 'a/b/c/d/hello-world')
  assertEquals(result.headers.get('x-slug-abcdhello-world'), 'my other custom header value')
})

Deno.test('applies regex headers', () => {
  const rule: Header = {
    source: '/blog/:post(\\d{1,})',
    regex: '/blog(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))?(?:/)?$',
    headers: [
      {
        key: 'x-post',
        value: ':post',
      },
    ],
  }

  const request = new Request('http://localhost/blog/123')

  const result = applyHeaderRule({ request, rule })
  assert(result)
  assertEquals(result.headers.get('x-post'), '123')
})

Deno.test('applies header based on value of a cookie', () => {
  const rule: Header = {
    source: '/specific/:path*',
    regex: '/specific(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))?(?:/)?$',
    has: [
      {
        type: 'query',
        key: 'page',
        // the page value will not be available in the
        // header key/values since value is provided and
        // doesn't use a named capture group e.g. (?<page>home)
        value: 'home',
      },
      {
        type: 'cookie',
        key: 'authorized',
        value: '(?<authorized>yes|true)',
      },
    ],
    headers: [
      {
        key: 'x-authorized',
        value: ':authorized',
      },
    ],
  }

  const request = new Request('http://localhost/specific/123?page=home', {
    headers: new Headers({
      cookie: 'authorized=true',
    }),
  })

  const result = applyHeaderRule({ request, rule })
  assert(result)
  assertEquals(result.headers.get('x-authorized'), 'true')
})

Deno.test('applies "has" host rule', () => {
  const rule: Redirect = {
    source: '/has-redirect-6',
    regex: '/has-redirect-6(?:/)?$',
    has: [
      {
        type: 'host',
        value: '(?<subdomain>.*)-test.example.com',
      },
    ],
    destination: 'https://:subdomain.example.com/some-path/end?a=:subdomain',
    permanent: false,
  }

  const request = new Request('http://hello-test.example.com/has-redirect-6')

  const result = applyRedirectRule({ request, rule })
  assert(result)
  assertEquals(result.headers.get('location'), 'https://hello.example.com/some-path/end?a=hello')
})

Deno.test('headers', async (t) => {
  await t.step('has headers rule', () => {
    const result = applyHeaders(
      new Request('http://localhost/has-header-1', {
        headers: {
          'x-my-header': 'hello world!!',
        },
      }),
      manifest.headers as Header[],
    )
    assert(result)
    assertEquals(result.headers.get('x-another'), 'header')

    const result2 = applyHeaders(new Request('http://localhost/has-header-1'), manifest.headers as Header[])
    assert(result2)
    assertFalse(result2.headers.get('x-another'))
  })

  await t.step('has query rule', () => {
    const result = applyHeaders(
      new Request('http://localhost/has-header-2?my-query=hellooo'),
      manifest.headers as Header[],
    )
    assert(result)
    assertEquals(result.headers.get('x-added'), 'value')

    const result2 = applyHeaders(new Request('http://localhost/has-header-2'), manifest.headers as Header[])
    assert(result2)
    assertFalse(result2.headers.get('x-added'))
  })

  await t.step('has cookie rule', () => {
    const result = applyHeaders(
      new Request('http://localhost/has-header-3', {
        headers: {
          cookie: 'loggedIn=true',
        },
      }),
      manifest.headers as Header[],
    )
    assert(result)
    assertEquals(result.headers.get('x-is-user'), 'yuuuup')

    const result2 = applyHeaders(new Request('http://localhost/has-header-3'), manifest.headers as Header[])
    assert(result2)
    assertFalse(result2.headers.get('x-is-user'))
  })

  await t.step('has host rule', () => {
    const result = applyHeaders(new Request('http://example.com/has-header-4'), manifest.headers as Header[])
    assert(result)
    assertEquals(result.headers.get('x-is-host'), 'yuuuup')

    const result2 = applyHeaders(new Request('http://localhost/has-header-4'), manifest.headers as Header[])
    assert(result2)
    assertFalse(result2.headers.get('x-is-host'))
  })
})
Deno.test('redirects', async (t) => {
  await t.step('chained redirects', () => {
    const result = applyRedirects(new Request('http://localhost/redir-chain1'), manifest.redirects as Redirect[])
    assert(result)
    assertEquals(result.headers.get('location'), 'http://localhost/redir-chain2')
    assertEquals(result.status, 301)

    const result2 = applyRedirects(new Request('http://localhost/redir-chain2'), manifest.redirects as Redirect[])
    assert(result2)
    assertEquals(result2.headers.get('location'), 'http://localhost/redir-chain3')
    assertEquals(result2.status, 302)

    const result3 = applyRedirects(new Request('http://localhost/redir-chain3'), manifest.redirects as Redirect[])
    assert(result3)
    assertEquals(result3.headers.get('location'), 'http://localhost/')
    assertEquals(result3.status, 303)
  })

  await t.step('does not match _next', () => {
    const result = applyRedirects(
      new Request('http://localhost/_next/has-redirect-5', {
        headers: {
          'x-test-next': 'true',
        },
      }),
      manifest.redirects as Redirect[],
    )
    assertFalse(result)

    const result2 = applyRedirects(
      new Request('http://localhost/another/has-redirect-5', {
        headers: {
          'x-test-next': 'true',
        },
      }),
      manifest.redirects as Redirect[],
    )

    assert(result2)
    assertEquals(result2.status, 307)
  })

  await t.step('with permanent: false', () => {
    const result = applyRedirects(new Request('http://localhost/redirect1'), manifest.redirects as Redirect[])
    assert(result)
    assertEquals(result.headers.get('location'), 'http://localhost/')
    assertEquals(result.status, 307)
  })

  await t.step('with params', () => {
    const result = applyRedirects(new Request('http://localhost/hello/123/another'), manifest.redirects as Redirect[])
    assert(result)
    assertEquals(result.headers.get('location'), 'http://localhost/blog/123')
    assertEquals(result.status, 307)
  })

  await t.step('to a URL with a hash', () => {
    const result = applyRedirects(
      new Request('http://localhost/docs/router-status/500'),
      manifest.redirects as Redirect[],
    )
    assert(result)
    const location = result.headers.get('location')
    assert(location)
    const { pathname, hash } = new URL(location)
    assertEquals(pathname, '/docs/v2/network/status-codes')
    assertEquals(hash, '#500')
    assertEquals(result.status, 301)
  })

  await t.step('with provided statusCode', () => {
    const result = applyRedirects(new Request('http://localhost/redirect2'), manifest.redirects as Redirect[])
    assert(result)
    const location = result.headers.get('location')
    assert(location)
    const { pathname, search } = new URL(location)
    assertEquals(pathname, '/')
    assertEquals(search, '')
    assertEquals(result.status, 301)
  })

  await t.step('using a catchall', () => {
    const result = applyRedirects(
      new Request('http://localhost/catchall-redirect/hello/world'),
      manifest.redirects as Redirect[],
    )
    assert(result)
    const location = result.headers.get('location')
    assert(location)
    const { pathname, search } = new URL(location)
    assertEquals(pathname, '/somewhere')
    assertEquals(search, '')
    assertEquals(result.status, 307)
  })
})

Deno.test('rewrites', async (t) => {
  await t.step('afterFiles rewrite', () => {
    const result = applyRewrites({
      request: new Request('http://localhost/to-another'),
      rules: manifest.rewrites.afterFiles as Rewrite[],
      checkStaticRoutes: true,
      staticRoutes,
    })
    assert(result)
    assertEquals(result.url, 'http://localhost/another/one')
  })
  await t.step('afterFiles with params', () => {
    const result = applyRewrites({
      request: new Request('http://localhost/test/hello'),
      rules: manifest.rewrites.afterFiles as Rewrite[],
      checkStaticRoutes: true,
      staticRoutes,
    })
    assert(result)
    assertEquals(result.url, 'http://localhost/hello')
  })

  await t.step('afterFiles matching static file', () => {
    const result = applyRewrites({
      request: new Request('http://localhost/hello-world'),
      rules: manifest.rewrites.afterFiles as Rewrite[],
      checkStaticRoutes: true,
      staticRoutes,
    })
    assert(result)
    assertEquals(result.headers.get('x-matched-path'), '/static/hello.txt')
    assertEquals(result.url, 'http://localhost/static/hello.txt')
  })

  await t.step('afterFiles matching dynamic route', () => {
    const result = applyRewrites({
      request: new Request('http://localhost/test/nothing'),
      rules: manifest.rewrites.afterFiles as Rewrite[],
      checkStaticRoutes: true,
      staticRoutes,
    })
    assert(result)
    assertFalse(result.headers.get('x-matched-path'))
    assertEquals(result.url, 'http://localhost/nothing')
  })

  await t.step('non-matching', () => {
    const result = applyRewrites({
      request: new Request('http://localhost/no-match'),
      rules: manifest.rewrites.afterFiles as Rewrite[],
      checkStaticRoutes: true,
      staticRoutes,
    })
    assertFalse(result)
  })

  await t.step('preserves query params', () => {
    const result = applyRewrites({
      request: new Request('http://localhost/proxy-me/first?keep=me&and=me'),
      rules: manifest.rewrites.afterFiles as Rewrite[],
      checkStaticRoutes: true,
      staticRoutes,
    })
    assert(result)
    assertEquals(result.url, 'http://external.example.com/first?keep=me&and=me&this=me')
  })
})

Deno.test('router', async (t) => {
  await t.step('static route overrides afterFiles rewrite', () => {
    const result = runPostMiddleware(new Request('http://localhost/nav'), manifest, staticRoutes)
    assert(result)
    assertEquals(result.url, 'http://localhost/nav')
  })

  await t.step('proxy to external resource', () => {
    const result = runPostMiddleware(
      new Request('http://localhost/proxy-me/first?keep=me&and=me'),
      manifest,
      staticRoutes,
    )
    assert(result)
    assertEquals(result.url, 'http://external.example.com/first?keep=me&and=me&this=me')
  })
})
