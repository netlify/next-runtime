import { expect } from '@playwright/test'
import { test } from '../utils/create-e2e-fixture.js'

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

test('Supports CJS dependencies in Edge Middleware', async ({ page, middleware }) => {
  const res = await page.goto(`${middleware.url}/test/next`)

  expect(await res?.headerValue('x-cjs-module-works')).toEqual("true")
})
