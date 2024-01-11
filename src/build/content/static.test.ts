import { Buffer } from 'node:buffer'
import { join } from 'node:path'

import type { NetlifyPluginOptions } from '@netlify/build'
import glob from 'fast-glob'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { mockFileSystem } from '../../../tests/index.js'
import { FixtureTestContext, createFsFixture } from '../../../tests/utils/fixture.js'
import { PluginContext } from '../plugin-context.js'

import { copyStaticAssets, copyStaticContent } from './static.js'

type Context = FixtureTestContext & {
  pluginContext: PluginContext
  publishDir: string
}
const createFsFixtureWithBasePath = (
  fixture: Record<string, string>,
  ctx: Omit<Context, 'pluginContext'>,
  basePath = '',
) => {
  return createFsFixture(
    {
      ...fixture,
      [join(ctx.publishDir, 'routes-manifest.json')]: JSON.stringify({ basePath }),
    },
    ctx,
  )
}

describe('Regular Repository layout', () => {
  beforeEach<Context>((ctx) => {
    ctx.publishDir = '.next'
    ctx.pluginContext = new PluginContext({
      constants: {
        PUBLISH_DIR: ctx.publishDir,
      },
      utils: { build: { failBuild: vi.fn() } as unknown },
    } as NetlifyPluginOptions)
  })

  test<Context>('should clear the static directory contents', async ({ pluginContext }) => {
    const { vol } = mockFileSystem({
      [`${pluginContext.staticDir}/remove-me.js`]: '',
    })
    await copyStaticAssets(pluginContext)
    expect(Object.keys(vol.toJSON())).toEqual(
      expect.not.arrayContaining([`${pluginContext.staticDir}/remove-me.js`]),
    )
  })

  test<Context>('should link static content from the publish directory to the static directory (no basePath)', async ({
    pluginContext,
    ...ctx
  }) => {
    const { cwd } = await createFsFixtureWithBasePath(
      {
        '.next/static/test.js': '',
        '.next/static/sub-dir/test2.js': '',
      },
      ctx,
    )

    await copyStaticAssets(pluginContext)
    expect(await glob('**/*', { cwd, dot: true, absolute: true })).toEqual(
      expect.arrayContaining([
        join(cwd, '.next/static/test.js'),
        join(cwd, '.next/static/sub-dir/test2.js'),
        join(pluginContext.staticDir, '/_next/static/test.js'),
        join(pluginContext.staticDir, '/_next/static/sub-dir/test2.js'),
      ]),
    )
  })

  test<Context>('should link static content from the publish directory to the static directory (with basePath)', async ({
    pluginContext,
    ...ctx
  }) => {
    const { cwd } = await createFsFixtureWithBasePath(
      {
        '.next/static/test.js': '',
        '.next/static/sub-dir/test2.js': '',
      },
      ctx,
      '/base/path',
    )

    await copyStaticAssets(pluginContext)
    expect(await glob('**/*', { cwd, dot: true, absolute: true })).toEqual(
      expect.arrayContaining([
        join(cwd, '.next/static/test.js'),
        join(cwd, '.next/static/sub-dir/test2.js'),
        join(pluginContext.staticDir, 'base/path/_next/static/test.js'),
        join(pluginContext.staticDir, 'base/path/_next/static/sub-dir/test2.js'),
      ]),
    )
  })

  test<Context>('should link static content from the public directory to the static directory (no basePath)', async ({
    pluginContext,
    ...ctx
  }) => {
    const { cwd } = await createFsFixtureWithBasePath(
      {
        'public/fake-image.svg': '',
        'public/another-asset.json': '',
      },
      ctx,
    )

    await copyStaticAssets(pluginContext)
    expect(await glob('**/*', { cwd, dot: true, absolute: true })).toEqual(
      expect.arrayContaining([
        join(cwd, 'public/another-asset.json'),
        join(cwd, 'public/fake-image.svg'),
        join(pluginContext.staticDir, '/another-asset.json'),
        join(pluginContext.staticDir, '/fake-image.svg'),
      ]),
    )
  })

  test<Context>('should link static content from the public directory to the static directory (with basePath)', async ({
    pluginContext,
    ...ctx
  }) => {
    const { cwd } = await createFsFixtureWithBasePath(
      {
        'public/fake-image.svg': '',
        'public/another-asset.json': '',
      },
      ctx,
      '/base/path',
    )

    await copyStaticAssets(pluginContext)
    expect(await glob('**/*', { cwd, dot: true, absolute: true })).toEqual(
      expect.arrayContaining([
        join(cwd, 'public/another-asset.json'),
        join(cwd, 'public/fake-image.svg'),
        join(pluginContext.staticDir, '/base/path/another-asset.json'),
        join(pluginContext.staticDir, '/base/path/fake-image.svg'),
      ]),
    )
  })

  test<Context>('should copy the static pages to the publish directory if there are no corresponding JSON files', async ({
    pluginContext,
    ...ctx
  }) => {
    await createFsFixtureWithBasePath(
      {
        '.next/server/pages/test.html': '',
        '.next/server/pages/test2.html': '',
        '.next/server/pages/test3.json': '',
      },
      ctx,
    )

    await copyStaticContent(pluginContext)
    const files = await glob('**/*', { cwd: pluginContext.blobDir, dot: true })

    expect(files.map((path) => Buffer.from(path, 'base64').toString('utf-8')).sort()).toEqual([
      'test.html',
      'test2.html',
    ])
  })

  test<Context>('should not copy the static pages to the publish directory if there are corresponding JSON files', async ({
    pluginContext,
    ...ctx
  }) => {
    await createFsFixtureWithBasePath(
      {
        '.next/server/pages/test.html': '',
        '.next/server/pages/test.json': '',
        '.next/server/pages/test2.html': '',
        '.next/server/pages/test2.json': '',
      },
      ctx,
    )

    await copyStaticContent(pluginContext)
    expect(await glob('**/*', { cwd: pluginContext.blobDir, dot: true })).toHaveLength(0)
  })
})

