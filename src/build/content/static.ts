import { getDeployStore } from '@netlify/blobs'
import { NetlifyPluginConstants } from '@netlify/build'
import { globby } from 'globby'
import { existsSync } from 'node:fs'
import { cp, mkdir, readFile } from 'node:fs/promises'
import { ParsedPath, join, parse } from 'node:path'
import { BUILD_DIR } from '../constants.js'

/**
 * Copy static pages (HTML without associated JSON data)
 */
const copyStaticPages = async (
  blob: ReturnType<typeof getDeployStore>,
  src: string,
): Promise<void> => {
  const paths = await globby([`server/pages/**/*.+(html|json)`], {
    cwd: src,
    extglob: true,
  })

  await Promise.all(
    paths
      .map(parse)
      // keep only static files that do not have JSON data
      .filter(({ dir, name }: ParsedPath) => !paths.includes(`${dir}/${name}.json`))
      .map(async ({ dir, base }: ParsedPath) => {
        const relPath = join(dir, base)
        const srcPath = join(src, relPath)
        await blob.set(relPath, await readFile(srcPath, 'utf-8'))
      }),
  )
}

/**
 * Copies static assets
 */
const copyStaticAssets = async ({
  PUBLISH_DIR,
}: Pick<NetlifyPluginConstants, 'PUBLISH_DIR'>): Promise<void> => {
  try {
    const src = join(process.cwd(), BUILD_DIR, '.next/static')
    const dist = join(PUBLISH_DIR, '_next/static')
    await mkdir(dist, { recursive: true })
    await cp(src, dist, { recursive: true, force: true })
  } catch (error) {
    throw new Error(`Failed to copy static assets: ${error}`)
  }
}

/**
 * Copies the public folder over
 */
const copyPublicAssets = async ({
  PUBLISH_DIR,
}: Pick<NetlifyPluginConstants, 'PUBLISH_DIR'>): Promise<void> => {
  const src = join(process.cwd(), 'public')
  const dist = PUBLISH_DIR
  if (!existsSync(src)) {
    return
  }

  await mkdir(dist, { recursive: true })
  await cp(src, dist, { recursive: true, force: true })
}

/**
 * Move static content to the publish dir so it is uploaded to the CDN
 */
export const copyStaticContent = async (
  { PUBLISH_DIR }: Pick<NetlifyPluginConstants, 'PUBLISH_DIR'>,
  blob: ReturnType<typeof getDeployStore>,
): Promise<void> => {
  await Promise.all([
    copyStaticPages(blob, join(process.cwd(), BUILD_DIR, '.next')),
    copyStaticAssets({ PUBLISH_DIR }),
    copyPublicAssets({ PUBLISH_DIR }),
  ])
}
