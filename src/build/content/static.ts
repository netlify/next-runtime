import type { NetlifyPluginOptions } from '@netlify/build'
import glob from 'fast-glob'
import type { PrerenderManifest } from 'next/dist/build/index.js'
import { existsSync } from 'node:fs'
import { cp, readFile, rm } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { join as joinPosix } from 'node:path/posix'
import { getBlobStore } from '../blob.js'
import { getPrerenderManifest } from '../config.js'
import { STATIC_DIR } from '../constants.js'

export const uploadStaticContent = async ({
  constants: { PUBLISH_DIR, NETLIFY_API_TOKEN, NETLIFY_API_HOST, SITE_ID },
}: Pick<NetlifyPluginOptions, 'constants'>): Promise<void> => {
  const dir = 'server/pages'
  const paths = await glob('**/*.html', {
    cwd: resolve(PUBLISH_DIR, dir),
  })

  let manifest: PrerenderManifest
  let blob: ReturnType<typeof getBlobStore>
  try {
    manifest = await getPrerenderManifest({ PUBLISH_DIR })
    blob = getBlobStore({ NETLIFY_API_TOKEN, NETLIFY_API_HOST, SITE_ID })
  } catch (error: any) {
    console.error(`Unable to upload static content: ${error.message}`)
    return
  }

  const uploads = await Promise.allSettled(
    paths
      .filter((path) => {
        const route = '/' + joinPosix(dirname(path), basename(path, '.html'))
        return !Object.keys(manifest.routes).includes(route)
      })
      .map(async (path) => {
        await blob.set(
          joinPosix(dir, path),
          await readFile(resolve(PUBLISH_DIR, dir, path), 'utf-8'),
        )
      }),
  )
  uploads.forEach((upload, index) => {
    if (upload.status === 'rejected') {
      console.error(`Unable to store static content: ${upload.reason.message}`)
    }
  })
}

/**
 * Move static content to the publish dir so it is uploaded to the CDN
 */
export const copyStaticAssets = async ({
  constants: { PUBLISH_DIR },
}: Pick<NetlifyPluginOptions, 'constants'>): Promise<void> => {
  await rm(resolve(STATIC_DIR), { recursive: true, force: true })
  if (existsSync(resolve('public'))) {
    await cp(resolve('public'), resolve(STATIC_DIR), { recursive: true })
  }
  if (existsSync(resolve(PUBLISH_DIR, 'static'))) {
    await cp(resolve(PUBLISH_DIR, 'static'), resolve(STATIC_DIR, '_next/static'), {
      recursive: true,
    })
  }
}
