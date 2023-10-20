import { cpus } from 'os'
import path from 'path'

import { NetlifyPluginConstants } from '@netlify/build'
import { copy, move, remove } from 'fs-extra/esm'
import { globby } from 'globby'
import pLimit from 'p-limit'

import { netliBlob } from './blobs.js'
import { buildCacheValue } from './cache.js'
import { BUILD_DIR } from './constants.js'

/**
 * Move the Next.js build output from the publish dir to a temp dir
 */
export const stashBuildOutput = async ({ PUBLISH_DIR }: NetlifyPluginConstants) => {
  await move(PUBLISH_DIR, `${BUILD_DIR}/.next`, { overwrite: true })

  // remove prerendered content from the standalone build (it's also in the main build dir)
  const prerenderedContent = await getPrerenderedContent(`${BUILD_DIR}/.next/standalone`, false)
  await Promise.all(
    prerenderedContent.map((file: string) => remove(`${BUILD_DIR}/.next/standalone/${file}`)),
  ).catch((error) => console.error(error))
}

/**
 * Glob for prerendered content in the build output
 */
const getPrerenderedContent = async (cwd: string, get = true): Promise<string[]> => {
  // TODO: test this
  return await globby(
    get
      ? [`cache/fetch-cache/*`, `server/+(app|pages)/**/*.+(html|body)`]
      : [
          `cache/fetch-cache/*`,
          `server/+(app|pages)/**/*.+(html|json|rsc|body|meta)`,
          `!server/**/*.js.nft.{html,json}`,
        ],
    { cwd, extglob: true },
  )
}

/**
 * Upload prerendered content from the main build dir to the blob store
 */
export const storePrerenderedContent = async ({
  NETLIFY_API_TOKEN,
  SITE_ID,
}: {
  NETLIFY_API_TOKEN: string
  SITE_ID: string
}) => {
  const deployID = `${process.env.DEPLOY_ID}`
  const blob = netliBlob(NETLIFY_API_TOKEN, deployID, SITE_ID)
  // todo: Check out setFiles within Blobs.js to see how to upload files to blob storage
  const limit = pLimit(Math.max(2, cpus().length))

  const prerenderedContent = await getPrerenderedContent(`${BUILD_DIR}/.next`)
  return Promise.all(
    prerenderedContent.map(async (rawPath: string) => {
      // TODO: test this with files that have a double extension
      const ext = path.extname(rawPath)
      const key = rawPath.replace(ext, '')
      const value = await buildCacheValue(key, ext)
      return limit(() => blob.setJSON(key, value))
    }),
  )
}

/**
 * Move static assets to the publish dir so they are uploaded to the CDN
 */
export const publishStaticAssets = ({ PUBLISH_DIR }: NetlifyPluginConstants) => {
  return Promise.all([
    copy('public', PUBLISH_DIR),
    copy(`${BUILD_DIR}/.next/static/`, `${PUBLISH_DIR}/_next/static`),
  ])
}
