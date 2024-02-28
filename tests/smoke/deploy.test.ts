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
