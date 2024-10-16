import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { inspect } from 'node:util'

import type { NetlifyPluginOptions } from '@netlify/build'
import glob from 'fast-glob'
import type { PrerenderManifest } from 'next/dist/build/index.js'
import { beforeEach, describe, expect, Mock, test, vi } from 'vitest'

import { decodeBlobKey, encodeBlobKey, mockFileSystem } from '../../../tests/index.js'
import { type FixtureTestContext } from '../../../tests/utils/contexts.js'
import { createFsFixture } from '../../../tests/utils/fixture.js'
import { PluginContext, RequiredServerFilesManifest } from '../plugin-context.js'

import { copyStaticAssets, copyStaticContent } from './static.js'

type Context = FixtureTestContext & {
  pluginContext: PluginContext
  publishDir: string
  relativeAppDir: string
}
const createFsFixtureWithBasePath = (
  fixture: Record<string, string>,
  ctx: Omit<Context, 'pluginContext'>,

  {
    basePath = '',
    // eslint-disable-next-line unicorn/no-useless-undefined
    i18n = undefined,
    dynamicRoutes = {},
  }: {
    basePath?: string
    i18n?: Pick<NonNullable<RequiredServerFilesManifest['config']['i18n']>, 'locales'>
    dynamicRoutes?: {
      [route: string]: Pick<PrerenderManifest['dynamicRoutes'][''], 'fallback'>
    }
  } = {},
) => {
  return createFsFixture(
    {
      ...fixture,
      [join(ctx.publishDir, 'routes-manifest.json')]: JSON.stringify({ basePath }),
      [join(ctx.publishDir, 'required-server-files.json')]: JSON.stringify({
        relativeAppDir: ctx.relativeAppDir,
        appDir: ctx.relativeAppDir,
        config: {
          distDir: ctx.publishDir,
          i18n,
        },
      } as Pick<RequiredServerFilesManifest, 'relativeAppDir' | 'appDir'>),
      [join(ctx.publishDir, 'prerender-manifest.json')]: JSON.stringify({ dynamicRoutes }),
    },
    ctx,
  )
}

async function readDirRecursive(dir: string) {
  const posixPaths = await glob('**/*', { cwd: dir, dot: true, absolute: true })
  // glob always returns unix-style paths, even on Windows!
  // To compare them more easily in our tests running on Windows, we convert them to the platform-specific paths.
  const paths = posixPaths.map((posixPath) => join(posixPath))
  return paths
}

let failBuildMock: Mock<
  Parameters<PluginContext['utils']['build']['failBuild']>,
  ReturnType<PluginContext['utils']['build']['failBuild']>
>

const dontFailTest: PluginContext['utils']['build']['failBuild'] = () => {
  return undefined as never
}

