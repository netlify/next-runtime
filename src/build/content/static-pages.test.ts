import { expect, test, vi, afterEach } from 'vitest'
import { join } from 'node:path'
import { BUILD_DIR } from '../constants.js'
import { copyStaticContent } from './static.js'
import { createFsFixture, FixtureTestContext } from '../../../tests/utils/fixture.js'
import { globby } from 'globby'

// Globby wasn't easy to mock so instead we're using a temporary
// directory and the actual file system to test static pages

afterEach(() => {
  vi.restoreAllMocks()
})

test<FixtureTestContext>('should copy the static pages to the publish directory if they have no corresponding JSON files', async (ctx) => {
  const { cwd } = await createFsFixture(
    {
      [`${BUILD_DIR}/.next/static/test.js`]: '',
      [`${BUILD_DIR}/.next/server/pages/test.html`]: '',
      [`${BUILD_DIR}/.next/server/pages/test2.html`]: '',
    },
    ctx,
  )

  const PUBLISH_DIR = join(cwd, 'publish')
  await copyStaticContent({ PUBLISH_DIR })

  const files = await globby('**/*', { cwd, extglob: true })

  expect(files).toEqual(
    expect.arrayContaining([
      'publish/_next/static/test.js',
      'publish/test.html',
      'publish/test2.html',
    ]),
  )
})

test<FixtureTestContext>('should not copy the static pages to the publish directory if they have corresponding JSON files', async (ctx) => {
  const { cwd } = await createFsFixture(
    {
      [`${BUILD_DIR}/.next/static/test.js`]: '',
      [`${BUILD_DIR}/.next/server/pages/test.html`]: '',
      [`${BUILD_DIR}/.next/server/pages/test.json`]: '',
      [`${BUILD_DIR}/.next/server/pages/test2.html`]: '',
      [`${BUILD_DIR}/.next/server/pages/test2.json`]: '',
    },
    ctx,
  )

  const PUBLISH_DIR = join(cwd, 'publish')
  await copyStaticContent({ PUBLISH_DIR })

  const files = await globby('**/*', { cwd, extglob: true })

  expect(files).toEqual(expect.arrayContaining(['publish/_next/static/test.js']))
})
