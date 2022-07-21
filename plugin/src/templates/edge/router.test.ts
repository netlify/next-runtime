import { assert, assertEquals } from 'https://deno.land/std@0.148.0/testing/asserts.ts'
import { Header, Redirect, Rewrite } from './prepare-destination.ts'
import { applyHeaderRule, applyRedirectRule, applyRewriteRule, matchesRule } from './router.ts'

Deno.test('rewrites paths', () => {
  const rule = {
    source: '/catchall-query/:path*',
    destination: '/with-params/:path*?foo=:path*',
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
  }
  const request = new Request('http://n/old-blog/123')
  const result = matchesRule({ request, rule })
  assert(result)
  assertEquals(result.post, '123')
})

Deno.test('applies headers', () => {
  const rule: Header = {
    source: '/apply-header',
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
    headers: [
      {
        key: 'x-post',
        value: ':post',
      },
    ],
  }

  const request = new Request('http://n/blog/123')

  const result = applyHeaderRule({ request, rule })
  assert(result)
  assertEquals(result.headers.get('x-post'), '123')
})

Deno.test('applies header based on value of a cookie', () => {
  const rule: Header = {
    source: '/specific/:path*',
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

  const request = new Request('http://n/specific/123?page=home', {
    headers: new Headers({
      cookie: 'authorized=true',
    }),
  })

  const result = applyHeaderRule({ request, rule })
  console.log(result)
  assert(result)
  assertEquals(result.headers.get('x-authorized'), 'true')
})

Deno.test('applies "has" host rule', () => {
  const rule: Redirect = {
    source: '/has-redirect-6',
    has: [
      {
        type: 'host',
        value: '(?<subdomain>.*)-test.example.com',
      },
    ],
    destination: 'https://:subdomain.example.com/some-path/end?a=b',
    permanent: false,
  }

  const request = new Request('http://hello-test.example.com/has-redirect-6')

  const result = applyRedirectRule({ request, rule })
  assert(result)
  console.log(result)
  // assertEquals(result, 'something/else')
})
