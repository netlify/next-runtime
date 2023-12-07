import type { NetlifyPluginOptions } from '@netlify/build'
import glob from 'fast-glob'
import type { PrerenderManifest } from 'next/dist/build/index.js'
import { existsSync } from 'node:fs'
import { cp, mkdir, rename, rm } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { join as joinPosix } from 'node:path/posix'
import { getPrerenderManifest } from '../config.js'
import { BLOB_DIR, STATIC_DIR, TEMP_DIR } from '../constants.js'

/**
 * Assemble the static content for being uploaded to the blob storage
 */
export const uploadStaticContent = async ({
  constants: { PUBLISH_DIR },
  utils,
}: Pick<NetlifyPluginOptions, 'constants' | 'utils'>): Promise<void> => {
  const dir = 'server/pages'
  const paths = await glob('**/*.html', {
    cwd: resolve(PUBLISH_DIR, dir),
  })

  try {
    const manifest = await getPrerenderManifest({ PUBLISH_DIR })
    await Promise.all(
      paths
        .filter((path) => {
          const route = '/' + joinPosix(dirname(path), basename(path, '.html'))
          return !Object.keys(manifest.routes).includes(route)
        })
        .map(async (path) => {
          const dest = resolve(BLOB_DIR, dir, path)
          await mkdir(dirname(dest), { recursive: true })
          await cp(resolve(PUBLISH_DIR, dir, path), dest)
        }),
    )
  } catch (error) {
    utils.build.failBuild(
      'Failed assembling static assets for upload',
      error instanceof Error ? { error } : {},
    )
    throw error
  }
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

export const publishStaticDir = async ({
  constants: { PUBLISH_DIR },
}: Pick<NetlifyPluginOptions, 'constants'>): Promise<void> => {
  await mkdir(resolve(TEMP_DIR, 'publish'), { recursive: true })
  await rename(resolve(PUBLISH_DIR), resolve(TEMP_DIR, 'publish'))
  await rename(resolve(STATIC_DIR), resolve(PUBLISH_DIR))
}

export const unpublishStaticDir = async ({
  constants: { PUBLISH_DIR },
}: Pick<NetlifyPluginOptions, 'constants'>): Promise<void> => {
  await rename(resolve(PUBLISH_DIR), resolve(STATIC_DIR))
  await rename(resolve(TEMP_DIR, 'publish'), resolve(PUBLISH_DIR))
}
