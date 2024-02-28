import { expect } from '@playwright/test'
import { test } from '../utils/playwright-helpers.js'

export function waitFor(millis: number) {
  return new Promise((resolve) => setTimeout(resolve, millis))
}

/**
 * Check for content in 1 second intervals timing out after 30 seconds.
 *
 * @param {() => Promise<unknown> | unknown} contentFn
 * @param {RegExp | string | number} regex
 * @param {boolean} hardError
 * @param {number} maxRetries
 * @returns {Promise<boolean>}
 */
export async function check(
  contentFn: () => any | Promise<any>,
  regex: any,
  hardError = true,
  maxRetries = 30,
) {
  let content
  let lastErr

  for (let tries = 0; tries < maxRetries; tries++) {
    try {
      content = await contentFn()
      if (typeof regex !== typeof /regex/) {
        if (regex === content) {
          return true
        }
      } else if (regex.test(content)) {
        // found the content
        return true
      }
      await waitFor(1000)
    } catch (err) {
      await waitFor(1000)
      lastErr = err
    }
  }
  console.error('TIMED OUT CHECK: ', { regex, content, lastErr })

  if (hardError) {
    throw new Error('TIMED OUT: ' + regex + '\n\n' + content + '\n\n' + lastErr)
  }
  return false
}

