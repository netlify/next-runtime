import { expect } from '@playwright/test'
import { test } from '../utils/playwright-helpers.js'

test('should serve 404 page when requesting non existing page (no matching route) if site is deployed with CLI not supporting regional blobs', async ({
  page,
  cliBeforeRegionalBlobsSupport,
}) => {
  // 404 page is built and uploaded to blobs at build time
  // when Next.js serves 404 it will try to fetch it from the blob store
  // if request handler function is unable to get from blob store it will
  // fail request handling and serve 500 error.
  // This implicitly tests that request handler function is able to read blobs
  // that are uploaded as part of site deploy.

  const response = await page.goto(new URL('non-existing', cliBeforeRegionalBlobsSupport.url).href)
  const headers = response?.headers() || {}
  expect(response?.status()).toBe(404)

  expect(await page.textContent('h1')).toBe('404')

  expect(headers['netlify-cdn-cache-control']).toBe(
    'no-cache, no-store, max-age=0, must-revalidate, durable',
  )
  expect(headers['cache-control']).toBe('no-cache,no-store,max-age=0,must-revalidate')
})
