/** @type {import('next').NextConfig} */
const nextConfig = {
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
  sassOptions: {
    includePaths: [path.join(__dirname, 'styles-sass-test')],
  },
  experimental: {
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: '*.githubusercontent.com',
        },
      ],
    },
  },
}

module.exports = nextConfig
