/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/?(photo)-**-**',
      },
      {
        hostname: '*.pixabay.com',
      },
    ],
    domains: ['images.pexels.com'],
  },
}

module.exports = nextConfig
