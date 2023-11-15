import { NetlifyPluginOptions } from '@netlify/build'
import { resolve } from 'node:path'

export const saveBuildCache = async ({
  constants: { PUBLISH_DIR },
  utils: { cache },
}: Pick<NetlifyPluginOptions, 'constants' | 'utils'>) => {
  if (await cache.save(resolve(PUBLISH_DIR, 'cache'))) {
    console.log('Next.js cache saved.')
  } else {
    console.log('No Next.js cache to save.')
  }
}

export const restoreBuildCache = async ({
  constants: { PUBLISH_DIR },
  utils: { cache },
}: Pick<NetlifyPluginOptions, 'constants' | 'utils'>) => {
  if (await cache.restore(resolve(PUBLISH_DIR, 'cache'))) {
    console.log('Next.js cache restored.')
  } else {
    console.log('No Next.js cache to restore.')
  }
}
