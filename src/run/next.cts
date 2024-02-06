import fs from 'fs/promises'
import { relative, resolve } from 'path'

import { getDeployStore } from '@netlify/blobs'
import { trace } from '@opentelemetry/api'
// @ts-expect-error no types installed
import { patchFs } from 'fs-monkey'
import type { getRequestHandlers } from 'next/dist/server/lib/start-server.js'

type FS = typeof import('fs')

export async function getMockedRequestHandlers(...args: Parameters<typeof getRequestHandlers>) {
  const tracer = trace.getTracer('Next.js Runtime')
  return tracer.startActiveSpan('mocked request handler', async (span) => {
    const store = getDeployStore()
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
          const relPath = relative(resolve('.next/server/pages'), path)
          const file = await store.get(await encodeBlobKey(relPath))
          if (file !== null) {
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

    const importSpan = tracer.startSpan('import next server')
    // eslint-disable-next-line no-shadow
    const { getRequestHandlers } = await import('next/dist/server/lib/start-server.js')
    importSpan.end()
    span.end()
    return getRequestHandlers(...args)
  })
}
