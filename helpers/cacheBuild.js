const path = require('path')

const DEFAULT_DIST_DIR = '.next'

// Account for possible custom distDir
const getPath = (distDir, source) => {
  return path.join(distDir || DEFAULT_DIST_DIR, source)
}

const restoreCache = async ({ cache, distDir }) => {
  const cacheDir = getPath(distDir, 'cache')
  if (await cache.restore(cacheDir)) {
    console.log('Next.js cache restored.')
  } else {
    console.log('No Next.js cache to restore.')
  }
}

const saveCache = async ({ cache, distDir }) => {
  const cacheDir = getPath(distDir, 'cache')
  const buildManifest = getPath(distDir, 'build-manifest.json')
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
