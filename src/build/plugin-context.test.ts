import { join } from 'node:path'
import { platform } from 'node:process'

import { NetlifyPluginOptions } from '@netlify/build'
import { expect, test, vi } from 'vitest'

import { mockFileSystem } from '../../tests/index.js'

import { PluginContext } from './plugin-context.js'

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

test('basic nest application', () => {
  const { cwd } = mockFileSystem({
    '.next/required-server-files.json': JSON.stringify({ config: { distDir: '.next' } }),
  })
  const ctx = new PluginContext({ constants: {} } as NetlifyPluginOptions)
  expect(ctx.packagePath).toBe('')
  expect(ctx.blobDir).toBe(join(cwd, '.netlify/blobs/deploy'))
  expect(ctx.edgeFunctionsDir).toBe(join(cwd, '.netlify/edge-functions'))
  expect(ctx.edgeHandlerDir).toBe(join(cwd, '.netlify/edge-functions/___netlify-edge-handler'))
  expect(ctx.nextServerHandler).toBe('./.netlify/dist/run/handlers/server.js')
  expect(ctx.serverFunctionsDir).toBe(join(cwd, '.netlify/functions-internal'))
  expect(ctx.serverHandlerDir).toBe(
    join(cwd, '.netlify/functions-internal/___netlify-server-handler'),
  )
  expect(ctx.serverHandlerRootDir).toBe(
    join(cwd, '.netlify/functions-internal/___netlify-server-handler'),
  )
  expect(ctx.standaloneDir).toBe(join(cwd, '.next/standalone'))
  expect(ctx.standaloneRootDir).toBe(join(cwd, '.next/standalone'))
  expect(ctx.staticDir).toBe(join(cwd, '.netlify/static'))
  expect(ctx.distDir).toBe('.next')
  expect(ctx.nextDistDir).toBe('.next')
  expect(ctx.relPublishDir).toBe('.next')
  expect(ctx.publishDir).toBe(join(cwd, '.next'))
})

test('next app with custom distDir', () => {
  const { cwd } = mockFileSystem({
    'out/required-server-files.json': JSON.stringify({ config: { distDir: 'out' } }),
  })
  const ctx = new PluginContext({ constants: { PUBLISH_DIR: 'out' } } as NetlifyPluginOptions)
  expect(ctx.standaloneDir).toBe(join(cwd, 'out/standalone'))
  expect(ctx.standaloneRootDir).toBe(join(cwd, 'out/standalone'))
  expect(ctx.distDir).toBe('out')
  expect(ctx.nextDistDir).toBe('out')
  expect(ctx.relPublishDir).toBe('out')
  expect(ctx.publishDir).toBe(join(cwd, 'out'))
})

test.skipIf(platform === 'win32')('next app with deep custom distDir', () => {
  const { cwd } = mockFileSystem({
    'out/dir/required-server-files.json': JSON.stringify({ config: { distDir: 'out/dir' } }),
  })
  const ctx = new PluginContext({ constants: { PUBLISH_DIR: 'out/dir' } } as NetlifyPluginOptions)
  expect(ctx.standaloneDir).toBe(join(cwd, 'out/dir/standalone/out'))
  expect(ctx.standaloneRootDir).toBe(join(cwd, 'out/dir/standalone'))
  expect(ctx.distDir).toBe('out/dir')
  expect(ctx.distDirParent).toBe('out')
  expect(ctx.nextDistDir).toBe('dir')
  expect(ctx.relPublishDir).toBe('out/dir')
  expect(ctx.publishDir).toBe(join(cwd, 'out/dir'))
  expect(ctx.serverHandlerDir).toBe(
    join(cwd, '.netlify/functions-internal/___netlify-server-handler'),
  )
})

