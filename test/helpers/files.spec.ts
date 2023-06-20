import path, { dirname } from 'path'

import { readFileSync, copy, ensureDir } from 'fs-extra'
import { resolve, join } from 'pathe'

import {
  matchMiddleware,
  stripLocale,
  matchesRedirect,
  matchesRewrite,
  getDependenciesOfFile,
  getSourceFileForPage,
} from '../../packages/runtime/src/helpers/files'
import { Rewrites } from '../../packages/runtime/src/helpers/types'
import { describeCwdTmpDir } from '../test-utils'

const TEST_DIR = resolve(__dirname, '..')

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
  it('middleware tester matches correct paths', () => {
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

  it('middleware tester does not match incorrect paths', () => {
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

  it('middleware tester matches root middleware', () => {
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

  it('middleware tester does not match undefined', () => {
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

  it('stripLocale correctly strips matching locales', () => {
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

  it('stripLocale does not touch non-matching matching locales', () => {
    const locales = ['en', 'fr', 'en-GB']
    const paths = ['de/file.html', 'enfile.html', 'en-US/file.html']
    for (const path of paths) {
      expect(stripLocale(path, locales)).toEqual(path)
    }
  })

  it('matchesRedirect correctly matches paths with locales', () => {
    const paths = ['en/redirectme.html', 'en/redirectme.json', 'fr/redirectme.html', 'fr/redirectme.json']
    paths.forEach((path) => {
      expect(matchesRedirect(path, REDIRECTS)).toBeTruthy()
    })
  })

  it("matchesRedirect doesn't match paths with invalid locales", () => {
    const paths = ['dk/redirectme.html', 'dk/redirectme.json', 'gr/redirectme.html', 'gr/redirectme.json']
    paths.forEach((path) => {
      expect(matchesRedirect(path, REDIRECTS)).toBeFalsy()
    })
  })

  it("matchesRedirect doesn't match internal redirects", () => {
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
})

describe('dependency tracing', () => {
  it('generates dependency list from a source file', async () => {
    const dependencies = await getDependenciesOfFile(resolve(__dirname, '../fixtures/analysis/background.js'))
    expect(dependencies).toEqual(
      ['test/webpack-api-runtime.js', 'package.json'].map((dep) => resolve(dirname(TEST_DIR), dep)),
    )
  })
})

describe('getSourceFileForPage', () => {
  it('handles default pageExtensions', () => {
    const pagesDir = resolve(__dirname, '../fixtures/page-extensions/default/pages')
    const apiRoute = '/api/default'

    const filePath = getSourceFileForPage(apiRoute, [pagesDir])

    expect(filePath.replace(TEST_DIR, '')).toBe('/fixtures/page-extensions/default/pages/api/default.js')
  })

  it('handles custom pageExtensions', () => {
    const pagesDir = resolve(__dirname, '../fixtures/page-extensions/custom/pages')
    const apiRoute = '/api/custom'

    const filePath = getSourceFileForPage(apiRoute, [pagesDir], ['api.js'])

    expect(filePath.replace(TEST_DIR, '')).toBe('/fixtures/page-extensions/custom/pages/api/custom.api.js')
  })

  it('handles getting file when index of folder', () => {
    const pagesDir = resolve(__dirname, '../fixtures/page-extensions/index/pages')
    const apiRoute = '/api/index'

    const filePath = getSourceFileForPage(apiRoute, [pagesDir])

    expect(filePath.replace(TEST_DIR, '')).toBe('/fixtures/page-extensions/index/pages/api/index/index.js')
  })
})
