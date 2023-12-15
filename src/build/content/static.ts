import type { NetlifyPluginOptions } from '@netlify/build'
import glob from 'fast-glob'
import { Buffer } from 'node:buffer'
import { existsSync } from 'node:fs'
import { cp, mkdir, rename, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { BLOB_DIR, STATIC_DIR } from '../constants.js'

/**
 * Assemble the static content for being uploaded to the blob storage
 */
export const copyStaticContent = async ({
  constants: { PUBLISH_DIR },
  utils: {
    build: { failBuild },
  },
}: Pick<NetlifyPluginOptions, 'constants' | 'utils'>): Promise<void> => {
  const srcDir = resolve(PUBLISH_DIR, 'server/pages')
  const destDir = resolve(BLOB_DIR)

  const paths = await glob('**/*.+(html|json)', {
    cwd: srcDir,
    extglob: true,
  })

  try {
    await Promise.all(
      paths
        .filter((path) => !paths.includes(`${path.slice(0, -5)}.json`))
        .map(async (path) => {
          const key = Buffer.from(path).toString('base64')
          await cp(join(srcDir, path), join(destDir, key), { recursive: true })
        }),
    )
  } catch (error) {
    failBuild('Failed assembling static pages for upload', error instanceof Error ? { error } : {})
  }
}

/**
 * Copy static content to the static dir so it is uploaded to the CDN
 */
export const copyStaticAssets = async ({
  constants: { PUBLISH_DIR },
  utils: {
    build: { failBuild },
  },
}: Pick<NetlifyPluginOptions, 'constants' | 'utils'>): Promise<void> => {
  try {
    await rm(resolve(STATIC_DIR), { recursive: true, force: true })
    if (existsSync(resolve('public'))) {
      await cp(resolve('public'), resolve(STATIC_DIR), { recursive: true })
    }
    if (existsSync(resolve(PUBLISH_DIR, 'static'))) {
      await cp(resolve(PUBLISH_DIR, 'static'), resolve(STATIC_DIR, '_next/static'), {
        recursive: true,
      })
    }
  } catch (error) {
    failBuild('Failed copying static assets', error instanceof Error ? { error } : {})
  }
}

/**
 * Swap the static dir with the publish dir so it is uploaded to the CDN
 */
export const publishStaticDir = async ({
  constants: { PUBLISH_DIR },
  utils: {
    build: { failBuild },
  },
}: Pick<NetlifyPluginOptions, 'constants' | 'utils'>): Promise<void> => {
  try {
    await mkdir(resolve('.netlify/.next'), { recursive: true })
    await rename(resolve(PUBLISH_DIR), resolve('.netlify/.next'))
    await rename(resolve(STATIC_DIR), resolve(PUBLISH_DIR))
  } catch (error) {
    failBuild('Failed publishing static content', error instanceof Error ? { error } : {})
  }
}

/**
 * Restore the publish dir that was swapped with the static dir
 */
export const unpublishStaticDir = async ({
  constants: { PUBLISH_DIR },
}: Pick<NetlifyPluginOptions, 'constants'>): Promise<void> => {
  try {
    if (existsSync(resolve('.netlify/.next'))) {
      await rename(resolve(PUBLISH_DIR), resolve(STATIC_DIR))
      await rename(resolve('.netlify/.next'), resolve(PUBLISH_DIR))
    }
  } catch (error) {
    // ignore
  }
}
