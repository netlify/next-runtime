import { check, fetchViaHTTP, getBrowserBodyText, renderViaHTTP, waitFor } from 'next-test-utils'
import { load } from 'cheerio'
import webdriver from 'next-webdriver'
const nextUrl = process.env.SITE_URL || 'http://localhost:8888'
import url from 'url'

let buildId = 'build-id'

describe('Custom routes', () => {
  it('should not rewrite for _next/data route when a match is found', async () => {
    const initial = await fetchViaHTTP(nextUrl, '/overridden/first')
    expect(initial.status).toBe(200)
    expect(await initial.text()).toContain('this page is overridden')

    const nextData = await fetchViaHTTP(nextUrl, `/_next/data/${buildId}/overridden/first.json`)
    expect(nextData.status).toBe(200)
    expect(await nextData.json()).toEqual({
      pageProps: { params: { slug: 'first' } },
      __N_SSG: true,
    })
  })

  it('should handle has query encoding correctly', async () => {
    for (const expected of [
      {
        post: 'first',
        slug: ['first'],
        status: 200,
      },
      {
        post: 'hello%20world',
        slug: ['hello world'],
      },
      {
        post: 'hello/world',
        slug: ['hello', 'world'],
      },
      {
        post: 'hello%2fworld',
        slug: ['hello', 'world'],
      },
    ]) {
      const { status = 200, post } = expected
      const res = await fetchViaHTTP(nextUrl, '/has-rewrite-8', `?post=${post}`, {
        redirect: 'manual',
      })

      expect(res.status).toBe(status)

      if (status === 200) {
        const $ = load(await res.text())
        expect(JSON.parse($('#props').text())).toEqual({
          params: {
            slug: expected.slug,
          },
        })
      }
    }
  })

  it('should handle external beforeFiles rewrite correctly', async () => {
    const res = await fetchViaHTTP(nextUrl, '/overridden')
    const html = await res.text()

    if (res.status !== 200) {
      console.error('Invalid response', html)
    }
    expect(res.status).toBe(200)
    expect(html).toContain('Example Domain')

    const browser = await webdriver(nextUrl, '/nav')
    await browser.elementByCss('#to-before-files-overridden').click()
    await check(() => browser.eval('document.documentElement.innerHTML'), /Example Domain/)
  })

  it('should handle beforeFiles rewrite to dynamic route correctly', async () => {
    const res = await fetchViaHTTP(nextUrl, '/nfl')
    const html = await res.text()

    if (res.status !== 200) {
      console.error('Invalid response', html)
    }
    expect(res.status).toBe(200)
    expect(html).toContain('/_sport/[slug]')

    const browser = await webdriver(nextUrl, '/nav')
    await browser.eval('window.beforeNav = 1')
    await browser.elementByCss('#to-before-files-dynamic').click()
    await check(() => browser.eval('document.documentElement.innerHTML'), /_sport\/\[slug\]/)
    expect(JSON.parse(await browser.elementByCss('#query').text())).toEqual({
      slug: 'nfl',
    })
    expect(await browser.elementByCss('#pathname').text()).toBe('/_sport/[slug]')
    expect(await browser.eval('window.beforeNav')).toBe(1)
  })

  it('should handle beforeFiles rewrite to partly dynamic route correctly', async () => {
    const res = await fetchViaHTTP(nextUrl, '/nfl')
    const html = await res.text()

    if (res.status !== 200) {
      console.error('Invalid response', html)
    }
    expect(res.status).toBe(200)
    expect(html).toContain('/_sport/[slug]')

    const browser = await webdriver(nextUrl, '/nav')
    await browser.eval('window.beforeNav = 1')
    await browser.elementByCss('#to-before-files-dynamic-again').click()
    await check(() => browser.eval('document.documentElement.innerHTML'), /_sport\/\[slug\]\/test/)
    expect(JSON.parse(await browser.elementByCss('#query').text())).toEqual({
      slug: 'nfl',
    })
    expect(await browser.elementByCss('#pathname').text()).toBe('/_sport/[slug]/test')
    expect(await browser.eval('window.beforeNav')).toBe(1)
  })

  it('should support long URLs for rewrites', async () => {
    const res = await fetchViaHTTP(
      nextUrl,
      '/catchall-rewrite/a9btBxtHQALZ6cxfuj18X6OLGNSkJVzrOXz41HG4QwciZfn7ggRZzPx21dWqGiTBAqFRiWvVNm5ko2lpyso5jtVaXg88dC1jKfqI2qmIcdeyJat8xamrIh2LWnrYRrsBcoKfQU65KHod8DPANuzPS3fkVYWlmov05GQbc82HwR1exOvPVKUKb5gBRWiN0WOh7hN4QyezIuq3dJINAptFQ6m2bNGjYACBRk4MOSHdcQG58oq5Ch7luuqrl9EcbWSa',
    )

    const html = await res.text()
    expect(res.status).toBe(200)
    expect(html).toContain('/with-params')
  })

  it('should resolveHref correctly navigating through history', async () => {
    const browser = await webdriver(nextUrl, '/')
    await browser.eval('window.beforeNav = 1')

    expect(await browser.eval('document.documentElement.innerHTML')).toContain('multi-rewrites')

    await browser.eval('next.router.push("/rewriting-to-auto-export")')
    await browser.waitForElementByCss('#auto-export')

    expect(JSON.parse(await browser.elementByCss('#query').text())).toEqual({
      slug: 'hello',
      rewrite: '1',
    })
    expect(await browser.eval('window.beforeNav')).toBe(1)

    await browser.eval('next.router.push("/nav")')
    await browser.waitForElementByCss('#nav')

    expect(await browser.elementByCss('#nav').text()).toBe('Nav')

    await browser.back()
    await browser.waitForElementByCss('#auto-export')

    expect(JSON.parse(await browser.elementByCss('#query').text())).toEqual({
      slug: 'hello',
      rewrite: '1',
    })
    expect(await browser.eval('window.beforeNav')).toBe(1)
  })

  it('should continue in beforeFiles rewrites', async () => {
    const res = await fetchViaHTTP(nextUrl, '/old-blog/about')
    expect(res.status).toBe(200)

    const html = await res.text()
    const $ = load(html)

    expect($('#hello').text()).toContain('Hello')

    const browser = await webdriver(nextUrl, '/nav')

    await browser.eval('window.beforeNav = 1')
    await browser.elementByCss('#to-old-blog').click().waitForElementByCss('#hello')
    expect(await browser.elementByCss('#hello').text()).toContain('Hello')
  })

  it('should not hang when proxy rewrite fails', async () => {
    const res = await fetchViaHTTP(nextUrl, '/to-nowhere')

    expect(res.status).toBe(500)
  })

  it('should parse params correctly for rewrite to auto-export dynamic page', async () => {
    const browser = await webdriver(nextUrl, '/rewriting-to-auto-export')
    await check(() => browser.eval(() => document.documentElement.innerHTML), /auto-export.*?hello/)
    expect(JSON.parse(await browser.elementByCss('#query').text())).toEqual({
      rewrite: '1',
      slug: 'hello',
    })
  })

  it('should provide params correctly for rewrite to auto-export non-dynamic page', async () => {
    const browser = await webdriver(nextUrl, '/rewriting-to-another-auto-export/first')

    expect(await browser.elementByCss('#auto-export-another').text()).toBe('auto-export another')
    expect(JSON.parse(await browser.elementByCss('#query').text())).toEqual({
      rewrite: '1',
      path: ['first'],
    })
  })

  it('should handle one-to-one rewrite successfully', async () => {
    const html = await renderViaHTTP(nextUrl, '/first')
    expect(html).toMatch(/hello/)
  })

  it('should handle chained rewrites successfully', async () => {
    const html = await renderViaHTTP(nextUrl, '/')
    expect(html).toMatch(/multi-rewrites/)
  })

  it('should handle param like headers properly', async () => {
    const res = await fetchViaHTTP(nextUrl, '/my-other-header/my-path')
    expect(res.headers.get('x-path')).toBe('my-path')
    expect(res.headers.get('somemy-path')).toBe('hi')
    expect(res.headers.get('x-test')).toBe('some:value*')
    expect(res.headers.get('x-test-2')).toBe('value*')
    expect(res.headers.get('x-test-3')).toBe(':value?')
    expect(res.headers.get('x-test-4')).toBe(':value+')
    expect(res.headers.get('x-test-5')).toBe('something https:')
    expect(res.headers.get('x-test-6')).toBe(':hello(world)')
    expect(res.headers.get('x-test-7')).toBe('hello(world)')
    expect(res.headers.get('x-test-8')).toBe('hello{1,}')
    expect(res.headers.get('x-test-9')).toBe(':hello{1,2}')
    expect(res.headers.get('content-security-policy')).toBe(
      "default-src 'self'; img-src *; media-src media1.com media2.com; script-src userscripts.example.com/my-path",
    )
  })

  it('should not match dynamic route immediately after applying header', async () => {
    const res = await fetchViaHTTP(nextUrl, '/blog/post-321')
    expect(res.headers.get('x-something')).toBe('applied-everywhere')

    const $ = load(await res.text())
    expect(JSON.parse($('p').text()).path).toBe('blog')
  })

  it('should handle chained redirects successfully', async () => {
    const res1 = await fetchViaHTTP(nextUrl, '/redir-chain1', undefined, {
      redirect: 'manual',
    })
    const res1location = url.parse(res1.headers.get('location')).pathname
    expect(res1.status).toBe(301)
    expect(res1location).toBe('/redir-chain2')

    const res2 = await fetchViaHTTP(nextUrl, res1location, undefined, {
      redirect: 'manual',
    })
    const res2location = url.parse(res2.headers.get('location')).pathname
    expect(res2.status).toBe(302)
    expect(res2location).toBe('/redir-chain3')

    const res3 = await fetchViaHTTP(nextUrl, res2location, undefined, {
      redirect: 'manual',
    })
    const res3location = url.parse(res3.headers.get('location')).pathname
    expect(res3.status).toBe(303)
    expect(res3location).toBe('/')
  })

  it('should not match redirect for /_next', async () => {
    const res = await fetchViaHTTP(nextUrl, '/_next/has-redirect-5', undefined, {
      headers: {
        'x-test-next': 'true',
      },
      redirect: 'manual',
    })
    expect(res.status).toBe(404)

    const res2 = await fetchViaHTTP(nextUrl, '/another/has-redirect-5', undefined, {
      headers: {
        'x-test-next': 'true',
      },
      redirect: 'manual',
    })
    expect(res2.status).toBe(307)
  })

  it('should redirect successfully with permanent: false', async () => {
    const res = await fetchViaHTTP(nextUrl, '/redirect1', undefined, {
      redirect: 'manual',
    })
    const { pathname } = url.parse(res.headers.get('location'))
    expect(res.status).toBe(307)
    expect(pathname).toBe('/')
  })

  it('should redirect with params successfully', async () => {
    const res = await fetchViaHTTP(nextUrl, '/hello/123/another', undefined, {
      redirect: 'manual',
    })
    const { pathname } = url.parse(res.headers.get('location'))
    expect(res.status).toBe(307)
    expect(pathname).toBe('/blog/123')
  })

  it('should redirect with hash successfully', async () => {
    const res = await fetchViaHTTP(nextUrl, '/docs/router-status/500', undefined, {
      redirect: 'manual',
    })
    const { pathname, hash, query } = url.parse(res.headers.get('location'), true)
    expect(res.status).toBe(301)
    expect(pathname).toBe('/docs/v2/network/status-codes')
    expect(hash).toBe('#500')
    expect(query).toEqual({})
  })

  it('should redirect successfully with provided statusCode', async () => {
    const res = await fetchViaHTTP(nextUrl, '/redirect2', undefined, {
      redirect: 'manual',
    })
    const { pathname, query } = url.parse(res.headers.get('location'), true)
    expect(res.status).toBe(301)
    expect(pathname).toBe('/')
    expect(query).toEqual({})
  })

  it('should redirect successfully with catchall', async () => {
    const res = await fetchViaHTTP(nextUrl, '/catchall-redirect/hello/world', undefined, {
      redirect: 'manual',
    })
    const { pathname, query } = url.parse(res.headers.get('location'), true)
    expect(res.status).toBe(307)
    expect(pathname).toBe('/somewhere')
    expect(query).toEqual({})
  })

  it('should server static files through a rewrite', async () => {
    const text = await renderViaHTTP(nextUrl, '/hello-world')
    expect(text).toBe('hello world!')
  })

  it('should rewrite with params successfully', async () => {
    const html = await renderViaHTTP(nextUrl, '/test/hello')
    expect(html).toMatch(/Hello/)
  })

  it('should not append params when one is used in destination path', async () => {
    const html = await renderViaHTTP(nextUrl, '/test/with-params?a=b')
    const $ = load(html)
    expect(JSON.parse($('p').text())).toEqual({ a: 'b' })
  })

  it('should double redirect successfully', async () => {
    const html = await renderViaHTTP(nextUrl, '/docs/github')
    expect(html).toMatch(/hi there/)
  })

  it('should allow params in query for rewrite', async () => {
    const html = await renderViaHTTP(nextUrl, '/query-rewrite/hello/world?a=b')
    const $ = load(html)
    expect(JSON.parse($('#__NEXT_DATA__').html()).query).toEqual({
      first: 'hello',
      second: 'world',
      a: 'b',
      section: 'hello',
      name: 'world',
    })
  })

  it('should have correct params for catchall rewrite', async () => {
    const html = await renderViaHTTP(nextUrl, '/catchall-rewrite/hello/world?a=b')
    const $ = load(html)
    expect(JSON.parse($('#__NEXT_DATA__').html()).query).toEqual({
      a: 'b',
      path: ['hello', 'world'],
    })
  })

  it('should have correct encoding for params with catchall rewrite', async () => {
    const html = await renderViaHTTP(nextUrl, '/catchall-rewrite/hello%20world%3Fw%3D24%26focalpoint%3Dcenter?a=b')
    const $ = load(html)
    expect(JSON.parse($('#__NEXT_DATA__').html()).query).toEqual({
      a: 'b',
      path: ['hello%20world%3Fw%3D24%26focalpoint%3Dcenter'],
    })
  })

  it('should have correct query for catchall rewrite', async () => {
    const html = await renderViaHTTP(nextUrl, '/catchall-query/hello/world?a=b')
    const $ = load(html)
    expect(JSON.parse($('#__NEXT_DATA__').html()).query).toEqual({
      a: 'b',
      another: 'hello/world',
      path: ['hello', 'world'],
    })
  })

  it('should have correct header for catchall rewrite', async () => {
    const res = await fetchViaHTTP(nextUrl, '/catchall-header/hello/world?a=b')
    const headerValue = res.headers.get('x-value')
    expect(headerValue).toBe('hello/world')
  })

  it('should allow params in query for redirect', async () => {
    const res = await fetchViaHTTP(nextUrl, '/query-redirect/hello/world?a=b', undefined, {
      redirect: 'manual',
    })
    const { pathname, query } = url.parse(res.headers.get('location'), true)
    expect(res.status).toBe(307)
    expect(pathname).toBe('/with-params')
    expect(query).toEqual({
      first: 'hello',
      second: 'world',
      a: 'b',
    })
  })

  it('should have correctly encoded params in query for redirect', async () => {
    const res = await fetchViaHTTP(
      nextUrl,
      '/query-redirect/hello%20world%3Fw%3D24%26focalpoint%3Dcenter/world?a=b',
      undefined,
      {
        redirect: 'manual',
      },
    )
    const { pathname, query } = url.parse(res.headers.get('location'), true)
    expect(res.status).toBe(307)
    expect(pathname).toBe('/with-params')
    expect(query).toEqual({
      // this should be decoded since url.parse decodes query values
      first: 'hello world?w=24&focalpoint=center',
      second: 'world',
      a: 'b',
    })
  })

  it('should overwrite param values correctly', async () => {
    const html = await renderViaHTTP(nextUrl, '/test-overwrite/first/second')
    expect(html).toMatch(/this-should-be-the-value/)
    expect(html).not.toMatch(/first/)
    expect(html).toMatch(/second/)
  })

  it('should handle query for rewrite correctly', async () => {
    // query merge order lowest priority to highest
    // 1. initial URL query values
    // 2. path segment values
    // 3. destination specified query values

    const html = await renderViaHTTP(
      nextUrl,
      '/query-rewrite/first/second?section=overridden&name=overridden&first=overridden&second=overridden&keep=me',
    )

    const data = JSON.parse(load(html)('p').text())
    expect(data).toEqual({
      first: 'first',
      second: 'second',
      section: 'first',
      name: 'second',
      keep: 'me',
    })
  })

  // current routes order do not allow rewrites to override page
  // but allow redirects to
  it('should not allow rewrite to override page file', async () => {
    const html = await renderViaHTTP(nextUrl, '/nav')
    expect(html).toContain('to-hello')
  })

  it('show allow redirect to override the page', async () => {
    const res = await fetchViaHTTP(nextUrl, '/redirect-override', undefined, {
      redirect: 'manual',
    })
    const { pathname } = url.parse(res.headers.get('location') || '')
    expect(res.status).toBe(307)
    expect(pathname).toBe('/thank-you-next')
  })

  it('should work successfully on the client', async () => {
    const browser = await webdriver(nextUrl, '/nav')
    await browser.elementByCss('#to-hello').click()
    await browser.waitForElementByCss('#hello')

    expect(await browser.eval('window.location.href')).toMatch(/\/first$/)
    expect(await getBrowserBodyText(browser)).toMatch(/Hello/)

    await browser.eval('window.location.href = window.location.href')
    await waitFor(500)
    expect(await browser.eval('window.location.href')).toMatch(/\/first$/)
    expect(await getBrowserBodyText(browser)).toMatch(/Hello/)

    await browser.elementByCss('#to-nav').click()
    await browser.waitForElementByCss('#to-hello-again')
    await browser.elementByCss('#to-hello-again').click()
    await browser.waitForElementByCss('#hello-again')

    expect(await browser.eval('window.location.href')).toMatch(/\/second$/)
    expect(await getBrowserBodyText(browser)).toMatch(/Hello again/)

    await browser.eval('window.location.href = window.location.href')
    await waitFor(500)
    expect(await browser.eval('window.location.href')).toMatch(/\/second$/)
    expect(await getBrowserBodyText(browser)).toMatch(/Hello again/)
  })

  it('should work with rewrite when manually specifying href/as', async () => {
    const browser = await webdriver(nextUrl, '/nav')
    await browser.eval('window.beforeNav = 1')
    await browser.elementByCss('#to-params-manual').click().waitForElementByCss('#query')

    expect(await browser.eval('window.beforeNav')).toBe(1)
    const query = JSON.parse(await browser.elementByCss('#query').text())
    expect(query).toEqual({
      something: '1',
      another: 'value',
    })
  })

  it('should work with rewrite when only specifying href', async () => {
    const browser = await webdriver(nextUrl, '/nav')
    await browser.eval('window.beforeNav = 1')
    await browser.elementByCss('#to-params').click().waitForElementByCss('#query')

    expect(await browser.eval('window.beforeNav')).toBe(1)
    const query = JSON.parse(await browser.elementByCss('#query').text())
    expect(query).toEqual({
      something: '1',
      another: 'value',
    })
  })

  it('should work with rewrite when only specifying href and ends in dynamic route', async () => {
    const browser = await webdriver(nextUrl, '/nav')
    await browser.eval('window.beforeNav = 1')
    await browser.elementByCss('#to-rewritten-dynamic').click().waitForElementByCss('#auto-export')

    expect(await browser.eval('window.beforeNav')).toBe(1)

    const text = await browser.eval(() => document.documentElement.innerHTML)
    expect(text).toContain('auto-export hello')
  })

  it('should match a page after a rewrite', async () => {
    const html = await renderViaHTTP(nextUrl, '/to-hello')
    expect(html).toContain('Hello')
  })

  it('should match dynamic route after rewrite', async () => {
    const html = await renderViaHTTP(nextUrl, '/blog/post-1')
    expect(html).toMatch(/post:.*?post-2/)
  })

  it('should match public file after rewrite', async () => {
    const data = await renderViaHTTP(nextUrl, '/blog/data.json')
    expect(JSON.parse(data)).toEqual({ hello: 'world' })
  })

  it('should match /_next file after rewrite', async () => {
    await renderViaHTTP(nextUrl, '/hello')
    const data = await renderViaHTTP(nextUrl, `/hidden/_next/static/${buildId}/_buildManifest.js`)
    expect(data).toContain('/hello')
  })

  it('should allow redirecting to external resource', async () => {
    const res = await fetchViaHTTP(nextUrl, '/to-external', undefined, {
      redirect: 'manual',
    })
    const location = res.headers.get('location')
    expect(res.status).toBe(307)
    expect(location).toBe('https://google.com/')
  })

  it('should apply headers for exact match', async () => {
    const res = await fetchViaHTTP(nextUrl, '/add-header')
    expect(res.headers.get('x-custom-header')).toBe('hello world')
    expect(res.headers.get('x-another-header')).toBe('hello again')
  })

  it('should apply headers for multi match', async () => {
    const res = await fetchViaHTTP(nextUrl, '/my-headers/first')
    expect(res.headers.get('x-first-header')).toBe('first')
    expect(res.headers.get('x-second-header')).toBe('second')
  })

  it('should apply params for header key/values', async () => {
    const res = await fetchViaHTTP(nextUrl, '/my-other-header/first')
    expect(res.headers.get('x-path')).toBe('first')
    expect(res.headers.get('somefirst')).toBe('hi')
  })

  it('should support URL for header key/values', async () => {
    const res = await fetchViaHTTP(nextUrl, '/without-params/url')
    expect(res.headers.get('x-origin')).toBe('https://example.com')
  })

  it('should apply params header key/values with URL', async () => {
    const res = await fetchViaHTTP(nextUrl, '/with-params/url/first')
    expect(res.headers.get('x-url')).toBe('https://example.com/first')
  })

  it('should apply params header key/values with URL that has port', async () => {
    const res = await fetchViaHTTP(nextUrl, '/with-params/url2/first')
    expect(res.headers.get('x-url')).toBe('https://example.com:8080?hello=first')
  })

  it('should support named pattern for header key/values', async () => {
    const res = await fetchViaHTTP(nextUrl, '/named-pattern/hello')
    expect(res.headers.get('x-something')).toBe('value=hello')
    expect(res.headers.get('path-hello')).toBe('end')
  })

  it('should support unnamed parameters correctly', async () => {
    const res = await fetchViaHTTP(nextUrl, '/unnamed/first/final', undefined, {
      redirect: 'manual',
    })
    const { pathname } = url.parse(res.headers.get('location') || '')
    expect(res.status).toBe(307)
    expect(pathname).toBe('/got-unnamed')
  })

  it('should support named like unnamed parameters correctly', async () => {
    const res = await fetchViaHTTP(nextUrl, '/named-like-unnamed/first', undefined, {
      redirect: 'manual',
    })
    const { pathname } = url.parse(res.headers.get('location') || '')
    expect(res.status).toBe(307)
    expect(pathname).toBe('/first')
  })

  it('should add refresh header for 308 redirect', async () => {
    const res = await fetchViaHTTP(nextUrl, '/redirect4', undefined, {
      redirect: 'manual',
    })
    expect(res.status).toBe(308)
    expect(res.headers.get('refresh')).toBe(`0;url=/`)
  })

  it('should have correctly encoded query in location and refresh headers', async () => {
    const res = await fetchViaHTTP(
      nextUrl,
      // Query unencoded is ?テスト=あ
      '/redirect4?%E3%83%86%E3%82%B9%E3%83%88=%E3%81%82',
      undefined,
      {
        redirect: 'manual',
      },
    )
    expect(res.status).toBe(308)

    expect(res.headers.get('location').split('?')[1]).toBe('%E3%83%86%E3%82%B9%E3%83%88=%E3%81%82')
    expect(res.headers.get('refresh')).toBe('0;url=/?%E3%83%86%E3%82%B9%E3%83%88=%E3%81%82')
  })

  it('should handle basic api rewrite successfully', async () => {
    const data = await renderViaHTTP(nextUrl, '/api-hello')
    expect(JSON.parse(data)).toEqual({ query: {} })
  })

  it('should handle api rewrite with un-named param successfully', async () => {
    const data = await renderViaHTTP(nextUrl, '/api-hello-regex/hello/world')
    expect(JSON.parse(data)).toEqual({
      query: { name: 'hello/world', first: 'hello/world' },
    })
  })

  it('should handle api rewrite with param successfully', async () => {
    const data = await renderViaHTTP(nextUrl, '/api-hello-param/hello')
    expect(JSON.parse(data)).toEqual({
      query: { name: 'hello', hello: 'hello' },
    })
  })

  it('should handle encoded value in the pathname correctly', async () => {
    const res = await fetchViaHTTP(nextUrl, '/redirect/me/to-about/' + encodeURI('\\google.com'), undefined, {
      redirect: 'manual',
    })

    const { pathname, hostname, query } = url.parse(res.headers.get('location') || '', true)
    expect(res.status).toBe(307)
    expect(pathname).toBe(encodeURI('/\\google.com/about'))
    expect(hostname).not.toBe('google.com')
    expect(query).toEqual({})
  })

  it('should handle unnamed parameters with multi-match successfully', async () => {
    const html = await renderViaHTTP(nextUrl, '/unnamed-params/nested/first/second/hello/world')
    const params = JSON.parse(load(html)('p').text())
    expect(params).toEqual({ test: 'hello' })
  })

  it('should handle named regex parameters with multi-match successfully', async () => {
    const res = await fetchViaHTTP(nextUrl, '/docs/integrations/v2-some/thing', undefined, {
      redirect: 'manual',
    })
    const { pathname } = url.parse(res.headers.get('location') || '')
    expect(res.status).toBe(307)
    expect(pathname).toBe('/integrations/-some/thing')
  })

  it('should redirect with URL in query correctly', async () => {
    const res = await fetchViaHTTP(nextUrl, '/to-external-with-query', undefined, {
      redirect: 'manual',
    })

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe(
      'https://authserver.example.com/set-password?returnUrl=https://www.example.com/login',
    )
  })

  it('should redirect with URL in query correctly non-encoded', async () => {
    const res = await fetchViaHTTP(nextUrl, '/to-external-with-query', undefined, {
      redirect: 'manual',
    })

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe(
      'https://authserver.example.com/set-password?returnUrl=https://www.example.com/login',
    )
  })

  it('should match has header rewrite correctly', async () => {
    const res = await fetchViaHTTP(nextUrl, '/has-rewrite-1', undefined, {
      headers: {
        'x-my-header': 'hello world!!',
      },
    })

    expect(res.status).toBe(200)
    const $ = load(await res.text())

    expect(JSON.parse($('#query').text())).toEqual({
      myHeader: 'hello world!!',
    })

    const res2 = await fetchViaHTTP(nextUrl, '/has-rewrite-1')
    expect(res2.status).toBe(404)
  })

  it('should match has query rewrite correctly', async () => {
    const res = await fetchViaHTTP(nextUrl, '/has-rewrite-2', {
      'my-query': 'hellooo',
    })

    expect(res.status).toBe(200)
    const $ = load(await res.text())

    expect(JSON.parse($('#query').text())).toEqual({
      'my-query': 'hellooo',
      myquery: 'hellooo',
      value: 'hellooo',
    })

    const res2 = await fetchViaHTTP(nextUrl, '/has-rewrite-2')
    expect(res2.status).toBe(404)
  })

  it('should match has cookie rewrite correctly', async () => {
    const res = await fetchViaHTTP(nextUrl, '/has-rewrite-3', undefined, {
      headers: {
        cookie: 'loggedIn=true',
      },
    })

    expect(res.status).toBe(200)
    const $ = load(await res.text())

    expect(JSON.parse($('#query').text())).toEqual({
      loggedIn: 'true',
      authorized: '1',
    })

    const res2 = await fetchViaHTTP(nextUrl, '/has-rewrite-3')
    expect(res2.status).toBe(404)
  })

  it('should match has host rewrite correctly', async () => {
    const res1 = await fetchViaHTTP(nextUrl, '/has-rewrite-4')
    expect(res1.status).toBe(404)

    const res = await fetchViaHTTP(nextUrl, '/has-rewrite-4', undefined, {
      headers: {
        host: 'example.com',
      },
    })

    expect(res.status).toBe(200)
    const $ = load(await res.text())

    expect(JSON.parse($('#query').text())).toEqual({
      host: '1',
    })

    const res2 = await fetchViaHTTP(nextUrl, '/has-rewrite-4')
    expect(res2.status).toBe(404)
  })

  it('should pass has segment for rewrite correctly', async () => {
    const res1 = await fetchViaHTTP(nextUrl, '/has-rewrite-5')
    expect(res1.status).toBe(404)

    const res = await fetchViaHTTP(nextUrl, '/has-rewrite-5', {
      hasParam: 'with-params',
    })

    expect(res.status).toBe(200)
    const $ = load(await res.text())

    expect(JSON.parse($('#query').text())).toEqual({
      hasParam: 'with-params',
    })
  })

  it('should not pass non captured has value for rewrite correctly', async () => {
    const res1 = await fetchViaHTTP(nextUrl, '/has-rewrite-6')
    expect(res1.status).toBe(404)

    const res = await fetchViaHTTP(nextUrl, '/has-rewrite-6', undefined, {
      headers: {
        hasParam: 'with-params',
      },
    })
    expect(res.status).toBe(200)

    const $ = load(await res.text())
    expect(JSON.parse($('#query').text())).toEqual({})
  })

  it('should pass captured has value for rewrite correctly', async () => {
    const res1 = await fetchViaHTTP(nextUrl, '/has-rewrite-7')
    expect(res1.status).toBe(404)

    const res = await fetchViaHTTP(nextUrl, '/has-rewrite-7', {
      hasParam: 'with-params',
    })
    expect(res.status).toBe(200)

    const $ = load(await res.text())
    expect(JSON.parse($('#query').text())).toEqual({
      hasParam: 'with-params',
      idk: 'with-params',
    })
  })

  it('should match has rewrite correctly before files', async () => {
    const res1 = await fetchViaHTTP(nextUrl, '/hello')
    expect(res1.status).toBe(200)
    const $1 = load(await res1.text())
    expect($1('#hello').text()).toBe('Hello')

    const res = await fetchViaHTTP(nextUrl, '/hello', { overrideMe: '1' })

    expect(res.status).toBe(200)
    const $ = load(await res.text())

    expect(JSON.parse($('#query').text())).toEqual({
      overrideMe: '1',
      overridden: '1',
    })

    const browser = await webdriver(nextUrl, '/nav')
    await browser.eval('window.beforeNav = 1')
    await browser.elementByCss('#to-overridden').click()
    await browser.waitForElementByCss('#query')

    expect(await browser.eval('window.next.router.pathname')).toBe('/with-params')
    expect(JSON.parse(await browser.elementByCss('#query').text())).toEqual({
      overridden: '1',
      overrideMe: '1',
    })
    expect(await browser.eval('window.beforeNav')).toBe(1)
  })

  it('should match has header redirect correctly', async () => {
    const res = await fetchViaHTTP(nextUrl, '/has-redirect-1', undefined, {
      headers: {
        'x-my-header': 'hello world!!',
      },
      redirect: 'manual',
    })

    expect(res.status).toBe(307)
    const parsed = url.parse(res.headers.get('location'), true)

    expect(parsed.pathname).toBe('/another')
    expect(parsed.query).toEqual({
      myHeader: 'hello world!!',
    })

    const res2 = await fetchViaHTTP(nextUrl, '/has-redirect-1', undefined, {
      redirect: 'manual',
    })
    expect(res2.status).toBe(404)
  })

  it('should match has query redirect correctly', async () => {
    const res = await fetchViaHTTP(
      nextUrl,
      '/has-redirect-2',
      {
        'my-query': 'hellooo',
      },
      {
        redirect: 'manual',
      },
    )

    expect(res.status).toBe(307)
    const parsed = url.parse(res.headers.get('location'), true)

    expect(parsed.pathname).toBe('/another')
    expect(parsed.query).toEqual({
      value: 'hellooo',
      'my-query': 'hellooo',
    })

    const res2 = await fetchViaHTTP(nextUrl, '/has-redirect-2', undefined, {
      redirect: 'manual',
    })
    expect(res2.status).toBe(404)
  })

  it('should match has cookie redirect correctly', async () => {
    const res = await fetchViaHTTP(nextUrl, '/has-redirect-3', undefined, {
      headers: {
        cookie: 'loggedIn=true',
      },
      redirect: 'manual',
    })

    expect(res.status).toBe(307)
    const parsed = url.parse(res.headers.get('location'), true)

    expect(parsed.pathname).toBe('/another')
    expect(parsed.query).toEqual({
      authorized: '1',
    })

    const res2 = await fetchViaHTTP(nextUrl, '/has-redirect-3', undefined, {
      redirect: 'manual',
    })
    expect(res2.status).toBe(404)
  })

  it('should match has host redirect correctly', async () => {
    const res1 = await fetchViaHTTP(nextUrl, '/has-redirect-4', undefined, {
      redirect: 'manual',
    })
    expect(res1.status).toBe(404)

    const res = await fetchViaHTTP(nextUrl, '/has-redirect-4', undefined, {
      headers: {
        host: 'example.com',
      },
      redirect: 'manual',
    })

    expect(res.status).toBe(307)
    const parsed = url.parse(res.headers.get('location'), true)

    expect(parsed.pathname).toBe('/another')
    expect(parsed.query).toEqual({
      host: '1',
    })
  })

  it('should match has host redirect and insert in destination correctly', async () => {
    const res1 = await fetchViaHTTP(nextUrl, '/has-redirect-6', undefined, {
      redirect: 'manual',
    })
    expect(res1.status).toBe(404)

    const res = await fetchViaHTTP(nextUrl, '/has-redirect-6', undefined, {
      headers: {
        host: 'hello-test.example.com',
      },
      redirect: 'manual',
    })

    expect(res.status).toBe(307)
    const parsed = url.parse(res.headers.get('location'), true)

    expect(parsed.protocol).toBe('https:')
    expect(parsed.hostname).toBe('hello.example.com')
    expect(parsed.pathname).toBe('/some-path/end')
    expect(parsed.query).toEqual({
      a: 'b',
    })
  })

  it('should match has query redirect with duplicate query key', async () => {
    const res = await fetchViaHTTP(nextUrl, '/has-redirect-7', '?hello=world&hello=another', {
      redirect: 'manual',
    })
    expect(res.status).toBe(307)
    const parsed = url.parse(res.headers.get('location'), true)

    expect(parsed.pathname).toBe('/somewhere')
    expect(parsed.query).toEqual({
      hello: ['world', 'another'],
      value: 'another',
    })
  })

  it('should match has header for header correctly', async () => {
    const res = await fetchViaHTTP(nextUrl, '/has-header-1', undefined, {
      headers: {
        'x-my-header': 'hello world!!',
      },
      redirect: 'manual',
    })

    expect(res.headers.get('x-another')).toBe('header')

    const res2 = await fetchViaHTTP(nextUrl, '/has-header-1', undefined, {
      redirect: 'manual',
    })
    expect(res2.headers.get('x-another')).toBe(null)
  })

  it('should match has query for header correctly', async () => {
    const res = await fetchViaHTTP(
      nextUrl,
      '/has-header-2',
      {
        'my-query': 'hellooo',
      },
      {
        redirect: 'manual',
      },
    )

    expect(res.headers.get('x-added')).toBe('value')

    const res2 = await fetchViaHTTP(nextUrl, '/has-header-2', undefined, {
      redirect: 'manual',
    })
    expect(res2.headers.get('x-another')).toBe(null)
  })

  it('should match has cookie for header correctly', async () => {
    const res = await fetchViaHTTP(nextUrl, '/has-header-3', undefined, {
      headers: {
        cookie: 'loggedIn=true',
      },
      redirect: 'manual',
    })

    expect(res.headers.get('x-is-user')).toBe('yuuuup')

    const res2 = await fetchViaHTTP(nextUrl, '/has-header-3', undefined, {
      redirect: 'manual',
    })
    expect(res2.headers.get('x-is-user')).toBe(null)
  })

  it('should match has host for header correctly', async () => {
    const res = await fetchViaHTTP(nextUrl, '/has-header-4', undefined, {
      headers: {
        host: 'example.com',
      },
      redirect: 'manual',
    })

    expect(res.headers.get('x-is-host')).toBe('yuuuup')

    const res2 = await fetchViaHTTP(nextUrl, '/has-header-4', undefined, {
      redirect: 'manual',
    })
    expect(res2.headers.get('x-is-host')).toBe(null)
  })
})
