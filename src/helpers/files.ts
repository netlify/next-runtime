/* eslint-disable import/no-extraneous-dependencies */
import { cpus } from 'os'
import path from 'path'

import { NetlifyPluginConstants } from '@netlify/build'
import { copy, move, remove } from 'fs-extra/esm'
import { globby } from 'globby'
import { outdent } from 'outdent'
import pLimit from 'p-limit'

import { getNormalizedBlobKey, netliBlob } from './blobs/blobs.cjs'
import { removeFileDir, formatPageData } from './blobs/cacheFormat.js'
import { BUILD_DIR, STANDALONE_BUILD_DIR } from './constants.js'

/**
 * Move the Next.js build output from the publish dir to a temp dir
 */
export const stashBuildOutput = async ({ PUBLISH_DIR }: NetlifyPluginConstants) => {
  await move(PUBLISH_DIR, `${BUILD_DIR}/.next`, { overwrite: true })

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

    const uploadFilesToBlob = async (pathName: string, file: string) => {
      const key = path.basename(pathName, path.extname(pathName))
      const content =  await formatPageData(pathName, key, file)
      console.log(content)
      try{
        await blob.setJSON(getNormalizedBlobKey(key), content)
      }catch(error){
        console.error(error)
      }
    }

    // todo: test it on demo with pages dir
    const prerenderedContent = await getPrerenderedContent(BUILD_DIR)

    prerenderedContent.map((rawPath) => {
      const cacheFile = rawPath.startsWith('cache')
      const hasHtml = Boolean(rawPath.endsWith('.html'))

      // Removing app, page, and cache/fetch-cache from file path
      const pathKey = removeFileDir(rawPath, (cacheFile ? 2 : 1))
      const errorPages = pathKey.includes('404') || pathKey.includes('500')
      
      // Checking for blob access before uploading
      if( hasHtml && !errorPages ){
        return limit(uploadFilesToBlob, pathKey, rawPath)
      }
    })
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
