import { expect } from '@playwright/test'
import { test } from '../utils/playwright-helpers.js'

test('Renders the Home page correctly', async ({ page, withIntegrations }) => {
  await page.goto(withIntegrations.url)

  expect(page.locator('body')).toHaveText('Hello World')
})

test.describe('Should clear stale functions produced by previous builds by @netlify/plugin-nextjs', () => {
  test('Serverless functions', async ({ page, withIntegrations }) => {
    const response1 = await page.goto(new URL('/test/serverless/v4', withIntegrations.url).href)
    expect(response1?.status()).toBe(404)

    const response2 = await page.goto(new URL('/test/serverless/v5', withIntegrations.url).href)
    expect(response2?.status()).toBe(404)
  })

  test('Edge functions', async ({ page, withIntegrations }) => {
    const response1 = await page.goto(new URL('/test/edge/v4', withIntegrations.url).href)
    expect(response1?.status()).toBe(404)

    const response2 = await page.goto(new URL('/test/edge/v5', withIntegrations.url).href)
    expect(response2?.status()).toBe(404)
  })
})

test.describe('Should keep functions produced by other build plugins', () => {
  test('Serverless functions', async ({ page, withIntegrations }) => {
    const response1 = await page.goto(
      new URL('/test/serverless/integration-with-json-config', withIntegrations.url).href,
    )
    expect(response1?.status()).toBe(200)
    expect(await response1?.text()).toBe('Hello from /test/serverless/integration-with-json-config')

    const response2 = await page.goto(
      new URL('/test/serverless/integration-with-json-config', withIntegrations.url).href,
    )
    expect(response2?.status()).toBe(200)
    expect(await response2?.text()).toBe('Hello from /test/serverless/integration-with-json-config')
  })

  test('Edge functions', async ({ page, withIntegrations }) => {
    const response1 = await page.goto(
      new URL('/test/edge/integration-in-manifest', withIntegrations.url).href,
    )
    expect(response1?.status()).toBe(200)
    expect(await response1?.text()).toBe('Hello from /test/edge/integration-in-manifest')

    const response2 = await page.goto(
      new URL('/test/edge/integration-not-in-manifest', withIntegrations.url).href,
    )
    expect(response2?.status()).toBe(200)
    expect(await response2?.text()).toBe('Hello from /test/edge/integration-not-in-manifest')
  })
})
