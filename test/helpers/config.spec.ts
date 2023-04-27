import type { NetlifyPluginOptions } from '@netlify/build'

import { generateCustomHeaders, NextConfig } from '../../packages/runtime/src/helpers/config'

const netlifyConfig = {
  build: { command: 'npm run build' },
  functions: {},
  redirects: [],
  headers: [],
} as NetlifyPluginOptions['netlifyConfig']

describe('generateCustomHeaders', () => {
  // The routesManifest is the contents of the routes-manifest.json file which will already contain the generated
  // header paths which take locales and base path into account which is why you'll see them in the paths already
  // in test data.

  it('sets custom headers in the Netlify configuration', () => {
    const nextConfig = {
      routesManifest: {
        headers: [
          // single header for a route
          {
            source: '/',
            headers: [
              {
                key: 'X-Unit-Test',
                value: 'true',
              },
            ],
            regex: '^/(?:/)?$',
          },
          // multiple headers for a route
          {
            source: '/unit-test',
            headers: [
              {
                key: 'X-Another-Unit-Test',
                value: 'true',
              },
              {
                key: 'X-Another-Unit-Test-Again',
                value: 'true',
              },
            ],
            regex: '^/(?:/)?$',
          },
        ],
      },
    } as unknown as NextConfig

    generateCustomHeaders(nextConfig, netlifyConfig.headers)

    expect(netlifyConfig.headers).toEqual([
      {
        for: '/',
        values: {
          'X-Unit-Test': 'true',
        },
      },
      {
        for: '/unit-test',
        values: {
          'X-Another-Unit-Test': 'true',
          'X-Another-Unit-Test-Again': 'true',
        },
      },
    ])
  })

  it('sets custom headers using a splat instead of a named splat in the Netlify configuration', () => {
    netlifyConfig.headers = []

    const nextConfig = {
      routesManifest: {
        headers: [
          // single header for a route
          {
            source: '/:path*',
            headers: [
              {
                key: 'X-Unit-Test',
                value: 'true',
              },
            ],
            regex: '^/(?:/)?$',
          },
          // multiple headers for a route
          {
            source: '/some-other-path/:path*',
            headers: [
              {
                key: 'X-Another-Unit-Test',
                value: 'true',
              },
              {
                key: 'X-Another-Unit-Test-Again',
                value: 'true',
              },
            ],
            regex: '^/(?:/)?$',
          },
          {
            source: '/some-other-path/yolo/:path*',
            headers: [
              {
                key: 'X-Another-Unit-Test',
                value: 'true',
              },
            ],
            regex: '^/(?:/)?$',
          },
        ],
      },
    } as unknown as NextConfig

    generateCustomHeaders(nextConfig, netlifyConfig.headers)

    expect(netlifyConfig.headers).toEqual([
      {
        for: '/*',
        values: {
          'X-Unit-Test': 'true',
        },
      },
      {
        for: '/some-other-path/*',
        values: {
          'X-Another-Unit-Test': 'true',
          'X-Another-Unit-Test-Again': 'true',
        },
      },
      {
        for: '/some-other-path/yolo/*',
        values: {
          'X-Another-Unit-Test': 'true',
        },
      },
    ])
  })

  it('appends custom headers in the Netlify configuration', () => {
    netlifyConfig.headers = [
      {
        for: '/',
        values: {
          'X-Existing-Header': 'true',
        },
      },
    ]

    const nextConfig = {
      routesManifest: {
        headers: [
          // single header for a route
          {
            source: '/',
            headers: [
              {
                key: 'X-Unit-Test',
                value: 'true',
              },
            ],
            regex: '^/(?:/)?$',
          },
          // multiple headers for a route
          {
            source: '/unit-test',
            headers: [
              {
                key: 'X-Another-Unit-Test',
                value: 'true',
              },
              {
                key: 'X-Another-Unit-Test-Again',
                value: 'true',
              },
            ],
            regex: '^/(?:/)?$',
          },
        ],
      },
    } as unknown as NextConfig

    generateCustomHeaders(nextConfig, netlifyConfig.headers)

    expect(netlifyConfig.headers).toEqual([
      {
        for: '/',
        values: {
          'X-Existing-Header': 'true',
        },
      },
      {
        for: '/',
        values: {
          'X-Unit-Test': 'true',
        },
      },
      {
        for: '/unit-test',
        values: {
          'X-Another-Unit-Test': 'true',
          'X-Another-Unit-Test-Again': 'true',
        },
      },
    ])
  })

  it('sets custom headers using basePath in the Next.js configuration', () => {
    netlifyConfig.headers = []

    const basePath = '/base-path'
    const nextConfig = {
      routesManifest: {
        headers: [
          // single header for a route
          {
            source: `${basePath}/:path*`,
            headers: [
              {
                key: 'X-Unit-Test',
                value: 'true',
              },
            ],
            regex: '^/(?:/)?$',
          },
          // multiple headers for a route
          {
            source: `${basePath}/some-other-path/:path*`,
            headers: [
              {
                key: 'X-Another-Unit-Test',
                value: 'true',
              },
              {
                key: 'X-Another-Unit-Test-Again',
                value: 'true',
              },
            ],
            regex: '^/(?:/)?$',
          },
        ],
      },
    } as unknown as NextConfig

    generateCustomHeaders(nextConfig, netlifyConfig.headers)

    expect(netlifyConfig.headers).toEqual([
      {
        for: '/base-path/*',
        values: {
          'X-Unit-Test': 'true',
        },
      },
      {
        for: '/base-path/some-other-path/*',
        values: {
          'X-Another-Unit-Test': 'true',
          'X-Another-Unit-Test-Again': 'true',
        },
      },
    ])
  })

  it('sets custom headers omitting basePath when a header has basePath set to false', () => {
    netlifyConfig.headers = []

    const basePath = '/base-path'

    const nextConfig = {
      routesManifest: {
        headers: [
          // single header for a route
          {
            source: '/:path*',
            headers: [
              {
                key: 'X-Unit-Test',
                value: 'true',
              },
            ],
            basePath: false,
            regex: '^/(?:/)?$',
          },
          // multiple headers for a route
          {
            source: `${basePath}/some-other-path/:path*`,
            headers: [
              {
                key: 'X-Another-Unit-Test',
                value: 'true',
              },
            ],
            regex: '^/(?:/)?$',
          },
        ],
      },
    } as unknown as NextConfig

    generateCustomHeaders(nextConfig, netlifyConfig.headers)

    expect(netlifyConfig.headers).toEqual([
      {
        for: '/*',
        values: {
          'X-Unit-Test': 'true',
        },
      },
      {
        for: '/base-path/some-other-path/*',
        values: {
          'X-Another-Unit-Test': 'true',
        },
      },
    ])
  })

  it('prepends locales set in the next.config to paths for custom headers', () => {
    netlifyConfig.headers = []

    // I'm not setting locales in the nextConfig, because at this point in the post build when this runs,
    // Next.js has modified the routesManifest to have the locales in the source.
    const nextConfig = {
      i18n: {
        locales: ['en-US', 'fr'],
        defaultLocale: 'en',
      },
      routesManifest: {
        headers: [
          {
            source: '/:nextInternalLocale(en\\-US|fr)/with-locale/:path*',
            headers: [
              {
                key: 'X-Unit-Test',
                value: 'true',
              },
            ],
            regex: '^/(?:/)?$',
          },
        ],
      },
    } as unknown as NextConfig

    generateCustomHeaders(nextConfig, netlifyConfig.headers)

    expect(netlifyConfig.headers).toEqual([
      {
        for: '/with-locale/*',
        values: {
          'X-Unit-Test': 'true',
        },
      },
      {
        for: '/en-US/with-locale/*',
        values: {
          'X-Unit-Test': 'true',
        },
      },
      {
        for: '/fr/with-locale/*',
        values: {
          'X-Unit-Test': 'true',
        },
      },
    ])
  })

  it('does not prepend locales set in the next.config to custom headers that have locale set to false', () => {
    netlifyConfig.headers = []

    const nextConfig = {
      i18n: {
        locales: ['en', 'fr'],
        defaultLocale: 'en',
      },
      routesManifest: {
        headers: [
          {
            source: '/:nextInternalLocale(en|fr)/with-locale/:path*',
            headers: [
              {
                key: 'X-Unit-Test',
                value: 'true',
              },
            ],
            regex: '^/(?:/)?$',
          },
          {
            source: '/fr/le-custom-locale-path/:path*',
            locale: false,
            headers: [
              {
                key: 'X-Unit-Test',
                value: 'true',
              },
            ],
            regex: '^/(?:/)?$',
          },
        ],
      },
    } as unknown as NextConfig

    generateCustomHeaders(nextConfig, netlifyConfig.headers)

    expect(netlifyConfig.headers).toEqual([
      {
        for: '/with-locale/*',
        values: {
          'X-Unit-Test': 'true',
        },
      },
      {
        for: '/en/with-locale/*',
        values: {
          'X-Unit-Test': 'true',
        },
      },
      {
        for: '/fr/with-locale/*',
        values: {
          'X-Unit-Test': 'true',
        },
      },
      {
        for: '/fr/le-custom-locale-path/*',
        values: {
          'X-Unit-Test': 'true',
        },
      },
    ])
  })
})
