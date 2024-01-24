import { test, expect } from '@playwright/test'
import { createE2EFixture } from '../utils/create-e2e-fixture.js'

let ctx: Awaited<ReturnType<typeof createE2EFixture>>

// those tests have different fixtures and can run in parallel
test.describe.configure({ mode: 'parallel' })

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    const screenshotPath = testInfo.outputPath(`failure.png`)
    // Add it to the report to see the failure immediately
    testInfo.attachments.push({
      name: 'failure',
      path: screenshotPath,
      contentType: 'image/png',
    })
    await page.screenshot({ path: screenshotPath, timeout: 5000 })
  }
})

test.describe('[Yarn] Package manager', () => {
  test.describe('simple-next-app', () => {
    test.beforeAll(async () => {
      ctx = await createE2EFixture('simple-next-app', { packageManger: 'yarn' })
    })

    test.afterAll(async ({}, testInfo) => {
      await ctx?.cleanup?.(!!testInfo.errors.length)
    })

    test('Renders the Home page correctly', async ({ page }) => {
      await page.goto(ctx.url)

      await expect(page).toHaveTitle('Simple Next App')

      const h1 = page.locator('h1')
      await expect(h1).toHaveText('Home')
    })
  })
})

test.describe('[PNPM] Package manager', () => {
  test.describe('simple-next-app-pnpm', () => {
    test.beforeAll(async () => {
      ctx = await createE2EFixture('simple-next-app-pnpm', { packageManger: 'pnpm' })
    })

    test.afterAll(async ({}, testInfo) => {
      await ctx?.cleanup?.(!!testInfo.errors.length)
    })

    test('Renders the Home page correctly', async ({ page }) => {
      await page.goto(ctx.url)

      await expect(page).toHaveTitle('Simple Next App')

      const h1 = page.locator('h1')
      await expect(h1).toHaveText('Home')
    })
  })
})
test.describe('[Bun] Package manager', () => {
  test.describe('simple-next-app', () => {
    test.beforeAll(async () => {
      ctx = await createE2EFixture('simple-next-app', { packageManger: 'bun' })
    })

    test.afterAll(async ({}, testInfo) => {
      await ctx?.cleanup?.(!!testInfo.errors.length)
    })

    test('Renders the Home page correctly', async ({ page }) => {
      await page.goto(ctx.url)

      await expect(page).toHaveTitle('Simple Next App')

      const h1 = page.locator('h1')
      await expect(h1).toHaveText('Home')
    })
  })
})
