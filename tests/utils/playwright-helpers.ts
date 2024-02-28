import { test as base, PlaywrightWorkerArgs, WorkerFixture } from '@playwright/test'
import { Fixture, fixtureFactories } from './create-e2e-fixture'

const makeE2EFixture = (
  createFixture: () => Promise<Fixture>,
): [WorkerFixture<Fixture, PlaywrightWorkerArgs>, { scope: 'worker' }] => [
  async ({}, use) => {
    const fixture = await createFixture()
    await use(fixture)
    await fixture.cleanup() // TODO: replace false with info about test results
  },
  { scope: 'worker' },
]

export const test = base.extend<
  { takeScreenshot: void },
  {
    [Property in keyof typeof fixtureFactories]: Fixture
  }
>({
  ...Object.fromEntries(
    Object.entries(fixtureFactories).map(([key, f]) => [key, makeE2EFixture(f)]),
  ),
  takeScreenshot: [
    async ({ page }, use, testInfo) => {
      await use()

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
    },
    { auto: true },
  ],
})
