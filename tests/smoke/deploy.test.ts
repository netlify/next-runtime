import { expect, test } from 'vitest'
import { Fixture, fixtureFactories } from '../utils/create-e2e-fixture'

async function smokeTest(createFixture: () => Promise<Fixture>) {
  const fixture = await createFixture()
  const response = await fetch(fixture.url)
  expect(response.status).toBe(200)

  // remove comments that React injects into produced html
  const body = (await response.text()).replace(/<!--.+-->/g, '')
  await expect(body).toContain('SSR: yes')
}

test('yarn@3 monorepo with pnpm linker', async () => {
  await smokeTest(fixtureFactories.yarnMonorepoWithPnpmLinker)
})

test('npm monorepo deploying from site directory without --filter', async () => {
  await smokeTest(fixtureFactories.npmMonorepoEmptyBaseNoPackagePath)
})

test(
  'npm monorepo creating site workspace as part of build step (no packagePath set) should not deploy',
  { retry: 0 },
  async () => {
    const deployPromise = fixtureFactories.npmMonorepoSiteCreatedAtBuild()

    await expect(deployPromise).rejects.toThrow(
      /Failed creating server handler. BUILD_ID file not found at expected location/,
    )
    await expect(deployPromise).rejects.toThrow(
      /It looks like your site is part of monorepo and Netlify is currently not configured correctly for this case/,
    )
    await expect(deployPromise).rejects.toThrow(/Current package path: <not set>/)
    await expect(deployPromise).rejects.toThrow(/Package path candidates/)
    await expect(deployPromise).rejects.toThrow(/- "apps\/site"/)
    await expect(deployPromise).rejects.toThrow(
      new RegExp('https://docs.netlify.com/configure-builds/monorepos/'),
    )
  },
)
