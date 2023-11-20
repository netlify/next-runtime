import { expect, test, describe, vi, afterEach } from 'vitest'
import { setCacheControlHeaders, setVaryHeaders, setCacheTagsHeaders } from './headers.js'
import type { NextConfigComplete } from 'next/dist/server/config-shared.js'
import { PageCacheValue } from '../build/content/prerendered.js'

describe('headers', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('setVaryHeaders', () => {
    const defaultConfig = {
      basePath: '',
      i18n: null,
    } satisfies Partial<NextConfigComplete>

    const defaultUrl = 'https://example.com'

    describe('should set "netlify-vary" header', () => {
      test('with expected default value', () => {
        const headers = new Headers()
        const request = new Request(defaultUrl)
        vi.spyOn(headers, 'set')

        setVaryHeaders(headers, request, defaultConfig)

        expect(headers.set).toBeCalledWith(
          'netlify-vary',
          'cookie=__prerender_bypass|__next_preview_data',
        )
      })

      test('with expected vary headers', () => {
        const givenHeaders = {
          vary: 'Accept, Accept-Language',
        }
        const headers = new Headers(givenHeaders)
        const request = new Request(defaultUrl)
        vi.spyOn(headers, 'set')

        setVaryHeaders(headers, request, defaultConfig)

        expect(headers.set).toBeCalledWith(
          'netlify-vary',
          'header=Accept|Accept-Language,cookie=__prerender_bypass|__next_preview_data',
        )
      })

      test('with no languages if i18n config has localeDetection disabled', () => {
        const headers = new Headers()
        const request = new Request(defaultUrl)
        const config = {
          ...defaultConfig,
          i18n: {
            localeDetection: false,
            locales: ['en', 'de'],
            defaultLocale: 'default',
          },
        } satisfies Partial<NextConfigComplete>
        vi.spyOn(headers, 'set')

        setVaryHeaders(headers, request, config)

        expect(headers.set).toBeCalledWith(
          'netlify-vary',
          'cookie=__prerender_bypass|__next_preview_data',
        )
      })

      test('with no languages if path is root index', () => {
        const headers = new Headers()
        const request = new Request(`${defaultUrl}/another/path`)
        const config = {
          ...defaultConfig,
          i18n: {
            locales: ['en', 'de'],
            defaultLocale: 'default',
          },
        }
        vi.spyOn(headers, 'set')

        setVaryHeaders(headers, request, config)

        expect(headers.set).toBeCalledWith(
          'netlify-vary',
          'cookie=__prerender_bypass|__next_preview_data',
        )
      })

      test('with expected languages if i18n config has locales', () => {
        const headers = new Headers()
        const request = new Request(defaultUrl)
        const config = {
          ...defaultConfig,
          i18n: {
            locales: ['en', 'de', 'fr'],
            defaultLocale: 'default',
          },
        }
        vi.spyOn(headers, 'set')

        setVaryHeaders(headers, request, config)

        expect(headers.set).toBeCalledWith(
          'netlify-vary',
          'language=en|de|fr,cookie=__prerender_bypass|__next_preview_data|NEXT_LOCALE',
        )
      })

      test('with expected languages if i18n config has locales and basePath matches the current path', () => {
        const headers = new Headers()
        const request = new Request(`${defaultUrl}/base/path`)
        const config = {
          ...defaultConfig,
          basePath: '/base/path',
          i18n: {
            locales: ['en', 'de', 'fr'],
            defaultLocale: 'default',
          },
        }
        vi.spyOn(headers, 'set')

        setVaryHeaders(headers, request, config)

        expect(headers.set).toBeCalledWith(
          'netlify-vary',
          'language=en|de|fr,cookie=__prerender_bypass|__next_preview_data|NEXT_LOCALE',
        )
      })
    })
  })

  describe('setCacheControlHeaders', () => {
    test('should not set any headers if "cache-control" is not set', () => {
      const headers = new Headers()
      vi.spyOn(headers, 'set')

      setCacheControlHeaders(headers)

      expect(headers.set).toHaveBeenCalledTimes(0)
    })

    test('should not set any headers if "cache-control" is set and "cdn-cache-control" is present', () => {
      const givenHeaders = {
        'cache-control': 'public, max-age=0, must-revalidate',
        'cdn-cache-control': 'public, max-age=0, must-revalidate',
      }
      const headers = new Headers(givenHeaders)
      vi.spyOn(headers, 'set')

      setCacheControlHeaders(headers)

      expect(headers.set).toHaveBeenCalledTimes(0)
    })

    test('should not set any headers if "cache-control" is set and "netlify-cdn-cache-control" is present', () => {
      const givenHeaders = {
        'cache-control': 'public, max-age=0, must-revalidate',
        'netlify-cdn-cache-control': 'public, max-age=0, must-revalidate',
      }
      const headers = new Headers(givenHeaders)
      vi.spyOn(headers, 'set')

      setCacheControlHeaders(headers)

      expect(headers.set).toHaveBeenCalledTimes(0)
    })

    test('should set expected headers if "cache-control" is set and "cdn-cache-control" and "netlify-cdn-cache-control" are not present', () => {
      const givenHeaders = {
        'cache-control': 'public, max-age=0, must-revalidate',
      }
      const headers = new Headers(givenHeaders)
      vi.spyOn(headers, 'set')

      setCacheControlHeaders(headers)

      expect(headers.set).toHaveBeenNthCalledWith(
        1,
        'cache-control',
        'public, max-age=0, must-revalidate',
      )
      expect(headers.set).toHaveBeenNthCalledWith(
        2,
        'netlify-cdn-cache-control',
        'public, max-age=0, must-revalidate',
      )
    })

    test('should remove "s-maxage" from "cache-control" header', () => {
      const givenHeaders = {
        'cache-control': 'public, s-maxage=604800',
      }
      const headers = new Headers(givenHeaders)
      vi.spyOn(headers, 'set')

      setCacheControlHeaders(headers)

      expect(headers.set).toHaveBeenNthCalledWith(1, 'cache-control', 'public')
      expect(headers.set).toHaveBeenNthCalledWith(
        2,
        'netlify-cdn-cache-control',
        'public, s-maxage=604800',
      )
    })

    test('should remove "stale-while-revalidate" from "cache-control" header', () => {
      const givenHeaders = {
        'cache-control': 'max-age=604800, stale-while-revalidate=86400',
      }
      const headers = new Headers(givenHeaders)
      vi.spyOn(headers, 'set')

      setCacheControlHeaders(headers)

      expect(headers.set).toHaveBeenNthCalledWith(1, 'cache-control', 'max-age=604800')
      expect(headers.set).toHaveBeenNthCalledWith(
        2,
        'netlify-cdn-cache-control',
        'max-age=604800, stale-while-revalidate=86400',
      )
    })

    test('should set default "cache-control" header if it contains only "s-maxage" and "stale-whie-revalidate"', () => {
      const givenHeaders = {
        'cache-control': 's-maxage=604800, stale-while-revalidate=86400',
      }
      const headers = new Headers(givenHeaders)
      vi.spyOn(headers, 'set')

      setCacheControlHeaders(headers)

      expect(headers.set).toHaveBeenNthCalledWith(
        1,
        'cache-control',
        'public, max-age=0, must-revalidate',
      )
      expect(headers.set).toHaveBeenNthCalledWith(
        2,
        'netlify-cdn-cache-control',
        's-maxage=604800, stale-while-revalidate=86400',
      )
    })
  })

  describe('setCacheTagsHeaders', () => {
    const appValue = {
      kind: 'PAGE',
      html: '<!DOCTYPE html><html lang="en">',
      pageData: 'Data from rsc file',
      headers: { 'x-next-cache-tags': '_N_T_/layout,_N_T_/page,_N_T_/' },
      status: 200,
    } satisfies PageCacheValue

    const pageValue = {
      kind: 'PAGE',
      html: '<!DOCTYPE html><html lang="en">',
      pageData: { pageProps: { foo: 'bar' } },
      status: 200,
    } satisfies PageCacheValue | { pageData: Object }

    test('Should set cache-tag header for app routes using tag in headers[x-next-cache-tags] from cache value', () => {
      const cacheEntry = {
        lastModified: 1699843226944,
        value: appValue,
      }

      const headers = new Headers()
      vi.spyOn(headers, 'set')
      setCacheTagsHeaders(new Request('https://example.com/index'), headers, cacheEntry)

      expect(headers.set).toHaveBeenNthCalledWith(1, 'cache-tag', '_N_T_/layout,_N_T_/page,_N_T_/')
    })

    test('Should set cache-tag header for page routes using pathname as the tag', () => {
      const cacheEntry: any = {
        lastModified: 1699843226944,
        value: pageValue,
      }

      const headers = new Headers()
      vi.spyOn(headers, 'set')
      setCacheTagsHeaders(new Request('https://example.com/index'), headers, cacheEntry)

      expect(headers.set).toHaveBeenNthCalledWith(1, 'cache-tag', '/index')
    })

    test('Should not return any cache-tags if data is null', () => {
      const cacheEntry: any = {
        lastModified: 1699843226944,
        value: null,
      }

      const headers = new Headers()
      vi.spyOn(headers, 'set')

      expect(
        setCacheTagsHeaders(new Request('https://example.com/index'), headers, cacheEntry),
      ).toBeUndefined()
    })
  })
})