describe('Regular Repository layout', () => {
  beforeEach<Context>((ctx) => {
    failBuildMock = vi.fn((msg, err) => {
      expect.fail(`failBuild should not be called, was called with ${inspect({ msg, err })}`)
    })
    ctx.publishDir = '.next'
    ctx.relativeAppDir = ''
    ctx.pluginContext = new PluginContext({
      constants: {
        PUBLISH_DIR: ctx.publishDir,
      },
      utils: {
        build: {
          failBuild: failBuildMock,
        } as unknown,
      },
    } as NetlifyPluginOptions)
  })

  test<Context>('should clear the static directory contents', async ({ pluginContext }) => {
    failBuildMock.mockImplementation(dontFailTest)
    const { vol } = mockFileSystem({
      [`${pluginContext.staticDir}/remove-me.js`]: '',
    })
    await copyStaticAssets(pluginContext)
    expect(Object.keys(vol.toJSON())).toEqual(
      expect.not.arrayContaining([`${pluginContext.staticDir}/remove-me.js`]),
    )
    // routes manifest fails to load because it doesn't exist and we expect that to fail the build
    expect(failBuildMock).toBeCalled()
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
    expect(await readDirRecursive(cwd)).toEqual(
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
      { basePath: '/base/path' },
    )

    await copyStaticAssets(pluginContext)
    expect(await readDirRecursive(cwd)).toEqual(
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
    expect(await readDirRecursive(cwd)).toEqual(
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
      { basePath: '/base/path' },
    )

    await copyStaticAssets(pluginContext)
    expect(await readDirRecursive(cwd)).toEqual(
      expect.arrayContaining([
        join(cwd, 'public/another-asset.json'),
        join(cwd, 'public/fake-image.svg'),
        join(pluginContext.staticDir, '/base/path/another-asset.json'),
        join(pluginContext.staticDir, '/base/path/fake-image.svg'),
      ]),
    )
  })

  describe('should copy the static pages to the publish directory if there are no corresponding JSON files and mark wether html file is a fallback', () => {
    test<Context>('no i18n', async ({ pluginContext, ...ctx }) => {
      await createFsFixtureWithBasePath(
        {
          '.next/server/pages/test.html': '',
          '.next/server/pages/test2.html': '',
          '.next/server/pages/test3.json': '',
          '.next/server/pages/blog/[slug].html': '',
        },
        ctx,
        {
          dynamicRoutes: {
            '/blog/[slug]': {
              fallback: '/blog/[slug].html',
            },
          },
        },
      )

      await copyStaticContent(pluginContext)
      const files = await glob('**/*', { cwd: pluginContext.blobDir, dot: true })

      const expectedStaticPages = ['blog/[slug].html', 'test.html', 'test2.html']
      const expectedFallbacks = new Set(['blog/[slug].html'])

      expect(files.map((path) => decodeBlobKey(path)).sort()).toEqual(expectedStaticPages)

      for (const page of expectedStaticPages) {
        const expectedIsFallback = expectedFallbacks.has(page)

        const blob = JSON.parse(
          await readFile(join(pluginContext.blobDir, await encodeBlobKey(page)), 'utf-8'),
        )

        expect(blob, `${page} should ${expectedIsFallback ? '' : 'not '}be a fallback`).toEqual({
          html: '',
          isFallback: expectedIsFallback,
        })
      }
    })

    test<Context>('with i18n', async ({ pluginContext, ...ctx }) => {
      await createFsFixtureWithBasePath(
        {
          '.next/server/pages/de/test.html': '',
          '.next/server/pages/de/test2.html': '',
          '.next/server/pages/de/test3.json': '',
          '.next/server/pages/de/blog/[slug].html': '',
          '.next/server/pages/en/test.html': '',
          '.next/server/pages/en/test2.html': '',
          '.next/server/pages/en/test3.json': '',
          '.next/server/pages/en/blog/[slug].html': '',
        },
        ctx,
        {
          dynamicRoutes: {
            '/blog/[slug]': {
              fallback: '/blog/[slug].html',
            },
          },
          i18n: {
            locales: ['en', 'de'],
          },
        },
      )

      await copyStaticContent(pluginContext)
      const files = await glob('**/*', { cwd: pluginContext.blobDir, dot: true })

      const expectedStaticPages = [
        'de/blog/[slug].html',
        'de/test.html',
        'de/test2.html',
        'en/blog/[slug].html',
        'en/test.html',
        'en/test2.html',
      ]
      const expectedFallbacks = new Set(['en/blog/[slug].html', 'de/blog/[slug].html'])

      expect(files.map((path) => decodeBlobKey(path)).sort()).toEqual(expectedStaticPages)

      for (const page of expectedStaticPages) {
        const expectedIsFallback = expectedFallbacks.has(page)

        const blob = JSON.parse(
          await readFile(join(pluginContext.blobDir, await encodeBlobKey(page)), 'utf-8'),
        )

        expect(blob, `${page} should ${expectedIsFallback ? '' : 'not '}be a fallback`).toEqual({
          html: '',
          isFallback: expectedIsFallback,
        })
      }
    })
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
    ctx.relativeAppDir = 'apps/app-1'
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
    expect(await readDirRecursive(cwd)).toEqual(
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
      { basePath: '/base/path' },
    )

    await copyStaticAssets(pluginContext)
    expect(await readDirRecursive(cwd)).toEqual(
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
    expect(await readDirRecursive(cwd)).toEqual(
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
      { basePath: '/base/path' },
    )

    await copyStaticAssets(pluginContext)
    expect(await readDirRecursive(cwd)).toEqual(
      expect.arrayContaining([
        join(cwd, 'apps/app-1/public/another-asset.json'),
        join(cwd, 'apps/app-1/public/fake-image.svg'),
        join(pluginContext.staticDir, '/base/path/another-asset.json'),
        join(pluginContext.staticDir, '/base/path/fake-image.svg'),
      ]),
    )
  })

  describe('should copy the static pages to the publish directory if there are no corresponding JSON files and mark wether html file is a fallback', () => {
    test<Context>('no i18n', async ({ pluginContext, ...ctx }) => {
      await createFsFixtureWithBasePath(
        {
          'apps/app-1/.next/server/pages/test.html': '',
          'apps/app-1/.next/server/pages/test2.html': '',
          'apps/app-1/.next/server/pages/test3.json': '',
          'apps/app-1/.next/server/pages/blog/[slug].html': '',
        },
        ctx,
        {
          dynamicRoutes: {
            '/blog/[slug]': {
              fallback: '/blog/[slug].html',
            },
          },
        },
      )

      await copyStaticContent(pluginContext)
      const files = await glob('**/*', { cwd: pluginContext.blobDir, dot: true })

      const expectedStaticPages = ['blog/[slug].html', 'test.html', 'test2.html']
      const expectedFallbacks = new Set(['blog/[slug].html'])

      expect(files.map((path) => decodeBlobKey(path)).sort()).toEqual(expectedStaticPages)

      for (const page of expectedStaticPages) {
        const expectedIsFallback = expectedFallbacks.has(page)

        const blob = JSON.parse(
          await readFile(join(pluginContext.blobDir, await encodeBlobKey(page)), 'utf-8'),
        )

        expect(blob, `${page} should ${expectedIsFallback ? '' : 'not '}be a fallback`).toEqual({
          html: '',
          isFallback: expectedIsFallback,
        })
      }
    })

    test<Context>('with i18n', async ({ pluginContext, ...ctx }) => {
      await createFsFixtureWithBasePath(
        {
          'apps/app-1/.next/server/pages/de/test.html': '',
          'apps/app-1/.next/server/pages/de/test2.html': '',
          'apps/app-1/.next/server/pages/de/test3.json': '',
          'apps/app-1/.next/server/pages/de/blog/[slug].html': '',
          'apps/app-1/.next/server/pages/en/test.html': '',
          'apps/app-1/.next/server/pages/en/test2.html': '',
          'apps/app-1/.next/server/pages/en/test3.json': '',
          'apps/app-1/.next/server/pages/en/blog/[slug].html': '',
        },
        ctx,
        {
          dynamicRoutes: {
            '/blog/[slug]': {
              fallback: '/blog/[slug].html',
            },
          },
          i18n: {
            locales: ['en', 'de'],
          },
        },
      )

      await copyStaticContent(pluginContext)
      const files = await glob('**/*', { cwd: pluginContext.blobDir, dot: true })

      const expectedStaticPages = [
        'de/blog/[slug].html',
        'de/test.html',
        'de/test2.html',
        'en/blog/[slug].html',
        'en/test.html',
        'en/test2.html',
      ]
      const expectedFallbacks = new Set(['en/blog/[slug].html', 'de/blog/[slug].html'])

      expect(files.map((path) => decodeBlobKey(path)).sort()).toEqual(expectedStaticPages)

      for (const page of expectedStaticPages) {
        const expectedIsFallback = expectedFallbacks.has(page)

        const blob = JSON.parse(
          await readFile(join(pluginContext.blobDir, await encodeBlobKey(page)), 'utf-8'),
        )

        expect(blob, `${page} should ${expectedIsFallback ? '' : 'not '}be a fallback`).toEqual({
          html: '',
          isFallback: expectedIsFallback,
        })
      }
    })
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
