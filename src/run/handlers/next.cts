import { join, relative } from 'path'
import fs from 'fs/promises'

import type { getRequestHandlers } from 'next/dist/server/lib/start-server.js'

// @ts-expect-error no types installed
import { patchFs } from 'fs-monkey'

type FS = typeof import('fs')

export async function getMockedRequestHandlers(...args: Parameters<typeof getRequestHandlers>) {
  const { blobStore } = await import('./cache.cjs')
  const ofs = { ...fs }

  async function readFileFallbackBlobStore(...args: Parameters<FS['promises']['readFile']>) {
    const [path, options] = args
    try {
      // Attempt to read from the disk
      // important to use the `import * as fs from 'fs'` here to not end up in a endless loop
      return await ofs.readFile(path, options)
    } catch (error) {
      // only try to get .html files from the blob store
      if (typeof path === 'string' && path.endsWith('.html')) {
        const blobKey = relative(join(process.cwd(), '.next'), path)
        const file = await blobStore.get(blobKey)
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
    require('fs').promises,
  )

  const { getRequestHandlers } = await import('next/dist/server/lib/start-server.js')
  return getRequestHandlers(...args)
}
