import { copyFile, writeFile } from 'fs-extra'
import { outdent as javascript } from 'outdent'
import { join } from 'path'

export const generateCacheHandler = async (): Promise<void> => {

    const blobCache = getCacheHandler()

    await writeFile(join('.next', 'incremental-cache.js'), blobCache)
    await copyFile(join(__dirname, '..', '..', 'lib', 'helpers', 'blobStorage.js'), join('.netlify', 'blobStorage.js'))
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
