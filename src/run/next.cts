import fs from 'fs/promises'
import { relative, resolve } from 'path'

// @ts-expect-error no types installed
import { patchFs } from 'fs-monkey'

import { getRequestContext } from './handlers/request-context.cjs'
import { getTracer } from './handlers/tracer.cjs'
import { getRegionalBlobStore } from './regional-blob-store.cjs'

console.time('import next server')

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getRequestHandlers } = require('next/dist/server/lib/start-server.js')

console.timeEnd('import next server')

type FS = typeof import('fs')

export async function getMockedRequestHandlers(...args: Parameters<typeof getRequestHandlers>) {
  const tracer = getTracer()
  return tracer.withActiveSpan('mocked request handler', async () => {
    const ofs = { ...fs }

    const { encodeBlobKey } = await import('../shared/blobkey.js')

    async function readFileFallbackBlobStore(...fsargs: Parameters<FS['promises']['readFile']>) {
      const [path, options] = fsargs
      try {
        // Attempt to read from the disk
        // important to use the `import * as fs from 'fs'` here to not end up in a endless loop
        return await ofs.readFile(path, options)
      } catch (error) {
        // only try to get .html files from the blob store
        if (typeof path === 'string' && path.endsWith('.html')) {
          const store = getRegionalBlobStore()
          const relPath = relative(resolve('.next/server/pages'), path)
          const file = await store.get(await encodeBlobKey(relPath))
          if (file !== null) {
            const requestContext = getRequestContext()
            if (requestContext) {
              requestContext.usedFsRead = true
            }

            return file
          }
        }

        throw error
      }
    }

    // patch the file system for fs.promises with operations to fallback on the blob store
    patchFs(
      {
        readFile: readFileFallbackBlobStore,
      },
      // eslint-disable-next-line n/global-require, @typescript-eslint/no-var-requires
      require('fs').promises,
    )

    return getRequestHandlers(...args)
  })
}
