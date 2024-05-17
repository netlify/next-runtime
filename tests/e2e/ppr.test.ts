import { expect } from '@playwright/test'
import { test } from '../utils/playwright-helpers.js'

test('Fetches resumable PPR content on load', async ({ page, ppr }) => {
  await page.goto(ppr.url)

  const body = page.locator('body')
  await expect(body).toContainText('Partial Prerendering')
  await expect(body).toContainText('Recommended Products for You')
})
