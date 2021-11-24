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
}
