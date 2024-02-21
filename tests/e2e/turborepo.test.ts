import { expect } from '@playwright/test'
import { test } from '../utils/create-e2e-fixture.js'

// those tests have different fixtures and can run in parallel
test.describe.configure({ mode: 'parallel' })

test.describe('[PNPM] Package manager', () => {
  test('Static revalidate works correctly', async ({ page, turborepo }) => {
    // in case there is retry or some other test did hit that path before
    // we want to make sure that cdn cache is not warmed up
    const purgeCdnCache = await page.goto(
      new URL('/api/purge-cdn?path=/static/revalidate-manual', turborepo.url).href,
    )
    expect(purgeCdnCache?.status()).toBe(200)

    const response1 = await page.goto(new URL('static/revalidate-manual', turborepo.url).href)
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
    expect(h1).toBe('Show #71')

    const response2 = await page.goto(new URL('static/revalidate-manual', turborepo.url).href)
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

    const revalidate = await page.goto(new URL('/api/revalidate', turborepo.url).href)
    expect(revalidate?.status()).toBe(200)

    // wait a bit until the page got regenerated
    await page.waitForTimeout(1000)

    // now after the revalidation it should have a different date
    const response3 = await page.goto(new URL('static/revalidate-manual', turborepo.url).href)
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
  })
})

test.describe('[NPM] Package manager', () => {
  test('Static revalidate works correctly', async ({ page, turborepoNPM }) => {
    // in case there is retry or some other test did hit that path before
    // we want to make sure that cdn cache is not warmed up
    const purgeCdnCache = await page.goto(
      new URL('/api/purge-cdn?path=/static/revalidate-manual', turborepoNPM.url).href,
    )
    expect(purgeCdnCache?.status()).toBe(200)

    const response1 = await page.goto(new URL('static/revalidate-manual', turborepoNPM.url).href)
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
    expect(h1).toBe('Show #71')

    const response2 = await page.goto(new URL('static/revalidate-manual', turborepoNPM.url).href)
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

    const revalidate = await page.goto(new URL('/api/revalidate', turborepoNPM.url).href)
    expect(revalidate?.status()).toBe(200)

    // wait a bit until the page got regenerated
    await page.waitForTimeout(1000)

    // now after the revalidation it should have a different date
    const response3 = await page.goto(new URL('static/revalidate-manual', turborepoNPM.url).href)
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
  })
})