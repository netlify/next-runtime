/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'custom-dist',
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
