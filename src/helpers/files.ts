import { cpus } from 'os'
import { parse, ParsedPath } from 'path'

import { getDeployStore } from '@netlify/blobs'
import { NetlifyPluginConstants, NetlifyPluginUtils } from '@netlify/build'
import { copy, move, pathExists, ensureDir } from 'fs-extra/esm'
import { globby } from 'globby'
import pLimit from 'p-limit'

import { buildCacheValue } from './cache.js'
import { BUILD_DIR } from './constants.js'

/**
 * Move the Next.js build output from the publish dir to a temp dir
 */
export const stashBuildOutput = async (
  { PUBLISH_DIR }: NetlifyPluginConstants,
  utils: NetlifyPluginUtils,
) => {
  if (!(await pathExists(PUBLISH_DIR))) {
    utils.build.failBuild(
      'Your publish directory does not exist. Please check your netlify.toml file.',
    )
  }
  await move(PUBLISH_DIR, `${BUILD_DIR}/.next`, { overwrite: true })
  await ensureDir(PUBLISH_DIR)
}

/**
 * Paths needed for moving fully static content
 */
type StaticContentEntry = {
  absolute: string
  publish: string
}

/**
 * Search the build output for static page content we can upload to the CDN
 */
const findStaticContent = async (cwd: string): Promise<StaticContentEntry[]> => {
  const paths = await globby([`server/pages/**/*.+(html|json)`], {
    cwd,
    extglob: true,
  })
  return paths.reduce((content: StaticContentEntry[], path: string): StaticContentEntry[] => {
    const { dir, name } = parse(path)

    const hasJSON = paths.includes(`${dir}/${name}.json`)

    // pages dir static files do not have JSON data
    if (!hasJSON) {
      content.push({
        absolute: `${cwd}/${path}`,
        publish: path.replace(/^server\/(app|pages)\//, ''),
      })
    }

    return content
  }, [])
}

/**
 * Move static content to the publish dir so it is uploaded to the CDN
 */
export const publishStaticContent = async ({ PUBLISH_DIR }: NetlifyPluginConstants) => {
  const content = await findStaticContent(`${BUILD_DIR}/.next/standalone/.next`)

  await Promise.all([
    (await pathExists('public')) ? copy('public', PUBLISH_DIR) : Promise.resolve(),
    copy(`${BUILD_DIR}/.next/static/`, `${PUBLISH_DIR}/_next/static`),
    ...content.map((paths) => copy(paths.absolute, `${PUBLISH_DIR}/${paths.publish}`)),
  ])
}

/**
 * Paths needed for moving prerendered static content
 */
export type PrerenderedContentEntry = {
  key: string
  body: string
  data?: string
  meta?: string
}

/**
 * Search the build output for prerendered content we can upload to the blob store
 */
const findPrerenderedContent = async (cwd: string): Promise<PrerenderedContentEntry[]> => {
  const paths = await globby(
    [`cache/fetch-cache/*`, `server/+(app|pages)/**/*.+(html|body|json)`],
    {
      cwd,
      extglob: true,
    },
  )
  return paths.reduce(
    (content: PrerenderedContentEntry[], path: string): PrerenderedContentEntry[] => {
      const { dir, name, ext } = parse(path)

      const isPagesDir = dir.startsWith('server/pages')
      const isAppDir = dir.startsWith('server/app')
      const isFetchCache = dir.startsWith('cache/fetch-cache')
      const hasJSON = paths.includes(`${dir}/${name}.json`)

      // static prerendered pages content with JSON data
      if (isPagesDir && ext === '.html' && hasJSON) {
        content.push({
          key: `${dir}/${name}`,
          body: `${cwd}/${dir}.html`,
          data: `${cwd}/${dir}.json`,
        })
      }

      // static prerendered app content with RSC data
      if (isAppDir && ext === '.html') {
        content.push({
          key: `${dir}/${name}`,
          body: `${cwd}/${dir}.html`,
          data: `${cwd}/${dir}.rsc`,
          meta: `${cwd}/${dir}.meta`,
        })
      }

      // static prerendered app route handler
      if (isAppDir && ext === '.body') {
        content.push({
          key: `${dir}/${name}`,
          body: `${cwd}/${dir}.body`,
          meta: `${cwd}/${dir}.meta`,
        })
      }

      // fetch cache data
      if (isFetchCache) {
        content.push({
          key: `${dir}/${name}`,
          body: `${cwd}/${path}`,
        })
      }

      return content
    },
    [],
  )
}

/**
 * Upload prerendered content to the blob store and remove it from the bundle
 */
export const storePrerenderedContent = async ({
  NETLIFY_API_TOKEN,
  NETLIFY_API_HOST,
  SITE_ID,
}: NetlifyPluginConstants) => {
  const blob = getDeployStore({
    deployID: process.env.DEPLOY_ID,
    siteID: SITE_ID,
    token: NETLIFY_API_TOKEN,
    apiURL: `https://${NETLIFY_API_HOST}`,
  })
  const limit = pLimit(Math.max(2, cpus().length))
  const content = await findPrerenderedContent(`${BUILD_DIR}/.next/standalone/.next`)

  const uploads = await Promise.allSettled(
    content.map(async (paths: PrerenderedContentEntry) => {
      const { key } = paths
      const value = await buildCacheValue(paths)
      return limit(() => blob.setJSON(key, value))
    }),
  )

  uploads.forEach((upload, index) => {
    if (upload.status === 'rejected') {
      console.error(`Unable to upload ${content[index].key}: ${upload.reason.message}`)
    }
  })
}

/**
 * Paths needed for moving dynamic server content
 */
type ServerContentEntry = {
  absolute: string
  handler: string
}

/**
 * Search the build output for JS content we can bundle with the server handler
 */
export const findServerContent = async (cwd: string): Promise<ServerContentEntry[]> => {
  const paths = await globby([`*`, `server/+(app|pages)/**/*.js`], {
    cwd,
    extglob: true,
  })
  return paths.reduce((content: ServerContentEntry[], path: string): ServerContentEntry[] => {
    content.push({
      absolute: `${cwd}/${path}`,
      handler: path,
    })
    return content
  }, [])
}
