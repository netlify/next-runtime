import { test, expect } from '@playwright/test'
import { createE2EFixture } from '../utils/create-e2e-fixture.js'

let ctx: Awaited<ReturnType<typeof createE2EFixture>>

test.describe('simple-next-app', () => {
  test.beforeAll(async () => {
    ctx = await createE2EFixture('simple-next-app')
  })

  test.afterAll(async () => {
    await ctx?.cleanup?.()
  })

  test('Renders the Home page correctly', async ({ page }) => {
    await page.goto(ctx.url)

    await expect(page).toHaveTitle('Simple Next App')

    const h1 = await page.locator('h1')
    await expect(h1).toHaveText('Home')
  })
})
