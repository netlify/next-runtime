import { expect, test, vi, afterEach, beforeEach } from 'vitest'
import { join } from 'node:path'
import { BUILD_DIR } from '../constants.js'
import { copyStaticContent } from './static.js'
import { createFsFixture, FixtureTestContext } from '../../../tests/utils/fixture.js'
import { globby } from 'globby'
import { getDeployStore } from '@netlify/blobs'

// Globby wasn't easy to mock so instead we're using a temporary
// directory and the actual file system to test static pages

afterEach(() => {
  vi.restoreAllMocks()
})

let fakeBlob: ReturnType<typeof getDeployStore>

beforeEach(() => {
  fakeBlob = {
    set: vi.fn(),
  } as unknown as ReturnType<typeof getDeployStore>
})

test<FixtureTestContext>('should copy the static pages to the publish directory if they have no corresponding JSON files', async (ctx) => {
  const { cwd } = await createFsFixture(
    {
      [`${BUILD_DIR}/.next/static/test.js`]: '',
      [`${BUILD_DIR}/.next/server/pages/test.html`]: 'test-1',
      [`${BUILD_DIR}/.next/server/pages/test2.html`]: 'test-2',
    },
    ctx,
  )

  const PUBLISH_DIR = join(cwd, 'publish')
  await copyStaticContent({ PUBLISH_DIR }, fakeBlob)

  const files = await globby('**/*', { cwd, extglob: true })

  expect(files).toEqual(['publish/_next/static/test.js'])
  expect(fakeBlob.set).toHaveBeenCalledTimes(2)
  expect(fakeBlob.set).toHaveBeenCalledWith('server/pages/test.html', 'test-1')
  expect(fakeBlob.set).toHaveBeenCalledWith('server/pages/test2.html', 'test-2')
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
  await copyStaticContent({ PUBLISH_DIR }, fakeBlob)

  const files = await globby('**/*', { cwd, extglob: true })

  expect(files).toEqual(expect.arrayContaining(['publish/_next/static/test.js']))
})
