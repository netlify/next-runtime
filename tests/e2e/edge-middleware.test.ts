import { expect } from '@playwright/test'
import { test } from '../utils/create-e2e-fixture.js'
import { getImageSize } from 'next/dist/server/image-optimizer.js'

test('Runs edge middleware', async ({ page, middleware }) => {
  await page.goto(`${middleware.url}/test/redirect`)

  await expect(page).toHaveTitle('Simple Next App')

  const h1 = page.locator('h1')
  await expect(h1).toHaveText('Other')
})

test('Does not run edge middleware at the origin', async ({ page, middleware }) => {
  const res = await page.goto(`${middleware.url}/test/next`)

  expect(await res?.headerValue('x-deno')).toBeTruthy()
  expect(await res?.headerValue('x-node')).toBeNull()

  await expect(page).toHaveTitle('Simple Next App')

  const h1 = page.locator('h1')
  await expect(h1).toHaveText('Message from middleware: hello')
})

test('does not run middleware again for rewrite target', async ({ page, middleware }) => {
  const direct = await page.goto(`${middleware.url}/test/rewrite-target`)
  expect(await direct?.headerValue('x-added-rewrite-target')).toBeTruthy()

  const rewritten = await page.goto(`${middleware.url}/test/rewrite-loop-detect`)

  expect(await rewritten?.headerValue('x-added-rewrite-target')).toBeNull()
  const h1 = page.locator('h1')
  await expect(h1).toHaveText('Hello rewrite')
})

test('Supports CJS dependencies in Edge Middleware', async ({ page, middleware }) => {
  const res = await page.goto(`${middleware.url}/test/next`)

  expect(await res?.headerValue('x-cjs-module-works')).toEqual('true')
})

// adaptation of https://github.com/vercel/next.js/blob/8aa9a52c36f338320d55bd2ec292ffb0b8c7cb35/test/e2e/app-dir/metadata-edge/index.test.ts#L24C5-L31C7
test('it should render OpenGraph image meta tag correctly', async ({ page, middleware }) => {
  await page.goto(`${middleware.url}/`)
  const ogURL = await page.locator('meta[property="og:image"]').getAttribute('content')
  expect(ogURL).toBeTruthy()
  const ogResponse = await fetch(new URL(new URL(ogURL!).pathname, middleware.url))
  const imageBuffer = await ogResponse.arrayBuffer()
  const size = await getImageSize(Buffer.from(imageBuffer), 'png')
  expect([size.width, size.height]).toEqual([1200, 630])
})
