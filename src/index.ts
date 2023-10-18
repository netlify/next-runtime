import { netliBlob, isBlobStorageAvailable } from './helpers/blobs.cjs'
import { getNextConfig, setBuildConfig } from './helpers/config.js'
import { publishStaticAssets, stashBuildOutput, storePrerenderedContent } from './helpers/files.js'
import { createEdgeHandler, createServerHandler } from './helpers/functions.js'
import { EnhancedNetlifyPluginOptions } from './helpers/types.js'

export const onPreBuild = () => {
  setBuildConfig()
}

export const onBuild = async ({ constants, netlifyConfig }: EnhancedNetlifyPluginOptions) => {
  const testingDeployId = ''
  const context = testingDeployId || `deploy:${process.env.DEPLOY_ID}`
  const { NETLIFY_API_TOKEN, SITE_ID } = constants
  
  const testBlobStorage = await netliBlob(NETLIFY_API_TOKEN, context, SITE_ID)
  const blobAccess = testBlobStorage && (await isBlobStorageAvailable(testBlobStorage)) ? testBlobStorage : undefined
  const { publish } = netlifyConfig.build
  await stashBuildOutput(constants)

  const {
    basePath,
    target,
  } = await getNextConfig({ publish }, netlifyConfig)

  return Promise.all([
    publishStaticAssets(constants),
    storePrerenderedContent(netlifyConfig, basePath, target, blobAccess),
    createServerHandler(),
    createEdgeHandler(),
  ])
}
