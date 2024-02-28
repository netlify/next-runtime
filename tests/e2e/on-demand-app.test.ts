import { expect } from '@playwright/test'
import { test } from '../utils/playwright-helpers.js'

test.describe('app router on-demand revalidation', () => {
  test('revalidatePath', async ({ page, serverComponents }) => {
    // in case there is retry or some other test did hit that path before
    // we want to make sure that cdn cache is not warmed up
    const purgeCdnCache = await page.goto(
      new URL('/api/purge-cdn?path=/static-fetch/1', serverComponents.url).href,
    )
    expect(purgeCdnCache?.status()).toBe(200)

    const response1 = await page.goto(new URL('static-fetch/1', serverComponents.url).href)
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
    expect(headers1['netlify-cdn-cache-control']).toBe(
      's-maxage=31536000, stale-while-revalidate=31536000',
    )

    const date1 = await page.textContent('[data-testid="date-now"]')

    const h1 = await page.textContent('h1')
    expect(h1).toBe('Hello, Statically fetched show 1')

    const response2 = await page.goto(new URL('static-fetch/1', serverComponents.url).href)
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

    const revalidate = await page.goto(
      new URL('/api/on-demand-revalidate/path', serverComponents.url).href,
    )
    expect(revalidate?.status()).toBe(200)

    // now after the revalidation it should have a different date
    const response3 = await page.goto(new URL('static-fetch/1', serverComponents.url).href)
    const headers3 = response3?.headers() || {}
    expect(response3?.status()).toBe(200)
    expect(headers3?.['x-nextjs-cache']).toBeUndefined()
    // revalidatePath just marks the page(s) as invalid and does NOT
    // automatically refreshes the cache. This request will cause
    // Next.js cache miss and new response will be generated and cached
    // Depending if we hit same CDN node as previous request, we might
    // get either fwd=miss or fwd=stale
    expect(headers3['cache-status']).toMatch(/"Next.js"; fwd=miss/m)
    expect(headers3['cache-status']).toMatch(/"Netlify Edge"; fwd=(miss|stale)/m)
    expect(headers3['netlify-cdn-cache-control']).toBe(
      's-maxage=31536000, stale-while-revalidate=31536000',
    )

    // the page has now an updated date
    const date3 = await page.textContent('[data-testid="date-now"]')
    expect(date3).not.toBe(date2)

    const response4 = await page.goto(new URL('static-fetch/1', serverComponents.url).href)
    const headers4 = response4?.headers() || {}
    expect(response4?.status()).toBe(200)
    expect(headers4?.['x-nextjs-cache']).toBeUndefined()
    // we are hitting the same page again and we most likely will see
    // CDN hit (in this case Next reported cache status is omitted
    // as it didn't actually take place in handling this request)
    // or we will see CDN miss because different CDN node handled request
    expect(headers4['cache-status']).toMatch(/"Netlify Edge"; (hit|fwd=miss|fwd=stale)/m)
    if (!headers4['cache-status'].includes('hit')) {
      // if we missed CDN cache, we will see Next cache hit status
      // as we reuse cached response
      expect(headers4['cache-status']).toMatch(/"Next.js"; hit/m)
    }
    expect(headers4['netlify-cdn-cache-control']).toBe(
      's-maxage=31536000, stale-while-revalidate=31536000',
    )

    // the page is cached
    const date4 = await page.textContent('[data-testid="date-now"]')
    expect(date4).toBe(date3)
  })

  test('revalidateTag', async ({ page, serverComponents }) => {
    // in case there is retry or some other test did hit that path before
    // we want to make sure that cdn cache is not warmed up
    const purgeCdnCache = await page.goto(
      new URL('/api/purge-cdn?path=/static-fetch-1', serverComponents.url).href,
    )
    expect(purgeCdnCache?.status()).toBe(200)

    const response1 = await page.goto(new URL('static-fetch-1', serverComponents.url).href)
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
    expect(headers1['netlify-cdn-cache-control']).toBe(
      's-maxage=31536000, stale-while-revalidate=31536000',
    )

    const date1 = await page.textContent('[data-testid="date-now"]')

    const h1 = await page.textContent('h1')
    expect(h1).toBe('Hello, Static Fetch 1')

    const response2 = await page.goto(new URL('static-fetch-1', serverComponents.url).href)
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

    const revalidate = await page.goto(
      new URL('/api/on-demand-revalidate/tag', serverComponents.url).href,
    )
    expect(revalidate?.status()).toBe(200)

    // now after the revalidation it should have a different date
    const response3 = await page.goto(new URL('static-fetch-1', serverComponents.url).href)
    const headers3 = response3?.headers() || {}
    expect(response3?.status()).toBe(200)
    expect(headers3?.['x-nextjs-cache']).toBeUndefined()
    // revalidateTag just marks the page(s) as invalid and does NOT
    // automatically refreshes the cache. This request will cause
    // Next.js cache miss and new response will be generated and cached
    // Depending if we hit same CDN node as previous request, we might
    // get either fwd=miss or fwd=stale
    expect(headers3['cache-status']).toMatch(/"Next.js"; fwd=miss/m)
    expect(headers3['cache-status']).toMatch(/"Netlify Edge"; fwd=(miss|stale)/m)
    expect(headers3['netlify-cdn-cache-control']).toBe(
      's-maxage=31536000, stale-while-revalidate=31536000',
    )

    // the page has now an updated date
    const date3 = await page.textContent('[data-testid="date-now"]')
    expect(date3).not.toBe(date2)

    const response4 = await page.goto(new URL('static-fetch-1', serverComponents.url).href)
    const headers4 = response4?.headers() || {}
    expect(response4?.status()).toBe(200)
    expect(headers4?.['x-nextjs-cache']).toBeUndefined()
    // we are hitting the same page again and we most likely will see
    // CDN hit (in this case Next reported cache status is omitted
    // as it didn't actually take place in handling this request)
    // or we will see CDN miss because different CDN node handled request
    expect(headers4['cache-status']).toMatch(/"Netlify Edge"; (hit|fwd=miss|fwd=stale)/m)
    if (!headers4['cache-status'].includes('hit')) {
      // if we missed CDN cache, we will see Next cache hit status
      // as we reuse cached response
      expect(headers4['cache-status']).toMatch(/"Next.js"; hit/m)
    }
    expect(headers4['netlify-cdn-cache-control']).toBe(
      's-maxage=31536000, stale-while-revalidate=31536000',
    )

    // the page is cached
    const date4 = await page.textContent('[data-testid="date-now"]')
    expect(date4).toBe(date3)
  })
})
