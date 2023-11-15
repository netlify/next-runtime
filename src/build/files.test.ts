import glob from 'fast-glob'
import { expect, test, vi } from 'vitest'
import { FixtureTestContext, createFsFixture } from '../../tests/utils/fixture.js'
import { linkdir } from './files.js'

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

test<FixtureTestContext>('should link files in the src directory to the dest directory', async (ctx) => {
  const { cwd } = await createFsFixture(
    {
      '/src/test.js': '',
      '/src/sub-dir/test2.js': '',
    },
    ctx,
  )

  await linkdir(`${cwd}/src`, `${cwd}/dest`)

  const files = await glob('**/*', { cwd })

  expect(files).toEqual(expect.arrayContaining(['dest/test.js', 'dest/sub-dir/test2.js']))
})

test('should fail gracefully if no files found', async () => {
  expect(async () => await linkdir('/not-a-path', '/not-a-path')).not.toThrow()
})
