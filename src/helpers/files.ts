/* eslint-disable import/no-extraneous-dependencies */
import { existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { cpus } from 'os'

import { NetlifyPluginConstants } from '@netlify/build'
import type { NetlifyConfig } from '@netlify/build'
import pkg from 'fs-extra'
import { copy, move, remove, readJSON } from 'fs-extra/esm'
import { globby } from 'globby'
import { outdent } from 'outdent'
import pLimit from 'p-limit'

import { netliBlob, getNormalizedBlobKey } from './blobs.cjs'
import { BUILD_DIR, STANDALONE_BUILD_DIR } from './constants.js'

// readfile not available in esm version of fs-extra
const { readFile } = pkg
/**
 * Move the Next.js build output from the publish dir to a temp dir
 */
export const stashBuildOutput = async ({ PUBLISH_DIR }: NetlifyPluginConstants) => {
  await move(PUBLISH_DIR, BUILD_DIR, { overwrite: true })

  // remove prerendered content from the standalone build (it's also in the main build dir)
  const prerenderedContent = await getPrerenderedContent(STANDALONE_BUILD_DIR)
  await Promise.all(
    prerenderedContent.map((file: string) => remove(`${STANDALONE_BUILD_DIR}/${file}`))).catch((error) => console.error(error))

}

/**
 * Glob for prerendered content in the build output
 */
const getPrerenderedContent = async (cwd: string): Promise<string[]> => {
  // TODO: test this
  return await globby([
    `cache/fetch-cache/*`,
    `server/+(app|pages)/**/*.+(html|json|rsc|body|meta)`,
    `!server/**/*.js.nft.{html,json}`,
  ], { cwd, extglob: true })
}

/**
 * Upload prerendered content from the main build dir to the blob store
 */
export const storePrerenderedContent = async ({ NETLIFY_API_TOKEN, SITE_ID }:
  { 
    NETLIFY_API_TOKEN: string, SITE_ID: string
  }) => {
    const deployID = `${process.env.DEPLOY_ID}`
    const blob = netliBlob(NETLIFY_API_TOKEN, deployID, SITE_ID)
    // todo: Check out setFiles within Blobs.js to see how to upload files to blob storage
    const limit = pLimit(Math.max(2, cpus().length))
    console.log(
      outdent`
        Uploading Files to Blob Storage...
      `)

    const uploadFilesToBlob = async (key: string, file: string) => {
      try{
        const content = await readFile(join(BUILD_DIR, file), 'utf8')
        await blob.set(getNormalizedBlobKey(key), content)
      }catch(error){
        console.error(error)
      }
    }

    // todo: test it on demo with pages dir
    const prerenderedContent = await getPrerenderedContent(BUILD_DIR)

    prerenderedContent.map((rawPath) => {
      const cacheFile = rawPath.startsWith('cache')
      // Removing app, page, and cache/fetch-cache from file path
      const pathKey = removeFileDir(rawPath, (cacheFile ? 2 : 1))
      // Checking for blob access before uploading
      if( blob ){
        return limit(uploadFilesToBlob, pathKey, rawPath)
      }
    })
}

const removeFileDir = (file: string, num: number) => {
  return file.split('/').slice(num).join('/')
}

const maybeLoadJson = <T>(path: string): Promise<T> | null => existsSync(path) ? readJSON(path) : null

// use this to load any manifest file by passing in name and/or dir if needed 
export const loadManifest = (netlifyConfig: NetlifyConfig, manifest: string, dir?: string): any => 
  maybeLoadJson(resolve(netlifyConfig.build.publish, dir ?? '', manifest))

/**
 * Move static assets to the publish dir so they are uploaded to the CDN
 */
export const publishStaticAssets = ({ PUBLISH_DIR }: NetlifyPluginConstants) => {
  return Promise.all([
    copy('public', PUBLISH_DIR),
    copy(`${BUILD_DIR}/static/`, `${PUBLISH_DIR}/_next/static`),
  ])
}
