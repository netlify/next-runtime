import type { NetlifyPluginConstants, NetlifyPluginUtils } from '@netlify/build'
import glob from 'fast-glob'
import { join } from 'path'
import { expect, test, vi } from 'vitest'
import { mockFileSystem } from '../../../tests/index.js'
import { FixtureTestContext, createFsFixture } from '../../../tests/utils/fixture.js'
import { BLOB_DIR, STATIC_DIR } from '../constants.js'
import { copyStaticAssets, copyStaticContent } from './static.js'

const utils = {
  build: { failBuild: vi.fn() },
} as unknown as NetlifyPluginUtils

test('should clear the static directory contents', async () => {
  const PUBLISH_DIR = '.next'

  const { vol } = mockFileSystem({
    [`${STATIC_DIR}/remove-me.js`]: '',
  })

  await copyStaticAssets({
    constants: { PUBLISH_DIR } as NetlifyPluginConstants,
    utils,
  })

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
    constants: { PUBLISH_DIR } as NetlifyPluginConstants,
    utils,
  })

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
    constants: { PUBLISH_DIR } as NetlifyPluginConstants,
    utils,
  })

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

test<FixtureTestContext>('should copy the static pages to the publish directory if there are no corresponding JSON files', async (ctx) => {
  const PUBLISH_DIR = '.next'
  const { cwd } = await createFsFixture(
    {
      [`${PUBLISH_DIR}/server/pages/test.html`]: '',
      [`${PUBLISH_DIR}/server/pages/test2.html`]: '',
      [`${PUBLISH_DIR}/server/pages/test3.json`]: '',
    },
    ctx,
  )

  await copyStaticContent({
    constants: { PUBLISH_DIR } as NetlifyPluginConstants,
    utils,
  })

  expect(
    (await glob('**/*', { cwd: join(cwd, BLOB_DIR), dot: true }))
      .map((path) => Buffer.from(path, 'base64').toString('utf-8'))
      .sort(),
  ).toEqual(['test.html', 'test2.html'])
})

test<FixtureTestContext>('should not copy the static pages to the publish directory if there are corresponding JSON files', async (ctx) => {
  const PUBLISH_DIR = '.next'

  const { cwd } = await createFsFixture(
    {
      [`${PUBLISH_DIR}/server/pages/test.html`]: '',
      [`${PUBLISH_DIR}/server/pages/test.json`]: '',
      [`${PUBLISH_DIR}/server/pages/test2.html`]: '',
      [`${PUBLISH_DIR}/server/pages/test2.json`]: '',
    },
    ctx,
  )

  await copyStaticContent({
    constants: { PUBLISH_DIR } as NetlifyPluginConstants,
    utils,
  })

  expect(await glob('**/*', { cwd: join(cwd, BLOB_DIR), dot: true })).toHaveLength(0)
})