describe('Mono Repository', () => {
  beforeEach<Context>((ctx) => {
    ctx.publishDir = 'apps/app-1/.next'
    ctx.pluginContext = new PluginContext({
      constants: {
        PUBLISH_DIR: ctx.publishDir,
        PACKAGE_PATH: 'apps/app-1',
      },
      utils: { build: { failBuild: vi.fn() } as unknown },
    } as NetlifyPluginOptions)
  })

  test<Context>('should link static content from the publish directory to the static directory (no basePath)', async ({
    pluginContext,
    ...ctx
  }) => {
    const { cwd } = await createFsFixtureWithBasePath(
      {
        'apps/app-1/.next/static/test.js': '',
        'apps/app-1/.next/static/sub-dir/test2.js': '',
      },
      ctx,
    )

    await copyStaticAssets(pluginContext)
    expect(await glob('**/*', { cwd, dot: true, absolute: true })).toEqual(
      expect.arrayContaining([
        join(cwd, 'apps/app-1/.next/static/test.js'),
        join(cwd, 'apps/app-1/.next/static/sub-dir/test2.js'),
        join(pluginContext.staticDir, '/_next/static/test.js'),
        join(pluginContext.staticDir, '/_next/static/sub-dir/test2.js'),
      ]),
    )
  })

  test<Context>('should link static content from the publish directory to the static directory (with basePath)', async ({
    pluginContext,
    ...ctx
  }) => {
    const { cwd } = await createFsFixtureWithBasePath(
      {
        'apps/app-1/.next/static/test.js': '',
        'apps/app-1/.next/static/sub-dir/test2.js': '',
      },
      ctx,
      '/base/path',
    )

    await copyStaticAssets(pluginContext)
    expect(await glob('**/*', { cwd, dot: true, absolute: true })).toEqual(
      expect.arrayContaining([
        join(cwd, 'apps/app-1/.next/static/test.js'),
        join(cwd, 'apps/app-1/.next/static/sub-dir/test2.js'),
        join(pluginContext.staticDir, '/base/path/_next/static/test.js'),
        join(pluginContext.staticDir, '/base/path/_next/static/sub-dir/test2.js'),
      ]),
    )
  })

  test<Context>('should link static content from the public directory to the static directory (no basePath)', async ({
    pluginContext,
    ...ctx
  }) => {
    const { cwd } = await createFsFixtureWithBasePath(
      {
        'apps/app-1/public/fake-image.svg': '',
        'apps/app-1/public/another-asset.json': '',
      },
      ctx,
    )

    await copyStaticAssets(pluginContext)
    expect(await glob('**/*', { cwd, dot: true, absolute: true })).toEqual(
      expect.arrayContaining([
        join(cwd, 'apps/app-1/public/another-asset.json'),
        join(cwd, 'apps/app-1/public/fake-image.svg'),
        join(pluginContext.staticDir, '/another-asset.json'),
        join(pluginContext.staticDir, '/fake-image.svg'),
      ]),
    )
  })

  test<Context>('should link static content from the public directory to the static directory (with basePath)', async ({
    pluginContext,
    ...ctx
  }) => {
    const { cwd } = await createFsFixtureWithBasePath(
      {
        'apps/app-1/public/fake-image.svg': '',
        'apps/app-1/public/another-asset.json': '',
      },
      ctx,
      '/base/path',
    )

    await copyStaticAssets(pluginContext)
    expect(await glob('**/*', { cwd, dot: true, absolute: true })).toEqual(
      expect.arrayContaining([
        join(cwd, 'apps/app-1/public/another-asset.json'),
        join(cwd, 'apps/app-1/public/fake-image.svg'),
        join(pluginContext.staticDir, '/base/path/another-asset.json'),
        join(pluginContext.staticDir, '/base/path/fake-image.svg'),
      ]),
    )
  })

  test<Context>('should copy the static pages to the publish directory if there are no corresponding JSON files', async ({
    pluginContext,
    ...ctx
  }) => {
    await createFsFixtureWithBasePath(
      {
        'apps/app-1/.next/server/pages/test.html': '',
        'apps/app-1/.next/server/pages/test2.html': '',
        'apps/app-1/.next/server/pages/test3.json': '',
      },
      ctx,
    )

    await copyStaticContent(pluginContext)
    const files = await glob('**/*', { cwd: pluginContext.blobDir, dot: true })

    expect(files.map((path) => Buffer.from(path, 'base64').toString('utf-8')).sort()).toEqual([
      'test.html',
      'test2.html',
    ])
  })

  test<Context>('should not copy the static pages to the publish directory if there are corresponding JSON files', async ({
    pluginContext,
    ...ctx
  }) => {
    await createFsFixtureWithBasePath(
      {
        'apps/app-1/.next/server/pages/test.html': '',
        'apps/app-1/.next/server/pages/test.json': '',
        'apps/app-1/.next/server/pages/test2.html': '',
        'apps/app-1/.next/server/pages/test2.json': '',
      },
      ctx,
    )

    await copyStaticContent(pluginContext)
    expect(await glob('**/*', { cwd: pluginContext.blobDir, dot: true })).toHaveLength(0)
  })
})
