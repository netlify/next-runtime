/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return {
      afterFiles: [
        {
          source: '/old/:path*',
          destination: '/:path*',
        },
      ],
      beforeFiles: [
        {
          source: '/aa/:path*',
          destination: '/:path*',
        },
      ],
    }
  },
  generateBuildId: () => 'build-id',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'de-DE'],
  },
}

module.exports = nextConfig
