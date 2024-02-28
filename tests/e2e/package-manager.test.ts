import { expect } from '@playwright/test'
import { test } from '../utils/playwright-helpers.js'

// those tests have different fixtures and can run in parallel
test.describe.configure({ mode: 'parallel' })

test.describe('[Yarn] Package manager', () => {
  test.describe('simple-next-app', () => {
    test('Renders the Home page correctly', async ({ page, simpleNextAppYarn }) => {
      await page.goto(simpleNextAppYarn.url)

      await expect(page).toHaveTitle('Simple Next App')

      const h1 = page.locator('h1')
      await expect(h1).toHaveText('Home')
    })
  })
})

test.describe('[PNPM] Package manager', () => {
  test.describe('simple-next-app-pnpm', () => {
    test('Renders the Home page correctly', async ({ page, simpleNextAppPNPM }) => {
      await page.goto(simpleNextAppPNPM.url)

      await expect(page).toHaveTitle('Simple Next App')

      const h1 = page.locator('h1')
      await expect(h1).toHaveText('Home')
    })
  })
})
test.describe('[Bun] Package manager', () => {
  test.describe('simple-next-app', () => {
    test('Renders the Home page correctly', async ({ page, simpleNextAppBun }) => {
      await page.goto(simpleNextAppBun.url)

      await expect(page).toHaveTitle('Simple Next App')

      const h1 = page.locator('h1')
      await expect(h1).toHaveText('Home')
    })
  })
})
