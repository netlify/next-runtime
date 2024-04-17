import { expect } from '@playwright/test'
import { test } from '../utils/playwright-helpers.js'

// those tests have different fixtures and can run in parallel
test.describe.configure({ mode: 'parallel' })

test.describe('[Yarn] Package manager', () => {
  test.describe('simple app', () => {
    test('Renders the Home page correctly', async ({ page, yarn }) => {
      await page.goto(yarn.url)

      await expect(page).toHaveTitle('Simple Next App')

      const h1 = page.locator('h1')
      await expect(h1).toHaveText('Home')
    })
  })
})

test.describe('[PNPM] Package manager', () => {
  test.describe('pnpm', () => {
    test('Renders the Home page correctly', async ({ page, pnpm }) => {
      await page.goto(pnpm.url)

      await expect(page).toHaveTitle('Simple Next App')

      const h1 = page.locator('h1')
      await expect(h1).toHaveText('Home')
    })
  })
})
test.describe('[Bun] Package manager', () => {
  test.describe('simple app', () => {
    test('Renders the Home page correctly', async ({ page, bun }) => {
      await page.goto(bun.url)

      await expect(page).toHaveTitle('Simple Next App')

      const h1 = page.locator('h1')
      await expect(h1).toHaveText('Home')
    })
  })
})
