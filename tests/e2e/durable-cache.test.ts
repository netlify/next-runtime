import { expect } from '@playwright/test'
import { test } from '../utils/playwright-helpers.js'

// This fixture is deployed to a separate site with the feature flag enabled
test('sets cache-control `durable` directive when feature flag is enabled', async ({
  page,
  durableCache,
}) => {
  const response = await page.goto(durableCache.url)
  const headers = response?.headers() || {}

  const h1 = page.locator('h1')
  await expect(h1).toHaveText('Home')

  expect(headers['netlify-cdn-cache-control']).toBe(
    's-maxage=31536000, stale-while-revalidate=31536000, durable',
  )
  expect(headers['cache-control']).toBe('public,max-age=0,must-revalidate')
})
