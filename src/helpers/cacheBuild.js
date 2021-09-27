const path = require('path')

const DEFAULT_DIST_DIR = '.next'

// Account for possible custom distDir
const getPath = (siteRoot, distDir, source) => path.join(siteRoot, distDir || DEFAULT_DIST_DIR, source)

const restoreCache = async ({ cache, distDir, siteRoot }) => {
  const cacheDir = getPath(siteRoot, distDir, 'cache')
  if (await cache.restore(cacheDir)) {
    console.log('Next.js cache restored.')
  } else {
    console.log('No Next.js cache to restore.')
  }
}

const saveCache = async ({ cache, distDir, siteRoot }) => {
  const cacheDir = getPath(siteRoot, distDir, 'cache')

  const buildManifest = getPath(siteRoot, distDir, 'build-manifest.json')
  if (await cache.save(cacheDir, { digests: [buildManifest] })) {
    console.log('Next.js cache saved.')
  } else {
    console.log('No Next.js cache to save.')
  }
}

module.exports = {
  restoreCache,
  saveCache,
}
