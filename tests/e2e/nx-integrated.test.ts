import { expect, type Locator } from '@playwright/test'
import { test } from '../utils/playwright-helpers.js'

const expectImageWasLoaded = async (locator: Locator) => {
  expect(await locator.evaluate((img: HTMLImageElement) => img.naturalHeight)).toBeGreaterThan(0)
}

test('Renders the Home page correctly', async ({ page, nxIntegrated }) => {
  await page.goto(nxIntegrated.url)

  await expect(page).toHaveTitle('Welcome to next-app')

  const h1 = page.locator('h1')
  await expect(h1).toHaveText('Hello there,\nWelcome next-app 👋')

  // test additional netlify.toml settings
  await page.goto(`${nxIntegrated.url}/api/static`)
  const body = (await page.$('body').then((el) => el?.textContent())) || '{}'
  expect(body).toBe('{"words":"hello world"}')
})

test('Renders the Home page correctly with distDir', async ({ page, nxIntegratedDistDir }) => {
  await page.goto(nxIntegratedDistDir.url)

  await expect(page).toHaveTitle('Simple Next App')

  const h1 = page.locator('h1')
  await expect(h1).toHaveText('Home')

  await expectImageWasLoaded(page.locator('img'))
})