test.describe('Simple Page Router (no basePath, no i18n)', () => {
  test('Static revalidate works correctly', async ({ page, pageRouter }) => {
    // in case there is retry or some other test did hit that path before
    // we want to make sure that cdn cache is not warmed up
    const purgeCdnCache = await page.goto(
      new URL('/api/purge-cdn?path=/static/revalidate-manual', pageRouter.url).href,
    )
    expect(purgeCdnCache?.status()).toBe(200)

    const response1 = await page.goto(new URL('static/revalidate-manual', pageRouter.url).href)
    const headers1 = response1?.headers() || {}
    expect(response1?.status()).toBe(200)
    expect(headers1['x-nextjs-cache']).toBeUndefined()
    // either first time hitting this route or we invalidated
    // just CDN node in earlier step
    // we will invoke function and see Next cache hit status \
    // in the response because it was prerendered at build time
    // or regenerated in previous attempt to run this test
    expect(headers1['cache-status']).toMatch(/"Netlify Edge"; fwd=(miss|stale)/m)
    expect(headers1['cache-status']).toMatch(/"Next.js"; hit/m)
    expect(headers1['netlify-cache-tag']).toBe('_n_t_/static/revalidate-manual')
    expect(headers1['netlify-cdn-cache-control']).toBe(
      's-maxage=31536000, stale-while-revalidate=31536000',
    )

    const date1 = await page.textContent('[data-testid="date-now"]')
    const h1 = await page.textContent('h1')
    expect(h1).toBe('Show #71')

    // check json route
    const response1Json = await page.goto(
      new URL('_next/data/build-id/static/revalidate-manual.json', pageRouter.url).href,
    )
    const headers1Json = response1Json?.headers() || {}
    expect(response1Json?.status()).toBe(200)
    expect(headers1Json['x-nextjs-cache']).toBeUndefined()
    // either first time hitting this route or we invalidated
    // just CDN node in earlier step
    // we will invoke function and see Next cache hit status \
    // in the response because it was prerendered at build time
    // or regenerated in previous attempt to run this test
    expect(headers1Json['cache-status']).toMatch(/"Netlify Edge"; fwd=(miss|stale)/m)
    expect(headers1Json['cache-status']).toMatch(/"Next.js"; hit/m)
    expect(headers1Json['netlify-cache-tag']).toBe('_n_t_/static/revalidate-manual')
    expect(headers1Json['netlify-cdn-cache-control']).toBe(
      's-maxage=31536000, stale-while-revalidate=31536000',
    )
    const data1 = (await response1Json?.json()) || {}
    expect(data1?.pageProps?.time).toBe(date1)

    const response2 = await page.goto(new URL('static/revalidate-manual', pageRouter.url).href)
    const headers2 = response2?.headers() || {}
    expect(response2?.status()).toBe(200)
    expect(headers2['x-nextjs-cache']).toBeUndefined()
    // we are hitting the same page again and we most likely will see
    // CDN hit (in this case Next reported cache status is omitted
    // as it didn't actually take place in handling this request)
    // or we will see CDN miss because different CDN node handled request
    expect(headers2['cache-status']).toMatch(/"Netlify Edge"; (hit|fwd=miss|fwd=stale)/m)
    if (!headers2['cache-status'].includes('hit')) {
      // if we missed CDN cache, we will see Next cache hit status
      // as we reuse cached response
      expect(headers2['cache-status']).toMatch(/"Next.js"; hit/m)
    }
    expect(headers2['netlify-cdn-cache-control']).toBe(
      's-maxage=31536000, stale-while-revalidate=31536000',
    )

    // the page is cached
    const date2 = await page.textContent('[data-testid="date-now"]')
    expect(date2).toBe(date1)

    // check json route
    const response2Json = await page.goto(
      new URL('/_next/data/build-id/static/revalidate-manual.json', pageRouter.url).href,
    )
    const headers2Json = response2Json?.headers() || {}
    expect(response2Json?.status()).toBe(200)
    expect(headers2Json['x-nextjs-cache']).toBeUndefined()
    // we are hitting the same page again and we most likely will see
    // CDN hit (in this case Next reported cache status is omitted
    // as it didn't actually take place in handling this request)
    // or we will see CDN miss because different CDN node handled request
    expect(headers2Json['cache-status']).toMatch(/"Netlify Edge"; (hit|fwd=miss|fwd=stale)/m)
    if (!headers2Json['cache-status'].includes('hit')) {
      // if we missed CDN cache, we will see Next cache hit status
      // as we reuse cached response
      expect(headers2Json['cache-status']).toMatch(/"Next.js"; hit/m)
    }
    expect(headers2Json['netlify-cdn-cache-control']).toBe(
      's-maxage=31536000, stale-while-revalidate=31536000',
    )

    const data2 = (await response2Json?.json()) || {}
    expect(data2?.pageProps?.time).toBe(date1)

    const revalidate = await page.goto(new URL('/api/revalidate', pageRouter.url).href)
    expect(revalidate?.status()).toBe(200)

    // wait a bit until the page got regenerated
    await page.waitForTimeout(1000)

    // now after the revalidation it should have a different date
    const response3 = await page.goto(new URL('static/revalidate-manual', pageRouter.url).href)
    const headers3 = response3?.headers() || {}
    expect(response3?.status()).toBe(200)
    expect(headers3?.['x-nextjs-cache']).toBeUndefined()
    // revalidate refreshes Next cache, but not CDN cache
    // so our request after revalidation means that Next cache is already
    // warmed up with fresh response, but CDN cache just knows that previously
    // cached response is stale, so we are hitting our function that serve
    // already cached response
    expect(headers3['cache-status']).toMatch(/"Next.js"; hit/m)
    expect(headers3['cache-status']).toMatch(/"Netlify Edge"; fwd=stale/m)

    // the page has now an updated date
    const date3 = await page.textContent('[data-testid="date-now"]')
    expect(date3).not.toBe(date2)

    // check json route
    const response3Json = await page.goto(
      new URL('/_next/data/build-id/static/revalidate-manual.json', pageRouter.url).href,
    )
    const headers3Json = response3Json?.headers() || {}
    expect(response3Json?.status()).toBe(200)
    expect(headers3Json['x-nextjs-cache']).toBeUndefined()
    // we are hitting the same page again and we most likely will see
    // CDN hit (in this case Next reported cache status is omitted
    // as it didn't actually take place in handling this request)
    // or we will see CDN miss because different CDN node handled request
    expect(headers3Json['cache-status']).toMatch(/"Netlify Edge"; (hit|fwd=miss|fwd=stale)/m)
    if (!headers3Json['cache-status'].includes('hit')) {
      // if we missed CDN cache, we will see Next cache hit status
      // as we reuse cached response
      expect(headers3Json['cache-status']).toMatch(/"Next.js"; hit/m)
    }
    expect(headers3Json['netlify-cdn-cache-control']).toBe(
      's-maxage=31536000, stale-while-revalidate=31536000',
    )

    const data3 = (await response3Json?.json()) || {}
    expect(data3?.pageProps?.time).toBe(date3)
  })

  test('requesting a non existing page route that needs to be fetched from the blob store like 404.html', async ({
    page,
    pageRouter,
  }) => {
    const response = await page.goto(new URL('non-exisitng', pageRouter.url).href)
    const headers = response?.headers() || {}
    expect(response?.status()).toBe(404)

    expect(await page.textContent('h1')).toBe('404')

    expect(headers['netlify-cdn-cache-control']).toBe(
      'no-cache, no-store, max-age=0, must-revalidate',
    )
    expect(headers['cache-control']).toBe('no-cache,no-store,max-age=0,must-revalidate')
  })

  test('requesting a page with a very long name works', async ({ page, pageRouter }) => {
    const response = await page.goto(
      new URL(
        '/products/an-incredibly-long-product-name-thats-impressively-repetetively-needlessly-overdimensioned-and-should-be-shortened-to-less-than-255-characters-for-the-sake-of-seo-and-ux-and-first-and-foremost-for-gods-sake-but-nobody-wont-ever-read-this-anyway',
        pageRouter.url,
      ).href,
    )
    expect(response?.status()).toBe(200)
  })

  // adapted from https://github.com/vercel/next.js/blob/89fcf68c6acd62caf91a8cf0bfd3fdc566e75d9d/test/e2e/app-dir/app-static/app-static.test.ts#L108

  test('unstable-cache should work', async ({ pageRouter }) => {
    const pathname = `${pageRouter.url}/api/unstable-cache-node`
    let res = await fetch(`${pageRouter.url}/api/unstable-cache-node`)
    expect(res.status).toBe(200)
    let prevData = await res.json()

    expect(prevData.data.random).toBeTruthy()

    await check(async () => {
      res = await fetch(pathname)
      expect(res.status).toBe(200)
      const curData = await res.json()

      try {
        expect(curData.data.random).toBeTruthy()
        expect(curData.data.random).toBe(prevData.data.random)
      } finally {
        prevData = curData
      }
      return 'success'
    }, 'success')
  })

  test('Fully static pages should be cached permanently', async ({ page, pageRouter }) => {
    const response = await page.goto(new URL('static/fully-static', pageRouter.url).href)
    const headers = response?.headers() || {}

    expect(headers['netlify-cdn-cache-control']).toBe('max-age=31536000')
    expect(headers['cache-control']).toBe('public,max-age=0,must-revalidate')
  })
})

