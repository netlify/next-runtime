/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  generateBuildId: () => 'build-id',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'de-DE'],
  },
  skipMiddlewareUrlNormalize: true,
}

module.exports = nextConfig
