import { existsSync } from 'fs'
import { join, resolve } from 'path'

import logger from './logger'
import { shouldSkip } from './utils'

const findDistDir = (publish) => {
  // In normal operation, the dist dir is the same as the publish dir
  if (!shouldSkip()) {
    return publish
  }
  // In this situation, the user has disabled the next-runtime, which means that they might be using next export,
  // so we'll look in a few places to find the site root. This allows us to find the .next directory.
  for (const root of [resolve(publish, '..'), resolve(publish, '..', '..')]) {
    if (existsSync(join(root, 'next.config.js'))) {
      return join(root, '.next')
    }
  }
  return null
}

export const restoreCache = async ({ cache, publish }) => {
  const distDir = findDistDir(publish)
  if (!distDir) {
    return
  }
  if (await cache.restore(join(distDir, 'cache'))) {
    logger.info('Next.js cache restored.')
  } else {
    logger.info('No Next.js cache to restore.')
  }
}

export const saveCache = async ({ cache, publish }) => {
  const distDir = findDistDir(publish)
  if (!distDir) {
    return
  }
  if (await cache.save(join(distDir, 'cache'))) {
    logger.info('Next.js cache saved.')
  } else {
    logger.info('No Next.js cache to save.')
  }
}
