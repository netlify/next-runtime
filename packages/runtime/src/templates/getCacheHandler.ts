import { join } from 'path'

import { copyFile, ensureDir, writeFile } from 'fs-extra'
import { outdent as javascript } from 'outdent'

export const generateCacheHandler = async (functionsDir: string, functionName: string): Promise<void> => {
  const incrementalHandlerDirectory = join(functionsDir, functionName)
  await ensureDir(incrementalHandlerDirectory)

  const blobCache = getCacheHandler()

  await writeFile(join(incrementalHandlerDirectory, 'netlify-incremental-cache.js'), blobCache)

  // node_modules is relative to the root of the project or monorepo
  await copyFile(
    // eslint-disable-next-line n/no-extraneous-require
    require.resolve('@netlify/plugin-nextjs/lib/helpers/blobStorage.js'),
    join(incrementalHandlerDirectory, 'blobStorage.js'),
  )
}

const getCacheHandler = (): string =>
  // This is a string, but if you have the right editor plugin it should format as js (e.g. bierner.comment-tagged-templates in VS Code)
  javascript/* javascript */ `

    const { getBlobStorage } = require('./blobStorage')
    const blobAuthOptions = globalThis.blobContext

    console.log('loaded incremental cache handler')

    module.exports = class CacheHandler {
        async get(key) {
          // getBlobStorage is memoized. See below for converstation about getBlobStorage
          const netliBlob = await getBlobStorage(blobAuthOptions)

          return await netliBlob.get(key.slice(1))
        }

        async set(key, data) {
          const netliBlob = await getBlobStorage(blobAuthOptions)

          await netliBlob.set(key.slice(1), {
            value: data,
            lastModified: Date.now(),
          })
        }
    }
  `
