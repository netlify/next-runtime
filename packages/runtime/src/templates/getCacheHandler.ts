import { join } from 'path'

import { copyFile, writeFile } from 'fs-extra'
import { outdent as javascript } from 'outdent'

export const generateCacheHandler = async (publish: string): Promise<void> => {
  const blobCache = getCacheHandler()

  await writeFile(join(publish, 'netlify-incremental-cache.js'), blobCache)

  // node_modules is relative to the root of the project or monorepo
  await copyFile(
    // eslint-disable-next-line n/no-extraneous-require
    require.resolve('@netlify/plugin-nextjs/lib/helpers/blobStorage.js'),
    join(publish, 'blobStorage.js'),
  )
}

const getCacheHandler = (): string =>
  // This is a string, but if you have the right editor plugin it should format as js (e.g. bierner.comment-tagged-templates in VS Code)
  javascript/* javascript */ `

    const { getBlobStorage } = require('./blobStorage')
    const { auth } = require('./handlerUtils')

    const auth = globalThis.blobContext

    module.exports = class CacheHandler {
        async get(key) {
          // getBlobStorage is memoized. See below for converstation about getBlobStorage
          const netliBlob = await getBlobStorage(auth)

          return await netliBlob.get(key)
        }

        async set(key, data) {
          const netliBlob = await getBlobStorage(auth)

          await netliBlob.set(key, {
            value: data,
            lastModified: Date.now(),
          })
        }
    }
  `
