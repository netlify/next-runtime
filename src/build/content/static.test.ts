import type { NetlifyPluginOptions } from '@netlify/build'
import glob from 'fast-glob'
import { Mock, afterEach, beforeEach, expect, test, vi } from 'vitest'
import { mockFileSystem } from '../../../tests/index.js'
import { FixtureTestContext, createFsFixture } from '../../../tests/utils/fixture.js'
import { getBlobStore } from '../blob.js'
import { STATIC_DIR } from '../constants.js'
import { copyStaticAssets, uploadStaticContent } from './static.js'

afterEach(() => {
  vi.restoreAllMocks()
})

vi.mock('../blob.js', () => ({
  getBlobStore: vi.fn(),
}))

let mockBlobSet = vi.fn()
beforeEach(() => {
  ;(getBlobStore as Mock).mockReturnValue({
    set: mockBlobSet,
  })
})

test('should clear the static directory contents', async () => {
  const PUBLISH_DIR = '.next'

  const { vol } = mockFileSystem({
    [`${STATIC_DIR}/remove-me.js`]: '',
  })

  await copyStaticAssets({
    constants: { PUBLISH_DIR },
  } as Pick<NetlifyPluginOptions, 'constants'>)

  expect(Object.keys(vol.toJSON())).toEqual(
    expect.not.arrayContaining([`${STATIC_DIR}/remove-me.js`]),
  )
})

test<FixtureTestContext>('should link static content from the publish directory to the static directory', async (ctx) => {
  const PUBLISH_DIR = '.next'

  const { cwd } = await createFsFixture(
    {
      [`${PUBLISH_DIR}/static/test.js`]: '',
      [`${PUBLISH_DIR}/static/sub-dir/test2.js`]: '',
    },
    ctx,
  )

  await copyStaticAssets({
    constants: { PUBLISH_DIR },
  } as Pick<NetlifyPluginOptions, 'constants'>)

  const files = await glob('**/*', { cwd, dot: true })

  expect(files).toEqual(
    expect.arrayContaining([
      `${PUBLISH_DIR}/static/test.js`,
      `${PUBLISH_DIR}/static/sub-dir/test2.js`,
      `${STATIC_DIR}/_next/static/test.js`,
      `${STATIC_DIR}/_next/static/sub-dir/test2.js`,
    ]),
  )
})

test<FixtureTestContext>('should link static content from the public directory to the static directory', async (ctx) => {
  const PUBLISH_DIR = '.next'

  const { cwd } = await createFsFixture(
    {
      'public/fake-image.svg': '',
      'public/another-asset.json': '',
    },
    ctx,
  )

  await copyStaticAssets({
    constants: { PUBLISH_DIR },
  } as Pick<NetlifyPluginOptions, 'constants'>)

  const files = await glob('**/*', { cwd, dot: true })

  expect(files).toEqual(
    expect.arrayContaining([
      'public/another-asset.json',
      'public/fake-image.svg',
      `${STATIC_DIR}/another-asset.json`,
      `${STATIC_DIR}/fake-image.svg`,
    ]),
  )
})

test<FixtureTestContext>('should copy the static pages to the publish directory if the routes do not exist in the prerender-manifest', async (ctx) => {
  const PUBLISH_DIR = '.next'

  const { cwd } = await createFsFixture(
    {
      [`${PUBLISH_DIR}/prerender-manifest.json`]: JSON.stringify({
        routes: {},
      }),
      [`${PUBLISH_DIR}/static/test.js`]: '',
      [`${PUBLISH_DIR}/server/pages/test.html`]: 'test-1',
      [`${PUBLISH_DIR}/server/pages/test2.html`]: 'test-2',
    },
    ctx,
  )

  await uploadStaticContent({
    constants: { PUBLISH_DIR },
  } as Pick<NetlifyPluginOptions, 'constants'>)

  expect(mockBlobSet).toHaveBeenCalledTimes(2)
  expect(mockBlobSet).toHaveBeenCalledWith('server/pages/test.html', 'test-1')
  expect(mockBlobSet).toHaveBeenCalledWith('server/pages/test2.html', 'test-2')
})

test<FixtureTestContext>('should not copy the static pages to the publish directory if the routes exist in the prerender-manifest', async (ctx) => {
  const PUBLISH_DIR = '.next'

  const { cwd } = await createFsFixture(
    {
      [`${PUBLISH_DIR}/prerender-manifest.json`]: JSON.stringify({
        routes: {
          '/test': {},
          '/test2': {},
        },
      }),
      [`${PUBLISH_DIR}/static/test.js`]: '',
      [`${PUBLISH_DIR}/server/pages/test.html`]: '',
      [`${PUBLISH_DIR}/server/pages/test2.html`]: '',
    },
    ctx,
  )

  await uploadStaticContent({
    constants: { PUBLISH_DIR },
  } as Pick<NetlifyPluginOptions, 'constants'>)

  expect(mockBlobSet).not.toHaveBeenCalled()
})
