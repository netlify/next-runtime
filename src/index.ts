import { netliBlob, isBlobStorageAvailable } from './helpers/blobs.cjs'
import { setBuildConfig } from './helpers/config.js'
import { publishStaticAssets, stashBuildOutput, storePrerenderedContent } from './helpers/files.js'
import { createEdgeHandler, createServerHandler } from './helpers/functions.js'
import { EnhancedNetlifyPluginOptions } from './helpers/types.js'

export const onPreBuild = () => {
  setBuildConfig()
}

export const onBuild = async ({ constants }: EnhancedNetlifyPluginOptions) => {
  const testingDeployId = ''
  const context = testingDeployId || `deploy:${process.env.DEPLOY_ID}`
  const { NETLIFY_API_HOST, NETLIFY_API_TOKEN, SITE_ID } = constants
  
  const testBlobStorage = await netliBlob(NETLIFY_API_TOKEN, context, SITE_ID, NETLIFY_API_HOST)
  // const blob = testBlobStorage && (await isBlobStorageAvailable(testBlobStorage)) ? testBlobStorage : undefined

  console.log('get blob storage', { testBlobStorage, available: await isBlobStorageAvailable(testBlobStorage) })

  await stashBuildOutput(constants)

  return Promise.all([
    publishStaticAssets(constants),

    storePrerenderedContent(),
    createServerHandler(),
    createEdgeHandler(),
  ])
}
