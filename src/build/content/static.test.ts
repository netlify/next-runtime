import { type getDeployStore } from '@netlify/blobs'
import { join } from 'node:path'
import { beforeEach, expect, test, vi } from 'vitest'
import { mockFileSystem } from '../../../tests/index.js'
import { BUILD_DIR } from '../constants.js'
import { copyStaticContent } from './static.js'

vi.mock('node:fs', async () => {
  const unionFs: any = (await import('unionfs')).default
  const fs = await vi.importActual<typeof import('fs')>('node:fs')
  unionFs.reset = () => {
    unionFs.fss = [fs]
  }
  const united = unionFs.use(fs)
  return { default: united, ...united }
})

vi.mock('node:fs/promises', async () => {
  const fs = await import('node:fs')
  const { fsCpHelper, rmHelper } = await import('../../../tests/utils/fs-helper.js')
  return {
    ...fs.promises,
    rm: rmHelper,
    cp: fsCpHelper,
  }
})

let fakeBlob: ReturnType<typeof getDeployStore>

beforeEach(() => {
  fakeBlob = {
    set: vi.fn(),
  } as unknown as ReturnType<typeof getDeployStore>
})

test('should copy the static assets from the build to the publish directory', async () => {
  const { cwd, vol } = mockFileSystem({
    [`${BUILD_DIR}/.next/static/test.js`]: '',
    [`${BUILD_DIR}/.next/static/sub-dir/test2.js`]: '',
  })

  const PUBLISH_DIR = join(cwd, 'publish')
  await copyStaticContent({ PUBLISH_DIR }, fakeBlob)

  expect(fakeBlob.set).toHaveBeenCalledTimes(0)
  expect(Object.keys(vol.toJSON())).toEqual(
    expect.arrayContaining([
      `${PUBLISH_DIR}/_next/static/test.js`,
      `${PUBLISH_DIR}/_next/static/sub-dir/test2.js`,
    ]),
  )
})

test('should throw expected error if no static assets directory exists', async () => {
  const { cwd } = mockFileSystem({})

  const PUBLISH_DIR = join(cwd, 'publish')
  const staticDirectory = join(cwd, '.netlify/.next/static')

  await expect(copyStaticContent({ PUBLISH_DIR }, fakeBlob)).rejects.toThrowError(
    `Failed to copy static assets: Error: ENOENT: no such file or directory, readdir '${staticDirectory}'`,
  )
})

test('should copy files from the public directory to the publish directory', async () => {
  const { cwd, vol } = mockFileSystem({
    [`${BUILD_DIR}/.next/static/test.js`]: '',
    'public/fake-image.svg': '',
    'public/another-asset.json': '',
  })

  const PUBLISH_DIR = join(cwd, 'publish')
  await copyStaticContent({ PUBLISH_DIR }, fakeBlob)

  expect(Object.keys(vol.toJSON())).toEqual(
    expect.arrayContaining([`${PUBLISH_DIR}/fake-image.svg`, `${PUBLISH_DIR}/another-asset.json`]),
  )
})

test('should not copy files if the public directory does not exist', async () => {
  const { cwd, vol } = mockFileSystem({
    [`${BUILD_DIR}/.next/static/test.js`]: '',
  })

  const PUBLISH_DIR = join(cwd, 'publish')
  await expect(copyStaticContent({ PUBLISH_DIR }, fakeBlob)).resolves.toBeUndefined()

  expect(vol.toJSON()).toEqual({
    [join(cwd, `${BUILD_DIR}/.next/static/test.js`)]: '',
    [`${PUBLISH_DIR}/_next/static/test.js`]: '',
  })
})
