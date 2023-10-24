import { cpus } from 'os'
import path from 'path'

import { getDeployStore } from '@netlify/blobs'
import { NetlifyPluginConstants } from '@netlify/build'
import { copy, move, remove } from 'fs-extra/esm'
import { globby } from 'globby'
import pLimit from 'p-limit'

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
  NETLIFY_API_HOST,
  SITE_ID,
}: NetlifyPluginConstants & { NETLIFY_API_TOKEN: string; NETLIFY_API_HOST: string }) => {
  if (!process.env.DEPLOY_ID) {
    // TODO: maybe change to logging
    throw new Error(
      'Could not initizlize the Blob storage as the `DEPLOY_ID` environment variable is missing!',
    )
  }

  const blob = getDeployStore({
    deployID: process.env.DEPLOY_ID,
    siteID: SITE_ID,
    token: NETLIFY_API_TOKEN,
    apiURL: `https://${NETLIFY_API_HOST}`,
  })

  // todo: Check out setFiles within Blobs.js to see how to upload files to blob storage
  const limit = pLimit(Math.max(2, cpus().length))

  const prerenderedContent = await getPrerenderedContent(`${BUILD_DIR}/.next`)
  return await Promise.all(
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
