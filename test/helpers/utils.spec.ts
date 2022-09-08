import Chance from 'chance'
import { ExperimentalConfig } from 'next/dist/server/config-shared'
import { ImageConfigComplete } from 'next/dist/shared/lib/image-config'
import { getCustomImageResponseHeaders, getRemotePatterns, ImagesConfig } from '../../packages/runtime/src/helpers/utils'

const chance = new Chance()

describe('getCustomImageResponseHeaders', () => {
  it('returns null when no custom image response headers are found', () => {
    const mockHeaders = [{
      for: '/test',
      values: {
        'X-Foo': chance.string()
      }
    }]

    expect(getCustomImageResponseHeaders(mockHeaders)).toBe(null)
  })

  it('returns header values when custom image response headers are found', () => {
    const mockFooValue = chance.string()

    const mockHeaders = [{
      for: '/_next/image/',
      values: {
        'X-Foo': mockFooValue
      }
    }]

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
      images: {}
    } as ExperimentalConfig
  
    mockImages = {
      deviceSizes: [
        640,  750,  828,
        1080, 1200, 1920,
        2048, 3840
      ],
      imageSizes: [
        16,  32,  48,  64,
        96, 128, 256, 384
      ],
      path: '/_next/image',
      loader: 'default',
      domains: [],
      disableStaticImages: false,
      minimumCacheTTL: 60,
      formats: [ 'image/avif', 'image/webp' ],
      dangerouslyAllowSVG: false,
      contentSecurityPolicy: "script-src 'none'; frame-src 'none'; sandbox;",
      unoptimized: false
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
  
    expect(result).toStrictEqual(mockExperimentalConfig.images?.remotePatterns)  
  })
  it('returns an empty array', () => {
    const result = getRemotePatterns(mockExperimentalConfig, mockImages)
    expect(result).toStrictEqual([])
  })
})
