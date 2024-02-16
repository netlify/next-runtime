import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { NetlifyPluginOptions } from '@netlify/build'
import { expect, test, vi } from 'vitest'

import { mockFileSystem } from '../../../tests/index.js'
import { PluginContext } from '../plugin-context.js'

import { copyNextServerCode } from './server.js'

vi.mock('node:fs', async () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, unicorn/no-await-expression-member
  const unionFs: any = (await import('unionfs')).default
  const fs = await vi.importActual('node:fs')
  unionFs.reset = () => {
    unionFs.fss = [fs]
  }

  const united = unionFs.use(fs)
  return { default: united, ...united }
})

vi.mock('node:fs/promises', async () => {
  const fs = await import('node:fs')
  return fs.promises
})

test('should not modify the required-server-files.json distDir on simple next app', async () => {
  const reqServerFiles = JSON.stringify({ config: { distDir: '.next' } })
  const reqServerPath = '.next/required-server-files.json'
  const reqServerPathStandalone = join('.next/standalone', reqServerPath)
  const { cwd } = mockFileSystem({
    [reqServerPath]: reqServerFiles,
    [reqServerPathStandalone]: reqServerFiles,
  })
  const ctx = new PluginContext({ constants: {} } as NetlifyPluginOptions)
  await copyNextServerCode(ctx)
  expect(await readFile(join(cwd, reqServerPathStandalone), 'utf-8')).toBe(reqServerFiles)
})

test('should not modify the required-server-files.json distDir on monorepo', async () => {
  const reqServerFiles = JSON.stringify({ config: { distDir: '.next' } })
  const reqServerPath = 'apps/my-app/.next/required-server-files.json'
  const reqServerPathStandalone = join('apps/my-app/.next/standalone', reqServerPath)
  const { cwd } = mockFileSystem({
    [reqServerPath]: reqServerFiles,
    [reqServerPathStandalone]: reqServerFiles,
  })
  const ctx = new PluginContext({
    constants: {
      PACKAGE_PATH: 'apps/my-app',
    },
  } as NetlifyPluginOptions)
  await copyNextServerCode(ctx)
  expect(await readFile(join(cwd, reqServerPathStandalone), 'utf-8')).toBe(reqServerFiles)
})

test('should not modify the required-server-files.json distDir on monorepo', async () => {
  const reqServerFiles = JSON.stringify({ config: { distDir: '.next' } })
  const reqServerPath = 'apps/my-app/.next/required-server-files.json'
  const reqServerPathStandalone = join('apps/my-app/.next/standalone', reqServerPath)
  const { cwd } = mockFileSystem({
    [reqServerPath]: reqServerFiles,
    [reqServerPathStandalone]: reqServerFiles,
  })
  const ctx = new PluginContext({
    constants: {
      PACKAGE_PATH: 'apps/my-app',
    },
  } as NetlifyPluginOptions)
  await copyNextServerCode(ctx)
  expect(await readFile(join(cwd, reqServerPathStandalone), 'utf-8')).toBe(reqServerFiles)
})

// case of nx-integrated
test('should modify the required-server-files.json distDir on distDir outside of packagePath', async () => {
  const reqServerFiles = JSON.stringify({ config: { distDir: '../../dist/apps/my-app/.next' } })
  const reqServerPath = 'dist/apps/my-app/.next/required-server-files.json'
  const reqServerPathStandalone = join('dist/apps/my-app/.next/standalone', reqServerPath)
  const { cwd } = mockFileSystem({
    [reqServerPath]: reqServerFiles,
    [reqServerPathStandalone]: reqServerFiles,
  })
  const ctx = new PluginContext({
    constants: {
      PACKAGE_PATH: 'apps/my-app',
      PUBLISH_DIR: 'dist/apps/my-app/.next',
    },
  } as NetlifyPluginOptions)
  await copyNextServerCode(ctx)
  expect(await readFile(join(cwd, reqServerPathStandalone), 'utf-8')).toBe(
    '{"config":{"distDir":".next"}}',
  )
})
