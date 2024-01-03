import { expect, test } from '@playwright/test'
import { createE2EFixture } from '../utils/create-e2e-fixture.js'

let ctx: Awaited<ReturnType<typeof createE2EFixture>>

test.beforeAll(async () => {
  ctx = await createE2EFixture('middleware')
})

test.afterAll(async ({}, testInfo) => {
  await ctx?.cleanup?.(!!testInfo.errors.length)
})

test('Runs edge middleware', async ({ page }) => {
  await page.goto(`${ctx.url}/test/redirect`)

  await expect(page).toHaveTitle('Simple Next App')

  const h1 = page.locator('h1')
  await expect(h1).toHaveText('Other')
})