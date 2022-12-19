module.exports = {
  experimental: {
    appDir: true,
  },
  assetPrefix: '/assets',
  rewrites() {
    return {
      beforeFiles: [{ source: '/assets/:path*', destination: '/:path*' }],
    }
  },
}
