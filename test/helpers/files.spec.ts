import {
  matchMiddleware,
  stripLocale,
  matchesRedirect,
  matchesRewrite,
  patchNextFiles,
  unpatchNextFiles,
  getDependenciesOfFile,
} from "../../packages/runtime/src/helpers/files"
import {
  readFileSync,
  copy,
  ensureDir,
} from "fs-extra"
import path from "path"
import { dirname } from "path"
import { resolve } from 'pathe'
import { join } from "pathe"
import { Rewrites } from "../../packages/runtime/src/helpers/types"

const REDIRECTS: Rewrites = [
  {
    source: '/:file((?!\\.well-known(?:/.*)?)(?:[^/]+/)*[^/]+\\.\\w+)/',
    destination: '/:file',
    locale: false,
    internal: true,
    statusCode: 308,
    regex: '^(?:/((?!\\.well-known(?:/.*)?)(?:[^/]+/)*[^/]+\\.\\w+))/$',
  },
  {
    source: '/:notfile((?!\\.well-known(?:/.*)?)(?:[^/]+/)*[^/\\.]+)',
    destination: '/:notfile/',
    locale: false,
    internal: true,
    statusCode: 308,
    regex: '^(?:/((?!\\.well-known(?:/.*)?)(?:[^/]+/)*[^/\\.]+))$',
  },
  {
    source: '/en/redirectme',
    destination: '/',
    statusCode: 308,
    regex: '^(?!/_next)/en/redirectme(?:/)?$',
  },
  {
    source: '/:nextInternalLocale(en|es|fr)/redirectme',
    destination: '/:nextInternalLocale/',
    statusCode: 308,
    regex: '^(?!/_next)(?:/(en|es|fr))/redirectme(?:/)?$',
  },
]

const REWRITES: Rewrites = [
  {
    source: '/:nextInternalLocale(en|es|fr)/old/:path*',
    destination: '/:nextInternalLocale/:path*',
    regex: '^(?:/(en|es|fr))/old(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))?(?:/)?$',
    statusCode: 308,
  },
]

describe('files utility functions', () => {
  test('middleware tester matches correct paths', () => {
    const middleware = ['middle', 'sub/directory']
    const paths = [
      'middle.html',
      'middle',
      'middle/',
      'middle/ware',
      'sub/directory',
      'sub/directory.html',
      'sub/directory/child',
      'sub/directory/child.html',
    ]
    for (const path of paths) {
      expect(matchMiddleware(middleware, path)).toBeTruthy()
    }
  })

  test('middleware tester does not match incorrect paths', () => {
    const middleware = ['middle', 'sub/directory']
    const paths = [
      'middl',
      '',
      'somethingelse',
      'another.html',
      'another/middle.html',
      'sub/anotherdirectory.html',
      'sub/directoryelse',
      'sub/directoryelse.html',
    ]
    for (const path of paths) {
      expect(matchMiddleware(middleware, path)).toBeFalsy()
    }
  })

  test('middleware tester matches root middleware', () => {
    const middleware = ['']
    const paths = [
      'middl',
      '',
      'somethingelse',
      'another.html',
      'another/middle.html',
      'sub/anotherdirectory.html',
      'sub/directoryelse',
      'sub/directoryelse.html',
    ]
    for (const path of paths) {
      expect(matchMiddleware(middleware, path)).toBeTruthy()
    }
  })

  test('middleware tester matches root middleware', () => {
    const paths = [
      'middl',
      '',
      'somethingelse',
      'another.html',
      'another/middle.html',
      'sub/anotherdirectory.html',
      'sub/directoryelse',
      'sub/directoryelse.html',
    ]
    for (const path of paths) {
      expect(matchMiddleware(undefined, path)).toBeFalsy()
    }
  })

  test('stripLocale correctly strips matching locales', () => {
    const locales = ['en', 'fr', 'en-GB']
    const paths = [
      ['en/file.html', 'file.html'],
      ['fr/file.html', 'file.html'],
      ['en-GB/file.html', 'file.html'],
      ['file.html', 'file.html'],
    ]

    for (const [path, expected] of paths) {
      expect(stripLocale(path, locales)).toEqual(expected)
    }
  })

  test('stripLocale does not touch non-matching matching locales', () => {
    const locales = ['en', 'fr', 'en-GB']
    const paths = ['de/file.html', 'enfile.html', 'en-US/file.html']
    for (const path of paths) {
      expect(stripLocale(path, locales)).toEqual(path)
    }
  })

  test('matchesRedirect correctly matches paths with locales', () => {
    const paths = ['en/redirectme.html', 'en/redirectme.json', 'fr/redirectme.html', 'fr/redirectme.json']
    paths.forEach((path) => {
      expect(matchesRedirect(path, REDIRECTS)).toBeTruthy()
    })
  })

  test("matchesRedirect doesn't match paths with invalid locales", () => {
    const paths = ['dk/redirectme.html', 'dk/redirectme.json', 'gr/redirectme.html', 'gr/redirectme.json']
    paths.forEach((path) => {
      expect(matchesRedirect(path, REDIRECTS)).toBeFalsy()
    })
  })

  test("matchesRedirect doesn't match internal redirects", () => {
    const paths = ['en/notrailingslash']
    paths.forEach((path) => {
      expect(matchesRedirect(path, REDIRECTS)).toBeFalsy()
    })
  })

  it('matchesRewrite matches array of rewrites', () => {
    expect(matchesRewrite('en/old/page.html', REWRITES)).toBeTruthy()
  })

  it('matchesRewrite matches beforeFiles rewrites', () => {
    expect(matchesRewrite('en/old/page.html', { beforeFiles: REWRITES })).toBeTruthy()
  })

  it("matchesRewrite doesn't match afterFiles rewrites", () => {
    expect(matchesRewrite('en/old/page.html', { afterFiles: REWRITES })).toBeFalsy()
  })

  it('matchesRewrite matches various paths', () => {
    const paths = ['en/old/page.html', 'fr/old/page.html', 'en/old/deep/page.html', 'en/old.html']
    paths.forEach((path) => {
      expect(matchesRewrite(path, REWRITES)).toBeTruthy()
    })
  })

  test.only('patches Next server files', async () => {
    const root = path.resolve(dirname(__dirname))
    console.log({ root })
    // await copy(join(root, 'package.json'), path.join(process.cwd(), 'package.json'))
    // await ensureDir(path.join(process.cwd(), 'node_modules'))
    // await copy(path.join(root, 'node_modules', 'next'), path.join(process.cwd(), 'node_modules', 'next'))

    // await patchNextFiles(process.cwd())
    const serverFile = path.resolve(process.cwd(), 'node_modules', 'next', 'dist', 'server', 'base-server.js')
    const patchedData = await readFileSync(serverFile, 'utf8')
    expect(patchedData.includes('_REVALIDATE_SSG')).toBeTruthy()
    expect(patchedData.includes('private: isPreviewMode && cachedData')).toBeTruthy()

    // await unpatchNextFiles(process.cwd())

    const unPatchedData = await readFileSync(serverFile, 'utf8')
    expect(unPatchedData.includes('_REVALIDATE_SSG')).toBeFalsy()
    expect(unPatchedData.includes('private: isPreviewMode && cachedData')).toBeFalsy()
  })
})

describe('dependency tracing', () => {
  it('generates dependency list from a source file', async () => {
    const dependencies = await getDependenciesOfFile(resolve(__dirname, '../fixtures/analysis/background.js'))
    expect(dependencies).toEqual(
      ['test/webpack-api-runtime.js', 'package.json'].map((dep) => resolve(dirname(__dirname), dep)),
    )
  })
})