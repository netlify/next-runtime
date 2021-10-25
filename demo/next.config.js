module.exports = {
  // Configurable site features we support:
  // distDir: 'build',
  generateBuildId: () => 'build-id',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es', 'fr']
  },
  // trailingSlash: true,
  // Configurable site features _to_ support:
  // basePath: '/docs',
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/old/:path*',
          destination: '/:path*',
        }
      ]
    }
  }
}
