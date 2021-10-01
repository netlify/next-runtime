const { join } = require('path')

exports.restoreCache = async ({ cache, publish }) => {
  const cacheDir = join(publish, 'cache')
  if (await cache.restore(cacheDir)) {
    console.log('Next.js cache restored.')
  } else {
    console.log('No Next.js cache to restore.')
  }
}

exports.saveCache = async ({ cache, publish }) => {
  const cacheDir = join(publish, 'cache')

  const buildManifest = join(publish, 'build-manifest.json')
  if (await cache.save(cacheDir, { digests: [buildManifest] })) {
    console.log('Next.js cache saved.')
  } else {
    console.log('No Next.js cache to save.')
  }
}
