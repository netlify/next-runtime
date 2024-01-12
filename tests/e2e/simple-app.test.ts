import { type Locator, expect, test } from '@playwright/test'
import { createE2EFixture } from '../utils/create-e2e-fixture.js'

let ctx: Awaited<ReturnType<typeof createE2EFixture>>

test.beforeAll(async () => {
  ctx = await createE2EFixture('simple-next-app')
})

test.afterAll(async ({}, testInfo) => {
  await ctx?.cleanup?.(!!testInfo.errors.length)
})

const expectImageWasLoaded = async (locator: Locator) => {
  expect(await locator.evaluate((img: HTMLImageElement) => img.naturalHeight)).toBeGreaterThan(0)
}

test('Renders the Home page correctly', async ({ page }) => {
  await page.goto(ctx.url)

  await expect(page).toHaveTitle('Simple Next App')

  const h1 = page.locator('h1')
  await expect(h1).toHaveText('Home')

  await expectImageWasLoaded(page.locator('img'))
})

test('Serves a static image correctly', async ({ page }) => {
  const response = await page.goto(`${ctx.url}/next.svg`)

  expect(response?.status()).toBe(200)
  expect(response?.headers()['content-type']).toBe('image/svg+xml')
})

test('Redirects correctly', async ({ page }) => {
  await page.goto(`${ctx.url}/redirect/response`)
  await expect(page).toHaveURL(`https://www.netlify.com/`)

  await page.goto(`${ctx.url}/redirect`)
  await expect(page).toHaveURL(`https://www.netlify.com/`)
})

test('next/image is using Netlify Image CDN', async ({ page }) => {
  const nextImageResponsePromise = page.waitForResponse('**/_next/image**')

  await page.goto(`${ctx.url}/image`)

  const nextImageResponse = await nextImageResponsePromise
  expect(nextImageResponse.request().url()).toContain('_next/image?url=%2Fsquirrel.jpg')
  // ensure next/image is using Image CDN
  // source image is jpg, but when requesting it through Image CDN avif will be returned
  await expect(await nextImageResponse.headerValue('content-type')).toEqual('image/avif')

  await expectImageWasLoaded(page.locator('img'))
})
