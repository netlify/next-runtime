/* eslint-disable import/no-extraneous-dependencies */
import { existsSync, readFileSync} from 'node:fs'
import { resolve, join } from 'node:path'
import { cpus } from 'os'

import { NetlifyPluginConstants } from '@netlify/build'
import type { NetlifyConfig } from '@netlify/build'
import pkg from 'fs-extra'
import { copy, move, remove, readJSON, writeJson } from 'fs-extra/esm'
import { globby } from 'globby'
import pLimit from 'p-limit'

import { getNormalizedBlobKey } from './blobs.cjs'
import { BUILD_DIR, SERVER_APP_DIR, STANDALONE_APP_DIR } from './constants.js'

// readfile not available in esm version of fs-extra
const { readFile } = pkg
/**
 * Move the Next.js build output from the publish dir to a temp dir
 */
export const stashBuildOutput = async ({ PUBLISH_DIR }: NetlifyPluginConstants) => {
  await move(PUBLISH_DIR, BUILD_DIR, { overwrite: true })

  // remove prerendered content from the standalone build (it's also in the main build dir)
  const prerenderedContent = await getPrerenderedContent(STANDALONE_APP_DIR)
  await Promise.all(
    prerenderedContent.map((file: string) => remove(`${STANDALONE_APP_DIR}/${file}`))).catch((error) => console.error(error))

}

/**
 * Glob for prerendered content in the build output
 */
const getPrerenderedContent = async (cwd: string): Promise<string[]> => {
  // TODO: test this
  return await globby(['**/*.+(html|json|rsc|body|meta)', '!**/*.js.nft.{html,json}'], { cwd, extglob: true })
}

/**
 * Upload prerendered content from the main build dir to the blob store
 */
// Adding intiail logic to upload prerendered content to blob storage still a WIP
export const storePrerenderedContent = async (netlifyConfig, basePath, target, netliBlob) => {
  const buildId = readFileSync(join(BUILD_DIR, 'BUILD_ID'), 'utf8').trim()
  const outputDir = join(netlifyConfig.build.publish, target === 'serverless' ? 'serverless' : 'server')
  const dataDir = join('_next', 'data', buildId)

  let blobCount = 0
  const blobsManifest = new Set<string>()
  const limit = pLimit(Math.max(2, cpus().length))
  const prerenderedContent = await getPrerenderedContent(SERVER_APP_DIR)

  const getSourceAndTargetPath = (file: string): { source: string } => {
    const source = join(SERVER_APP_DIR, file)
    // Strip the initial 'app' or 'pages' directory from the output path
    // const pathname = file.split('/').slice(1).join('/')
    // // .rsc data files go next to the html file
    // const isData = file.endsWith('.json')
    // const targetFile = isData ? join(dataDir, pathname) : pathname
    // const targetPath = basePath ? join(basePath, targetFile) : targetFile

    return {
      // targetPath,
      source,
    }
  }
  const uploadFilesToBlob = async (file: string) => {
    const { source } = getSourceAndTargetPath(file)
    blobsManifest.add(file)
    
    const content = await readFile(source, 'utf8')

    blobCount += 1

    // await netliBlob.set(getNormalizedBlobKey(file), content)
    await remove(source)
  }

  // eslint-disable-next-line array-callback-return
  prerenderedContent.map((rawPath) => {
    const pagePath = rawPath.split('/').slice(1).join('/')
    // Checking if Blob Storage is enabled to upload prerendered content and delete it from the build directory
    if( netliBlob ){
      return limit(uploadFilesToBlob, rawPath)
    }
    
  })
  // TODO: implement
  await writeJson(join(netlifyConfig.build.publish, 'blobs-manifest.json'), [...blobsManifest])
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
