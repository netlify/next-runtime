import { test, expect } from '@playwright/test'
import { createE2EFixture } from '../utils/create-e2e-fixture.js'

let ctx: Awaited<ReturnType<typeof createE2EFixture>>

test.describe('page-router', () => {
  test.beforeAll(async () => {
    ctx = await createE2EFixture('page-router')
  })

  test.afterAll(async () => {
    await ctx?.cleanup?.()
  })

  // NOT working yet as blob storage upload ins not working with the CLI
  test.skip('Static revalidate works correctly', async ({ page }) => {
    const response1 = await page.goto(new URL('static/revalidate', ctx.url).href)
    const headers1 = response1?.headers() || {}
    expect(response1?.status()).toBe(200)
    expect(headers1['x-nextjs-cache']).toBe('HIT')
    expect(headers1['netlify-cdn-cache-control']).toBe('s-maxage=3, stale-while-revalidate')

    const h1 = await page.textContent('h1')
    expect(h1).toBe('Show #71')

    const date1 = await page.textContent('[data-testid="date-now"]')

    // wait to have a stale page
    page.waitForTimeout(3_000)

    const response2 = await page.goto(new URL('static/revalidate', ctx.url).href)
    const headers2 = response1?.headers() || {}
    expect(response2?.status()).toBe(200)
    expect(response1?.status()).toBe(200)
    expect(headers2['x-nextjs-cache']).toBe('MISS')

    const date2 = await page.textContent('[data-testid="date-now"]')

    expect(date1).not.toBe(date2)
  })
})
