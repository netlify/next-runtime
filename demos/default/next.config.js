const path = require('path')

module.exports = {
  // Configurable site features we support:
  // distDir: 'build',
  generateBuildId: () => 'build-id',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es', 'fr'],
  },
  async headers() {
    return [
      {
        source: '/',
        headers: [
          {
            key: 'x-custom-header',
            value: 'my custom header value',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'x-custom-api-header',
            value: 'my custom api header value',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'x-custom-header-for-everything',
            value: 'my custom header for everything value',
          },
        ],
      },
    ]
  },
  trailingSlash: true,
  // Configurable site features _to_ support:
  // basePath: '/docs',
  // Rewrites allow you to map an incoming request path to a different destination path.
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/old/:path*',
          destination: '/:path*',
        },
      ],
      afterFiles: [
        {
          source: '/rewriteToStatic',
          destination: '/getStaticProps/1',
        },
      ],
    }
  },
  // Redirects allow you to redirect an incoming request path to a different destination path.
  async redirects() {
    return [
      {
        source: '/redirectme',
        destination: '/',
        permanent: true,
      },
    ]
  },
  // https://nextjs.org/docs/basic-features/image-optimization#domains
  images: {
    domains: ['raw.githubusercontent.com'],
    remotePatterns: [
      {
        hostname: '*.imgur.com',
      },
    ],
  },
  // https://nextjs.org/docs/basic-features/built-in-css-support#customizing-sass-options
  sassOptions: {
    includePaths: [path.join(__dirname, 'styles-sass-test')],
  },
  experimental: {
    optimizeCss: false,
    appDir: true,
  },
}
