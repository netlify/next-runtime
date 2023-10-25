import { cpus } from 'os'
import { parse, ParsedPath } from 'path'

import { getDeployStore } from '@netlify/blobs'
import { NetlifyPluginConstants } from '@netlify/build'
import { copy, move, mkdirp } from 'fs-extra/esm'
import { globby } from 'globby'
import pLimit from 'p-limit'

import { buildCacheValue } from './cache.js'
import { BUILD_DIR } from './constants.js'
import { EnhancedNetlifyPluginConstants } from './types.js'

type ContentPath = ParsedPath & {
  relative: string
  absolute: string
  publish: string
}

/**
 * Move the Next.js build output from the publish dir to a temp dir
 */
export const stashBuildOutput = async ({ PUBLISH_DIR }: NetlifyPluginConstants): Promise<void> => {
  return move(PUBLISH_DIR, `${BUILD_DIR}/.next`, { overwrite: true })
}

/**
 * Glob the build output for static page content we can upload to the CDN
 */
const getStaticContent = async (cwd: string): Promise<ContentPath[]> => {
  const content = await globby([`server/pages/**/*.+(html|json)`], {
    cwd,
    extglob: true,
  })
  return content
    .map((path) => parsePath(path, cwd))
    .filter((path) => filterStatic(path, content, 'keep'))
}

/**
 * Glob the build output for prerendered content we can upload to the blob store
 */
const getPrerenderedContent = async (cwd: string): Promise<ContentPath[]> => {
  const content = await globby(
    [`cache/fetch-cache/*`, `server/+(app|pages)/**/*.+(html|body|json)`],
    {
      cwd,
      extglob: true,
    },
  )
  return content
    .map((path) => parsePath(path, cwd))
    .filter((path) => filterStatic(path, content, 'omit'))
}

/**
 * Glob the build output for JS content we can bundle with the server handler
 */
export const getServerContent = async (cwd: string): Promise<ContentPath[]> => {
  const content = await globby([`**`, `!server/+(app|pages)/**/*.+(html|body|json|rsc|meta)`], {
    cwd,
    extglob: true,
  })
  return content.map((path) => parsePath(path, cwd))
}

/**
 * Upload prerendered content to the blob store and remove it from the bundle
 */
export const storePrerenderedContent = async ({
  NETLIFY_API_TOKEN,
  NETLIFY_API_HOST,
  SITE_ID,
}: EnhancedNetlifyPluginConstants): Promise<void[]> => {
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
  const limit = pLimit(Math.max(2, cpus().length))

  const content = await getPrerenderedContent(`${BUILD_DIR}/.next/standalone/.next`)
  return await Promise.all(
    content.map((path: ContentPath) => {
      const { dir, name, ext } = path
      const key = `${dir}/${name}`
      const value = buildCacheValue(key, ext)
      return limit(() => blob.setJSON(key, value))
    }),
  )
}

/**
 * Move static content to the publish dir so it is uploaded to the CDN
 */
export const publishStaticContent = async ({
  PUBLISH_DIR,
}: NetlifyPluginConstants): Promise<void[]> => {
  const content = await getStaticContent(`${BUILD_DIR}/.next/standalone/.next`)
  return await Promise.all([
    mkdirp(PUBLISH_DIR),
    copy('public', PUBLISH_DIR),
    copy(`${BUILD_DIR}/.next/static/`, `${PUBLISH_DIR}/_next/static`),
    ...content.map((path: ContentPath) => copy(path.absolute, `${PUBLISH_DIR}/${path.publish}`)),
  ])
}

/**
 * Keep or remove static content based on whether it has a corresponding JSON file
 */
const filterStatic = (
  { dir, name, ext }: ContentPath,
  content: string[],
  type: 'keep' | 'omit',
): boolean =>
  type === 'keep'
    ? dir.startsWith('server/pages') && !content.includes(`${dir}/${name}.json`)
    : ext !== '.json' &&
      (!dir.startsWith('server/pages') || content.includes(`${dir}/${name}.json`))
/**
 * Parse a file path into an object with file path variants
 */
const parsePath = (path: string, cwd: string): ContentPath => ({
  ...parse(path),
  relative: path,
  absolute: `${cwd}/${path}`,
  publish: path.replace(/^server\/(app|pages)\//, ''),
})
