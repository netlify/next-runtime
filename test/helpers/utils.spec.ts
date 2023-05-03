import Chance from 'chance'
import { ExperimentalConfig } from 'next/dist/server/config-shared'

import {
  getCustomImageResponseHeaders,
  getRemotePatterns,
  ImagesConfig,
  redirectsForNext404Route,
} from '../../packages/runtime/src/helpers/utils'

const chance = new Chance()

describe('getCustomImageResponseHeaders', () => {
  it('returns null when no custom image response headers are found', () => {
    const mockHeaders = [
      {
        for: '/test',
        values: {
          'X-Foo': chance.string(),
        },
      },
    ]

    expect(getCustomImageResponseHeaders(mockHeaders)).toBe(null)
  })

  it('returns header values when custom image response headers are found', () => {
    const mockFooValue = chance.string()

    const mockHeaders = [
      {
        for: '/_next/image/',
        values: {
          'X-Foo': mockFooValue,
        },
      },
    ]

    const result = getCustomImageResponseHeaders(mockHeaders)
    expect(result).toStrictEqual({
      'X-Foo': mockFooValue,
    })
  })
})

describe('getRemotePatterns', () => {
  let mockExperimentalConfig
  let mockImages
  beforeEach(() => {
    mockExperimentalConfig = {
      images: {},
    } as ExperimentalConfig

    mockImages = {
      deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
      imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
      path: '/_next/image',
      loader: 'default',
      domains: [],
      disableStaticImages: false,
      minimumCacheTTL: 60,
      formats: ['image/avif', 'image/webp'],
      dangerouslyAllowSVG: false,
      contentSecurityPolicy: "script-src 'none'; frame-src 'none'; sandbox;",
      unoptimized: false,
      remotePatterns: [],
    } as ImagesConfig
  })

  it('returns the remote patterns found under experimental.images', () => {
    mockExperimentalConfig.images.remotePatterns = [
      {
        protocol: 'https',
        hostname: '*.githubusercontent.com',
      },
    ]
    const result = getRemotePatterns(mockExperimentalConfig, mockImages)

    expect(result).toStrictEqual(mockExperimentalConfig.images?.remotePatterns)
  })

  it('returns the remote patterns found under images', () => {
    mockImages.remotePatterns = [
      {
        protocol: 'https',
        hostname: '*.githubusercontent.com',
      },
    ]
    const result = getRemotePatterns(mockExperimentalConfig, mockImages)

    expect(result).toStrictEqual(mockImages.remotePatterns)
  })

  it('returns an empty array', () => {
    const result = getRemotePatterns(mockExperimentalConfig, mockImages)
    expect(result).toStrictEqual([])
  })
})

describe('redirectsForNext404Route', () => {
  it('returns static 404 redirects', () => {
    const mockRoute = {
      route: '/test',
      buildId: 'test',
      basePath: '',
      i18n: null,
    }

    expect(redirectsForNext404Route(mockRoute)).toStrictEqual([
      { force: false, from: '/_next/data/test/test.json', status: 404, to: '/server/pages/404.html' },
      { force: false, from: '/test', status: 404, to: '/server/pages/404.html' },
    ])
  })

  it('returns localised static 404 redirects when i18n locales are provided', () => {
    const mockRoute = {
      route: '/test',
      buildId: 'test',
      basePath: '',
      i18n: {
        defaultLocale: 'en',
        locales: ['en', 'es', 'fr'],
      },
    }

    expect(redirectsForNext404Route(mockRoute)).toStrictEqual([
      { force: false, from: '/_next/data/test/en/test.json', status: 404, to: '/server/pages/en/404.html' },
      { force: false, from: '/test', status: 404, to: '/server/pages/en/404.html' },
      { force: false, from: '/_next/data/test/es/test.json', status: 404, to: '/server/pages/es/404.html' },
      { force: false, from: '/es/test', status: 404, to: '/server/pages/es/404.html' },
      { force: false, from: '/_next/data/test/fr/test.json', status: 404, to: '/server/pages/fr/404.html' },
      { force: false, from: '/fr/test', status: 404, to: '/server/pages/fr/404.html' },
    ])
  })
})