test.skipIf(platform === 'win32')('monorepo with package path', () => {
  const { cwd } = mockFileSystem({
    'apps/my-app/.next/required-server-files.json': JSON.stringify({
      config: { distDir: '.next' },
    }),
  })
  const ctx = new PluginContext({
    constants: { PACKAGE_PATH: 'apps/my-app' },
  } as NetlifyPluginOptions)
  expect(ctx.packagePath).toBe('apps/my-app')
  expect(ctx.blobDir).toBe(join(cwd, 'apps/my-app/.netlify/blobs/deploy'))
  expect(ctx.edgeFunctionsDir).toBe(join(cwd, 'apps/my-app/.netlify/edge-functions'))
  expect(ctx.edgeHandlerDir).toBe(
    join(cwd, 'apps/my-app/.netlify/edge-functions/___netlify-edge-handler'),
  )
  expect(ctx.lambdaWorkingDirectory).toBe('/var/task/apps/my-app')
  expect(ctx.nextServerHandler).toBe('/var/task/apps/my-app/.netlify/dist/run/handlers/server.js')
  expect(ctx.serverFunctionsDir).toBe(join(cwd, 'apps/my-app/.netlify/functions-internal'))
  expect(ctx.serverHandlerDir).toBe(
    join(cwd, 'apps/my-app/.netlify/functions-internal/___netlify-server-handler/apps/my-app'),
  )
  expect(ctx.serverHandlerRootDir).toBe(
    join(cwd, 'apps/my-app/.netlify/functions-internal/___netlify-server-handler'),
  )
  expect(ctx.standaloneDir).toBe(join(cwd, 'apps/my-app/.next/standalone/apps/my-app'))
  expect(ctx.standaloneRootDir).toBe(join(cwd, 'apps/my-app/.next/standalone'))
  expect(ctx.staticDir).toBe(join(cwd, 'apps/my-app/.netlify/static'))
  expect(ctx.distDir).toBe('apps/my-app/.next')
  expect(ctx.distDirParent).toBe('apps/my-app')
  expect(ctx.nextDistDir).toBe('.next')
  expect(ctx.relPublishDir).toBe('apps/my-app/.next')
  expect(ctx.publishDir).toBe(join(cwd, 'apps/my-app/.next'))
})

test.skipIf(platform === 'win32')('nx monorepo with package path and different distDir', () => {
  const { cwd } = mockFileSystem({
    'dist/apps/my-app/.next/required-server-files.json': JSON.stringify({
      config: { distDir: '../../dist/apps/my-app/.next' },
    }),
  })
  const ctx = new PluginContext({
    constants: {
      PUBLISH_DIR: 'dist/apps/my-app/.next',
      PACKAGE_PATH: 'apps/my-app',
    },
  } as NetlifyPluginOptions)
  expect(ctx.packagePath).toBe('apps/my-app')
  expect(ctx.blobDir).toBe(join(cwd, 'apps/my-app/.netlify/blobs/deploy'))
  expect(ctx.edgeFunctionsDir).toBe(join(cwd, 'apps/my-app/.netlify/edge-functions'))
  expect(ctx.edgeHandlerDir).toBe(
    join(cwd, 'apps/my-app/.netlify/edge-functions/___netlify-edge-handler'),
  )
  expect(ctx.lambdaWorkingDirectory).toBe('/var/task/dist/apps/my-app')
  expect(ctx.nextServerHandler).toBe(
    '/var/task/dist/apps/my-app/.netlify/dist/run/handlers/server.js',
  )
  expect(ctx.serverFunctionsDir).toBe(join(cwd, 'apps/my-app/.netlify/functions-internal'))
  expect(ctx.serverHandlerDir).toBe(
    join(cwd, 'apps/my-app/.netlify/functions-internal/___netlify-server-handler/dist/apps/my-app'),
  )
  expect(ctx.serverHandlerRootDir).toBe(
    join(cwd, 'apps/my-app/.netlify/functions-internal/___netlify-server-handler'),
  )
  expect(ctx.standaloneDir).toBe(join(cwd, 'dist/apps/my-app/.next/standalone/dist/apps/my-app'))
  expect(ctx.standaloneRootDir).toBe(join(cwd, 'dist/apps/my-app/.next/standalone'))
  expect(ctx.staticDir).toBe(join(cwd, 'apps/my-app/.netlify/static'))
  expect(ctx.distDir).toBe('dist/apps/my-app/.next')
  expect(ctx.distDirParent).toBe('dist/apps/my-app')
  expect(ctx.nextDistDir).toBe('.next')
  expect(ctx.relPublishDir).toBe('dist/apps/my-app/.next')
  expect(ctx.publishDir).toBe(join(cwd, 'dist/apps/my-app/.next'))
})