test.describe('Page Router with basePath and i18n', () => {
  test.describe('Static revalidate works correctly', () => {
    test('default locale', async ({ page, pageRouterBasePathI18n }) => {
      // in case there is retry or some other test did hit that path before
      // we want to make sure that cdn cache is not warmed up
      const purgeCdnCache = await page.goto(
        new URL(
          '/base/path/api/purge-cdn?path=/en/static/revalidate-manual',
          pageRouterBasePathI18n.url,
        ).href,
      )
      expect(purgeCdnCache?.status()).toBe(200)

      const response1ImplicitLocale = await page.goto(
        new URL('base/path/static/revalidate-manual', pageRouterBasePathI18n.url).href,
      )
      const headers1ImplicitLocale = response1ImplicitLocale?.headers() || {}
      expect(response1ImplicitLocale?.status()).toBe(200)
      expect(headers1ImplicitLocale['x-nextjs-cache']).toBeUndefined()
      // either first time hitting this route or we invalidated
      // just CDN node in earlier step
      // we will invoke function and see Next cache hit status \
      // in the response because it was prerendered at build time
      // or regenerated in previous attempt to run this test
      expect(headers1ImplicitLocale['cache-status']).toMatch(/"Netlify Edge"; fwd=(miss|stale)/m)
      expect(headers1ImplicitLocale['cache-status']).toMatch(/"Next.js"; hit/m)
      expect(headers1ImplicitLocale['netlify-cache-tag']).toBe('_n_t_/en/static/revalidate-manual')
      expect(headers1ImplicitLocale['netlify-cdn-cache-control']).toBe(
        's-maxage=31536000, stale-while-revalidate=31536000',
      )

      const date1ImplicitLocale = await page.textContent('[data-testid="date-now"]')
      const h1ImplicitLocale = await page.textContent('h1')
      expect(h1ImplicitLocale).toBe('Show #71')

      const response1ExplicitLocale = await page.goto(
        new URL('base/path/en/static/revalidate-manual', pageRouterBasePathI18n.url).href,
      )
      const headers1ExplicitLocale = response1ExplicitLocale?.headers() || {}
      expect(response1ExplicitLocale?.status()).toBe(200)
      expect(headers1ExplicitLocale['x-nextjs-cache']).toBeUndefined()
      // either first time hitting this route or we invalidated
      // just CDN node in earlier step
      // we will invoke function and see Next cache hit status \
      // in the response because it was prerendered at build time
      // or regenerated in previous attempt to run this test
      expect(headers1ExplicitLocale['cache-status']).toMatch(/"Netlify Edge"; fwd=(miss|stale)/m)
      expect(headers1ExplicitLocale['cache-status']).toMatch(/"Next.js"; hit/m)
      expect(headers1ExplicitLocale['netlify-cache-tag']).toBe('_n_t_/en/static/revalidate-manual')
      expect(headers1ExplicitLocale['netlify-cdn-cache-control']).toBe(
        's-maxage=31536000, stale-while-revalidate=31536000',
      )

      const date1ExplicitLocale = await page.textContent('[data-testid="date-now"]')
      const h1ExplicitLocale = await page.textContent('h1')
      expect(h1ExplicitLocale).toBe('Show #71')

      // implicit and explicit locale paths should be the same (same cached response)
      expect(date1ImplicitLocale).toBe(date1ExplicitLocale)

      // check json route
      const response1Json = await page.goto(
        new URL(
          'base/path/_next/data/build-id/en/static/revalidate-manual.json',
          pageRouterBasePathI18n.url,
        ).href,
      )
      const headers1Json = response1Json?.headers() || {}
      expect(response1Json?.status()).toBe(200)
      expect(headers1Json['x-nextjs-cache']).toBeUndefined()
      // either first time hitting this route or we invalidated
      // just CDN node in earlier step
      // we will invoke function and see Next cache hit status \
      // in the response because it was prerendered at build time
      // or regenerated in previous attempt to run this test
      expect(headers1Json['cache-status']).toMatch(/"Netlify Edge"; fwd=(miss|stale)/m)
      expect(headers1Json['cache-status']).toMatch(/"Next.js"; hit/m)
      expect(headers1Json['netlify-cache-tag']).toBe('_n_t_/en/static/revalidate-manual')
      expect(headers1Json['netlify-cdn-cache-control']).toBe(
        's-maxage=31536000, stale-while-revalidate=31536000',
      )
      const data1 = (await response1Json?.json()) || {}
      expect(data1?.pageProps?.time).toBe(date1ImplicitLocale)

      const response2ImplicitLocale = await page.goto(
        new URL('base/path/static/revalidate-manual', pageRouterBasePathI18n.url).href,
      )
      const headers2ImplicitLocale = response2ImplicitLocale?.headers() || {}
      expect(response2ImplicitLocale?.status()).toBe(200)
      expect(headers2ImplicitLocale['x-nextjs-cache']).toBeUndefined()
      // we are hitting the same page again and we most likely will see
      // CDN hit (in this case Next reported cache status is omitted
      // as it didn't actually take place in handling this request)
      // or we will see CDN miss because different CDN node handled request
      expect(headers2ImplicitLocale['cache-status']).toMatch(
        /"Netlify Edge"; (hit|fwd=miss|fwd=stale)/m,
      )
      if (!headers2ImplicitLocale['cache-status'].includes('hit')) {
        // if we missed CDN cache, we will see Next cache hit status
        // as we reuse cached response
        expect(headers2ImplicitLocale['cache-status']).toMatch(/"Next.js"; hit/m)
      }
      expect(headers2ImplicitLocale['netlify-cdn-cache-control']).toBe(
        's-maxage=31536000, stale-while-revalidate=31536000',
      )

      // the page is cached
      const date2ImplicitLocale = await page.textContent('[data-testid="date-now"]')
      expect(date2ImplicitLocale).toBe(date1ImplicitLocale)

      const response2ExplicitLocale = await page.goto(
        new URL('base/path/static/revalidate-manual', pageRouterBasePathI18n.url).href,
      )
      const headers2ExplicitLocale = response2ExplicitLocale?.headers() || {}
      expect(response2ExplicitLocale?.status()).toBe(200)
      expect(headers2ExplicitLocale['x-nextjs-cache']).toBeUndefined()
      // we are hitting the same page again and we most likely will see
      // CDN hit (in this case Next reported cache status is omitted
      // as it didn't actually take place in handling this request)
      // or we will see CDN miss because different CDN node handled request
      expect(headers2ExplicitLocale['cache-status']).toMatch(
        /"Netlify Edge"; (hit|fwd=miss|fwd=stale)/m,
      )
      if (!headers2ExplicitLocale['cache-status'].includes('hit')) {
        // if we missed CDN cache, we will see Next cache hit status
        // as we reuse cached response
        expect(headers2ExplicitLocale['cache-status']).toMatch(/"Next.js"; hit/m)
      }
      expect(headers2ExplicitLocale['netlify-cdn-cache-control']).toBe(
        's-maxage=31536000, stale-while-revalidate=31536000',
      )

      // the page is cached
      const date2ExplicitLocale = await page.textContent('[data-testid="date-now"]')
      expect(date2ExplicitLocale).toBe(date1ExplicitLocale)

      // check json route
      const response2Json = await page.goto(
        new URL(
          'base/path/_next/data/build-id/en/static/revalidate-manual.json',
          pageRouterBasePathI18n.url,
        ).href,
      )
      const headers2Json = response2Json?.headers() || {}
      expect(response2Json?.status()).toBe(200)
      expect(headers2Json['x-nextjs-cache']).toBeUndefined()
      // we are hitting the same page again and we most likely will see
      // CDN hit (in this case Next reported cache status is omitted
      // as it didn't actually take place in handling this request)
      // or we will see CDN miss because different CDN node handled request
      expect(headers2Json['cache-status']).toMatch(/"Netlify Edge"; (hit|fwd=miss|fwd=stale)/m)
      if (!headers2Json['cache-status'].includes('hit')) {
        // if we missed CDN cache, we will see Next cache hit status
        // as we reuse cached response
        expect(headers2Json['cache-status']).toMatch(/"Next.js"; hit/m)
      }
      expect(headers2Json['netlify-cdn-cache-control']).toBe(
        's-maxage=31536000, stale-while-revalidate=31536000',
      )

      const data2 = (await response2Json?.json()) || {}
      expect(data2?.pageProps?.time).toBe(date1ImplicitLocale)

      // revalidate implicit locale path
      const revalidateImplicit = await page.goto(
        new URL(
          '/base/path/api/revalidate?path=/static/revalidate-manual',
          pageRouterBasePathI18n.url,
        ).href,
      )
      expect(revalidateImplicit?.status()).toBe(200)

      // wait a bit until the page got regenerated
      await page.waitForTimeout(1000)

      // now after the revalidation it should have a different date
      const response3ImplicitLocale = await page.goto(
        new URL('base/path/static/revalidate-manual', pageRouterBasePathI18n.url).href,
      )
      const headers3ImplicitLocale = response3ImplicitLocale?.headers() || {}
      expect(response3ImplicitLocale?.status()).toBe(200)
      expect(headers3ImplicitLocale?.['x-nextjs-cache']).toBeUndefined()
      // revalidate refreshes Next cache, but not CDN cache
      // so our request after revalidation means that Next cache is already
      // warmed up with fresh response, but CDN cache just knows that previously
      // cached response is stale, so we are hitting our function that serve
      // already cached response
      expect(headers3ImplicitLocale['cache-status']).toMatch(/"Next.js"; hit/m)
      expect(headers3ImplicitLocale['cache-status']).toMatch(/"Netlify Edge"; fwd=stale/m)

      // the page has now an updated date
      const date3ImplicitLocale = await page.textContent('[data-testid="date-now"]')
      expect(date3ImplicitLocale).not.toBe(date2ImplicitLocale)

      const response3ExplicitLocale = await page.goto(
        new URL('base/path/en/static/revalidate-manual', pageRouterBasePathI18n.url).href,
      )
      const headers3ExplicitLocale = response3ExplicitLocale?.headers() || {}
      expect(response3ExplicitLocale?.status()).toBe(200)
      expect(headers3ExplicitLocale?.['x-nextjs-cache']).toBeUndefined()
      // revalidate refreshes Next cache, but not CDN cache
      // so our request after revalidation means that Next cache is already
      // warmed up with fresh response, but CDN cache just knows that previously
      // cached response is stale, so we are hitting our function that serve
      // already cached response
      expect(headers3ExplicitLocale['cache-status']).toMatch(/"Next.js"; hit/m)
      expect(headers3ExplicitLocale['cache-status']).toMatch(/"Netlify Edge"; fwd=stale/m)

      // the page has now an updated date
      const date3ExplicitLocale = await page.textContent('[data-testid="date-now"]')
      expect(date3ExplicitLocale).not.toBe(date2ExplicitLocale)

      // implicit and explicit locale paths should be the same (same cached response)
      expect(date3ImplicitLocale).toBe(date3ExplicitLocale)

      // check json route
      const response3Json = await page.goto(
        new URL(
          'base/path/_next/data/build-id/en/static/revalidate-manual.json',
          pageRouterBasePathI18n.url,
        ).href,
      )
      const headers3Json = response3Json?.headers() || {}
      expect(response3Json?.status()).toBe(200)
      expect(headers3Json['x-nextjs-cache']).toBeUndefined()
      // we are hitting the same page again and we most likely will see
      // CDN hit (in this case Next reported cache status is omitted
      // as it didn't actually take place in handling this request)
      // or we will see CDN miss because different CDN node handled request
      expect(headers3Json['cache-status']).toMatch(/"Netlify Edge"; (hit|fwd=miss|fwd=stale)/m)
      if (!headers3Json['cache-status'].includes('hit')) {
        // if we missed CDN cache, we will see Next cache hit status
        // as we reuse cached response
        expect(headers3Json['cache-status']).toMatch(/"Next.js"; hit/m)
      }
      expect(headers3Json['netlify-cdn-cache-control']).toBe(
        's-maxage=31536000, stale-while-revalidate=31536000',
      )

      const data3 = (await response3Json?.json()) || {}
      expect(data3?.pageProps?.time).toBe(date3ImplicitLocale)

      // revalidate implicit locale path
      const revalidateExplicit = await page.goto(
        new URL(
          '/base/path/api/revalidate?path=/en/static/revalidate-manual',
          pageRouterBasePathI18n.url,
        ).href,
      )
      expect(revalidateExplicit?.status()).toBe(200)

      // wait a bit until the page got regenerated
      await page.waitForTimeout(1000)

      // now after the revalidation it should have a different date
      const response4ImplicitLocale = await page.goto(
        new URL('base/path/static/revalidate-manual', pageRouterBasePathI18n.url).href,
      )
      const headers4ImplicitLocale = response4ImplicitLocale?.headers() || {}
      expect(response4ImplicitLocale?.status()).toBe(200)
      expect(headers4ImplicitLocale?.['x-nextjs-cache']).toBeUndefined()
      // revalidate refreshes Next cache, but not CDN cache
      // so our request after revalidation means that Next cache is already
      // warmed up with fresh response, but CDN cache just knows that previously
      // cached response is stale, so we are hitting our function that serve
      // already cached response
      expect(headers4ImplicitLocale['cache-status']).toMatch(/"Next.js"; hit/m)
      expect(headers4ImplicitLocale['cache-status']).toMatch(/"Netlify Edge"; fwd=stale/m)

      // the page has now an updated date
      const date4ImplicitLocale = await page.textContent('[data-testid="date-now"]')
      expect(date4ImplicitLocale).not.toBe(date3ImplicitLocale)

      const response4ExplicitLocale = await page.goto(
        new URL('base/path/en/static/revalidate-manual', pageRouterBasePathI18n.url).href,
      )
      const headers4ExplicitLocale = response4ExplicitLocale?.headers() || {}
      expect(response4ExplicitLocale?.status()).toBe(200)
      expect(headers4ExplicitLocale?.['x-nextjs-cache']).toBeUndefined()
      // revalidate refreshes Next cache, but not CDN cache
      // so our request after revalidation means that Next cache is already
      // warmed up with fresh response, but CDN cache just knows that previously
      // cached response is stale, so we are hitting our function that serve
      // already cached response
      expect(headers4ExplicitLocale['cache-status']).toMatch(/"Next.js"; hit/m)
      expect(headers4ExplicitLocale['cache-status']).toMatch(/"Netlify Edge"; fwd=stale/m)

      // the page has now an updated date
      const date4ExplicitLocale = await page.textContent('[data-testid="date-now"]')
      expect(date4ExplicitLocale).not.toBe(date3ExplicitLocale)

      // implicit and explicit locale paths should be the same (same cached response)
      expect(date4ImplicitLocale).toBe(date4ExplicitLocale)

      // check json route
      const response4Json = await page.goto(
        new URL(
          'base/path/_next/data/build-id/en/static/revalidate-manual.json',
          pageRouterBasePathI18n.url,
        ).href,
      )
      const headers4Json = response4Json?.headers() || {}
      expect(response4Json?.status()).toBe(200)
      expect(headers4Json['x-nextjs-cache']).toBeUndefined()
      // we are hitting the same page again and we most likely will see
      // CDN hit (in this case Next reported cache status is omitted
      // as it didn't actually take place in handling this request)
      // or we will see CDN miss because different CDN node handled request
      expect(headers4Json['cache-status']).toMatch(/"Netlify Edge"; (hit|fwd=miss|fwd=stale)/m)
      if (!headers4Json['cache-status'].includes('hit')) {
        // if we missed CDN cache, we will see Next cache hit status
        // as we reuse cached response
        expect(headers4Json['cache-status']).toMatch(/"Next.js"; hit/m)
      }
      expect(headers4Json['netlify-cdn-cache-control']).toBe(
        's-maxage=31536000, stale-while-revalidate=31536000',
      )

      const data4 = (await response4Json?.json()) || {}
      expect(data4?.pageProps?.time).toBe(date4ImplicitLocale)
    })

    test('non-default locale', async ({ page, pageRouterBasePathI18n }) => {
      // in case there is retry or some other test did hit that path before
      // we want to make sure that cdn cache is not warmed up
      const purgeCdnCache = await page.goto(
        new URL(
          '/base/path/api/purge-cdn?path=/de/static/revalidate-manual',
          pageRouterBasePathI18n.url,
        ).href,
      )
      expect(purgeCdnCache?.status()).toBe(200)

      const response1 = await page.goto(
        new URL('/base/path/de/static/revalidate-manual', pageRouterBasePathI18n.url).href,
      )
      const headers1 = response1?.headers() || {}
      expect(response1?.status()).toBe(200)
      expect(headers1['x-nextjs-cache']).toBeUndefined()
      // either first time hitting this route or we invalidated
      // just CDN node in earlier step
      // we will invoke function and see Next cache hit status \
      // in the response because it was prerendered at build time
      // or regenerated in previous attempt to run this test
      expect(headers1['cache-status']).toMatch(/"Netlify Edge"; fwd=(miss|stale)/m)
      expect(headers1['cache-status']).toMatch(/"Next.js"; hit/m)
      expect(headers1['netlify-cache-tag']).toBe('_n_t_/de/static/revalidate-manual')
      expect(headers1['netlify-cdn-cache-control']).toBe(
        's-maxage=31536000, stale-while-revalidate=31536000',
      )

      const date1 = await page.textContent('[data-testid="date-now"]')
      const h1 = await page.textContent('h1')
      expect(h1).toBe('Show #71')

      // check json route
      const response1Json = await page.goto(
        new URL(
          'base/path/_next/data/build-id/de/static/revalidate-manual.json',
          pageRouterBasePathI18n.url,
        ).href,
      )
      const headers1Json = response1Json?.headers() || {}
      expect(response1Json?.status()).toBe(200)
      expect(headers1Json['x-nextjs-cache']).toBeUndefined()
      // either first time hitting this route or we invalidated
      // just CDN node in earlier step
      // we will invoke function and see Next cache hit status \
      // in the response because it was prerendered at build time
      // or regenerated in previous attempt to run this test
      expect(headers1Json['cache-status']).toMatch(/"Netlify Edge"; fwd=(miss|stale)/m)
      expect(headers1Json['cache-status']).toMatch(/"Next.js"; hit/m)
      expect(headers1Json['netlify-cache-tag']).toBe('_n_t_/de/static/revalidate-manual')
      expect(headers1Json['netlify-cdn-cache-control']).toBe(
        's-maxage=31536000, stale-while-revalidate=31536000',
      )
      const data1 = (await response1Json?.json()) || {}
      expect(data1?.pageProps?.time).toBe(date1)

      const response2 = await page.goto(
        new URL('base/path/de/static/revalidate-manual', pageRouterBasePathI18n.url).href,
      )
      const headers2 = response2?.headers() || {}
      expect(response2?.status()).toBe(200)
      expect(headers2['x-nextjs-cache']).toBeUndefined()
      // we are hitting the same page again and we most likely will see
      // CDN hit (in this case Next reported cache status is omitted
      // as it didn't actually take place in handling this request)
      // or we will see CDN miss because different CDN node handled request
      expect(headers2['cache-status']).toMatch(/"Netlify Edge"; (hit|fwd=miss|fwd=stale)/m)
      if (!headers2['cache-status'].includes('hit')) {
        // if we missed CDN cache, we will see Next cache hit status
        // as we reuse cached response
        expect(headers2['cache-status']).toMatch(/"Next.js"; hit/m)
      }
      expect(headers2['netlify-cdn-cache-control']).toBe(
        's-maxage=31536000, stale-while-revalidate=31536000',
      )

      // the page is cached
      const date2 = await page.textContent('[data-testid="date-now"]')
      expect(date2).toBe(date1)

      // check json route
      const response2Json = await page.goto(
        new URL(
          'base/path/_next/data/build-id/de/static/revalidate-manual.json',
          pageRouterBasePathI18n.url,
        ).href,
      )
      const headers2Json = response2Json?.headers() || {}
      expect(response2Json?.status()).toBe(200)
      expect(headers2Json['x-nextjs-cache']).toBeUndefined()
      // we are hitting the same page again and we most likely will see
      // CDN hit (in this case Next reported cache status is omitted
      // as it didn't actually take place in handling this request)
      // or we will see CDN miss because different CDN node handled request
      expect(headers2Json['cache-status']).toMatch(/"Netlify Edge"; (hit|fwd=miss|fwd=stale)/m)
      if (!headers2Json['cache-status'].includes('hit')) {
        // if we missed CDN cache, we will see Next cache hit status
        // as we reuse cached response
        expect(headers2Json['cache-status']).toMatch(/"Next.js"; hit/m)
      }
      expect(headers2Json['netlify-cdn-cache-control']).toBe(
        's-maxage=31536000, stale-while-revalidate=31536000',
      )

      const data2 = (await response2Json?.json()) || {}
      expect(data2?.pageProps?.time).toBe(date1)

      const revalidate = await page.goto(
        new URL(
          '/base/path/api/revalidate?path=/de/static/revalidate-manual',
          pageRouterBasePathI18n.url,
        ).href,
      )
      expect(revalidate?.status()).toBe(200)

      // wait a bit until the page got regenerated
      await page.waitForTimeout(1000)

      // now after the revalidation it should have a different date
      const response3 = await page.goto(
        new URL('base/path/de/static/revalidate-manual', pageRouterBasePathI18n.url).href,
      )
      const headers3 = response3?.headers() || {}
      expect(response3?.status()).toBe(200)
      expect(headers3?.['x-nextjs-cache']).toBeUndefined()
      // revalidate refreshes Next cache, but not CDN cache
      // so our request after revalidation means that Next cache is already
      // warmed up with fresh response, but CDN cache just knows that previously
      // cached response is stale, so we are hitting our function that serve
      // already cached response
      expect(headers3['cache-status']).toMatch(/"Next.js"; hit/m)
      expect(headers3['cache-status']).toMatch(/"Netlify Edge"; fwd=stale/m)

      // the page has now an updated date
      const date3 = await page.textContent('[data-testid="date-now"]')
      expect(date3).not.toBe(date2)

      // check json route
      const response3Json = await page.goto(
        new URL(
          'base/path/_next/data/build-id/de/static/revalidate-manual.json',
          pageRouterBasePathI18n.url,
        ).href,
      )
      const headers3Json = response3Json?.headers() || {}
      expect(response3Json?.status()).toBe(200)
      expect(headers3Json['x-nextjs-cache']).toBeUndefined()
      // we are hitting the same page again and we most likely will see
      // CDN hit (in this case Next reported cache status is omitted
      // as it didn't actually take place in handling this request)
      // or we will see CDN miss because different CDN node handled request
      expect(headers3Json['cache-status']).toMatch(/"Netlify Edge"; (hit|fwd=miss|fwd=stale)/m)
      if (!headers3Json['cache-status'].includes('hit')) {
        // if we missed CDN cache, we will see Next cache hit status
        // as we reuse cached response
        expect(headers3Json['cache-status']).toMatch(/"Next.js"; hit/m)
      }
      expect(headers3Json['netlify-cdn-cache-control']).toBe(
        's-maxage=31536000, stale-while-revalidate=31536000',
      )

      const data3 = (await response3Json?.json()) || {}
      expect(data3?.pageProps?.time).toBe(date3)
    })
  })
})
