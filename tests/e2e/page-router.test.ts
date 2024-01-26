import { expect, test } from '@playwright/test'
import { createE2EFixture } from '../utils/create-e2e-fixture.js'

let ctx: Awaited<ReturnType<typeof createE2EFixture>>

test.beforeAll(async () => {
  ctx = await createE2EFixture('page-router')
})

test.afterAll(async ({}, testInfo) => {
  await ctx?.cleanup?.(!!testInfo.errors.length)
})

test('Static revalidate works correctly', async ({ page }) => {
  // this disables browser cache - otherwise If-None-Match header
  // is added to repeat requests which result in actual 304 response
  // with custom headers from function not being returned
  // additionally Playwright wrongly report 304 as 200
  // https://github.com/microsoft/playwright/issues/27573
  // which makes the assertions confusing
  // see https://playwright.dev/docs/api/class-browsercontext#browser-context-route
  // > Enabling routing disables http cache.
  // and https://stackoverflow.com/questions/68522170/playwright-disable-caching-of-webpage-so-i-can-fetch-new-elements-after-scrollin
  // note - this is likely the same problem that cause assertions at the bottom to be commented out
  // generally we shouldn't do that
  page.route('**', (route) => route.continue())

  const response1 = await page.goto(new URL('static/revalidate-manual', ctx.url).href)
  const headers1 = response1?.headers() || {}
  expect(response1?.status()).toBe(200)
  expect(headers1['x-nextjs-cache']).toBeUndefined()
  // first time hitting this route - we will invoke function and see
  // Next cache hit status in the response because it was prerendered
  // at build time
  expect(headers1['cache-status']).toMatch(/"Netlify Edge"; fwd=miss/m)
  expect(headers1['cache-status']).toMatch(/"Next.js"; hit/m)

  const date1 = await page.textContent('[data-testid="date-now"]')
  const h1 = await page.textContent('h1')
  expect(h1).toBe('Show #71')

  const response2 = await page.goto(new URL('static/revalidate-manual', ctx.url).href)
  const headers2 = response2?.headers() || {}
  expect(response2?.status()).toBe(200)
  expect(headers2['x-nextjs-cache']).toBeUndefined()
  // On CDN hit, Next cache status is not added to response anymore
  // (any cache-status set by functions is not added - this is a platform behavior
  // not runtime behavior)
  expect(headers2['cache-status']).toMatch(/"Netlify Edge"; hit/m)

  // the page is cached
  const date2 = await page.textContent('[data-testid="date-now"]')
  expect(date2).toBe(date1)

  const revalidate = await page.goto(new URL('/api/revalidate', ctx.url).href)
  expect(revalidate?.status()).toBe(200)

  // wait a bit until the page got regenerated
  await page.waitForTimeout(100)

  // now after the revalidation it should have a different date
  const response3 = await page.goto(new URL('static/revalidate-manual', ctx.url).href)
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
  // TODO: Cache purge is currently not working as expected
  // @Rob is working on it
  // const date3 = await page.textContent('[data-testid="date-now"]')
  // expect(date3).not.toBe(date2)
})

test('requesting a non existing page route that needs to be fetched from the blob store like 404.html', async ({
  page,
}) => {
  const response = await page.goto(new URL('non-exisitng', ctx.url).href)
  expect(response?.status()).toBe(404)

  expect(await page.textContent('h1')).toBe('404')
})

test('requesting a page with a very long name works', async ({ page }) => {
  const response = await page.goto(
    new URL(
      '/products/an-incredibly-long-product-name-thats-impressively-repetetively-needlessly-overdimensioned-and-should-be-shortened-to-less-than-255-characters-for-the-sake-of-seo-and-ux-and-first-and-foremost-for-gods-sake-but-nobody-wont-ever-read-this-anyway',
      ctx.url,
    ).href,
  )
  expect(response?.status()).toBe(200)
})
