import { expect } from '@playwright/test'
import { test } from '../utils/create-e2e-fixture.js'

test('Renders the Home page correctly', async ({ page, nxIntegrated }) => {
  await page.goto(nxIntegrated.url)

  await expect(page).toHaveTitle('Welcome to next-app')

  const h1 = page.locator('h1')
  await expect(h1).toHaveText('Hello there,\nWelcome next-app 👋')
})
