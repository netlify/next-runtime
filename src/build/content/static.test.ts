import { vol, fs } from 'memfs'
import { expect, test, vi, afterEach } from 'vitest'
import { join } from 'node:path'
import { BUILD_DIR } from '../constants.js'
import { copyStaticContent } from './static.js'
import { mockFileSystem, fsCpHelper } from '../../../tests/index.js'

vi.mock('node:fs', () => fs)
vi.mock('node:fs/promises', () => {
  return {
    ...fs.promises,
    cp: (src, dest, options) => fsCpHelper(src, dest, options),
  }
})

afterEach(() => {
  vol.reset()
  vi.restoreAllMocks()
})

test('should copy the static assets from the build to the publish directory', async () => {
  const cwd = mockFileSystem({
    [`${BUILD_DIR}/.next/static/test.js`]: '',
    [`${BUILD_DIR}/.next/static/sub-dir/test2.js`]: '',
  })

  const PUBLISH_DIR = join(cwd, 'publish')
  await copyStaticContent({ PUBLISH_DIR })

  const filenamesInVolume = Object.keys(vol.toJSON())
  expect(filenamesInVolume).toEqual(
    expect.arrayContaining([
      `${PUBLISH_DIR}/_next/static/test.js`,
      `${PUBLISH_DIR}/_next/static/sub-dir/test2.js`,
    ]),
  )
})

test('should throw expected error if no static assets directory exists', async () => {
  const cwd = mockFileSystem({})

  const PUBLISH_DIR = join(cwd, 'publish')
  const staticDirectory = join(cwd, '.netlify/.next/static')

  await expect(copyStaticContent({ PUBLISH_DIR })).rejects.toThrowError(
    `Failed to copy static assets: Error: ENOENT: no such file or directory, readdir '${staticDirectory}'`,
  )
})

test('should copy files from the public directory to the publish directory', async () => {
  const cwd = mockFileSystem({
    [`${BUILD_DIR}/.next/static/test.js`]: '',
    'public/fake-image.svg': '',
    'public/another-asset.json': '',
  })

  const PUBLISH_DIR = join(cwd, 'publish')
  await copyStaticContent({ PUBLISH_DIR })

  const filenamesInVolume = Object.keys(vol.toJSON())
  expect(filenamesInVolume).toEqual(
    expect.arrayContaining([
      `${PUBLISH_DIR}/public/fake-image.svg`,
      `${PUBLISH_DIR}/public/another-asset.json`,
    ]),
  )
})

test('should not copy files if the public directory does not exist', async () => {
  const cwd = mockFileSystem({
    [`${BUILD_DIR}/.next/static/test.js`]: '',
  })

  const PUBLISH_DIR = join(cwd, 'publish')
  await expect(copyStaticContent({ PUBLISH_DIR })).resolves.toBeUndefined()

  expect(vol.toJSON()).toEqual({
    [join(cwd, `${BUILD_DIR}/.next/static/test.js`)]: '',
    [`${PUBLISH_DIR}/_next/static/test.js`]: '',
  })
})
