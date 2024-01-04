/** @type {import('next').NextConfig} */
module.exports = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: ['@repo/ui'],
}
