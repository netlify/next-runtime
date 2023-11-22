import { test, expect } from '@playwright/test'
import { createE2EFixture } from '../utils/create-e2e-fixture.js'

let ctx: Awaited<ReturnType<typeof createE2EFixture>>

test.describe('page-router', () => {
  test.beforeAll(async () => {
    ctx = await createE2EFixture('page-router')
  })

  test.afterAll(async ({}, testInfo) => {
    await ctx?.cleanup?.(!!testInfo.errors.length)
  })

  // The cache purge does not work :(
  test.skip('Static revalidate works correctly', async ({ page }) => {
    const response1 = await page.goto(new URL('static/revalidate-manual', ctx.url).href)
    const headers1 = response1?.headers() || {}
    expect(response1?.status()).toBe(200)
    expect(headers1['x-nextjs-cache']).toBe('HIT')

    const date1 = await page.textContent('[data-testid="date-now"]')
    const h1 = await page.textContent('h1')
    expect(h1).toBe('Show #71')

    const response2 = await page.goto(new URL('static/revalidate-manual', ctx.url).href)
    const headers2 = response2?.headers() || {}
    expect(response2?.status()).toBe(200)
    expect(headers2['x-nextjs-cache']).toBe('HIT')

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
    expect(headers3['x-nextjs-cache']).toBe('HIT')

    // the page has now an updated date
    const date3 = await page.textContent('[data-testid="date-now"]')
    expect(date3).not.toBe(date2)
  })

  // Only works locally with the patched CLI that have blob support enable once this is released
  test.skip('requesting a non existing page route that needs to be fetched from the blob store like 404.html', async ({
    page,
  }) => {
    const response = await page.goto(new URL('non-exisitng', ctx.url).href)
    const headers = response?.headers() || {}
    expect(response?.status()).toBe(404)

    expect(await page.textContent('h1')).toBe('404')
  })
})
