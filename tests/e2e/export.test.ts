import { expect, type Locator } from '@playwright/test'
import { nextVersionSatisfies } from '../utils/next-version-helpers.mjs'
import { test } from '../utils/playwright-helpers.js'

const expectImageWasLoaded = async (locator: Locator) => {
  expect(await locator.evaluate((img: HTMLImageElement) => img.naturalHeight)).toBeGreaterThan(0)
}
test('Renders the Home page correctly with output export', async ({ page, outputExport }) => {
  const response = await page.goto(outputExport.url)
  const headers = response?.headers() || {}

  await expect(page).toHaveTitle('Simple Next App')

  expect(headers['cache-status']).toBe('"Netlify Edge"; fwd=miss')

  const h1 = page.locator('h1')
  await expect(h1).toHaveText('Home')

  await expectImageWasLoaded(page.locator('img'))
})

test('Renders the Home page correctly with output export and publish set to out', async ({
  page,
  ouputExportPublishOut,
}) => {
  const response = await page.goto(ouputExportPublishOut.url)
  const headers = response?.headers() || {}

  await expect(page).toHaveTitle('Simple Next App')

  expect(headers['cache-status']).toBe('"Netlify Edge"; fwd=miss')

  const h1 = page.locator('h1')
  await expect(h1).toHaveText('Home')

  await expectImageWasLoaded(page.locator('img'))
})

test('Renders the Home page correctly with output export and custom dist dir', async ({
  page,
  outputExportCustomDist,
}) => {
  const response = await page.goto(outputExportCustomDist.url)
  const headers = response?.headers() || {}

  await expect(page).toHaveTitle('Simple Next App')

  expect(headers['cache-status']).toBe('"Netlify Edge"; fwd=miss')

  const h1 = page.locator('h1')
  await expect(h1).toHaveText('Home')

  await expectImageWasLoaded(page.locator('img'))
})
