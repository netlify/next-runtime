import { Mock, TestContext, afterEach, assert, beforeEach, expect, test, vi } from 'vitest'

import { NetlifyPluginUtils } from '@netlify/build'
import { join } from 'node:path'
import { mockFileSystem } from '../../tests/index.js'
import { moveBuildOutput } from './move-build-output.js'

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
  const { fsCpHelper, rmHelper } = await import('../../tests/utils/fs-helper.js')
  return {
    ...fs.promises,
    rm: rmHelper,
    cp: fsCpHelper,
  }
})

type Context = TestContext & {
  utils: {
    build: {
      failBuild: Mock<any, any>
    }
  }
}

beforeEach<Context>((ctx) => {
  ctx.utils = {
    build: {
      failBuild: vi.fn().mockImplementation((msg, { error } = {}) => {
        assert.fail(`${msg}: ${error || ''}`)
      }),
    },
  }
})

test<Context>('should fail the build and throw an error if the PUBLISH_DIR does not exist', async (ctx) => {
  const { cwd } = mockFileSystem({})
  ctx.utils.build.failBuild.mockImplementation((msg) => {
    throw new Error(msg)
  })

  try {
    await moveBuildOutput(
      { PUBLISH_DIR: join(cwd, 'does-not-exist') },
      ctx.utils as unknown as NetlifyPluginUtils,
    )
  } catch (err) {
    expect(err).toBeInstanceOf(Error)
    if (err instanceof Error) {
      expect(err.message).toEqual(
        `Your publish directory does not exist. Please check your netlify.toml file.`,
      )
    }
    expect(ctx.utils.build.failBuild).toHaveBeenCalledTimes(1)
  } finally {
    expect.assertions(3)
  }
})

test<Context>('should move the build output to the `.netlify/.next` folder', async (ctx) => {
  const { cwd, vol } = mockFileSystem({ 'out/fake-file.js': '' })

  await moveBuildOutput(
    { PUBLISH_DIR: join(cwd, 'out') },
    ctx.utils as unknown as NetlifyPluginUtils,
  )

  expect(vol.toJSON()).toEqual({
    [join(cwd, '.netlify/.next/fake-file.js')]: '',
    [join(cwd, 'out')]: null,
  })
})
