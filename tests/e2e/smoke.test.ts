import { Page, expect } from '@playwright/test'
import { test, Fixture } from '../utils/create-e2e-fixture.js'

// those tests have different fixtures and can run in parallel
test.describe.configure({ mode: 'parallel' })

async function smokeTest(page: Page, fixture: Fixture) {
  const response = await page.goto(fixture.url)

  expect(response?.status()).toBe(200)

  const smokeContent = await page.textContent('[data-testid="smoke"]')
  await expect(smokeContent).toBe('SSR: yes')
}

test('yarn@3 monorepo with pnpm linker', async ({ page, yarnMonorepoWithPnpmLinker }) => {
  await smokeTest(page, yarnMonorepoWithPnpmLinker)
})
