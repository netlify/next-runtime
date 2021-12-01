import { posix } from 'path'

export const restoreCache = async ({ cache, publish }) => {
  const cacheDir = posix.join(publish, 'cache')

  if (await cache.restore(cacheDir)) {
    console.log('Next.js cache restored.')
  } else {
    console.log('No Next.js cache to restore.')
  }
}

export const saveCache = async ({ cache, publish }) => {
  const cacheDir = posix.join(publish, 'cache')

  const buildManifest = posix.join(publish, 'build-manifest.json')
  if (await cache.save(cacheDir, { digests: [buildManifest] })) {
    console.log('Next.js cache saved.')
  } else {
    console.log('No Next.js cache to save.')
  }
}