/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  distDir: 'cool/output',
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
