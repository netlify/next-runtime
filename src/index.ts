import type { NetlifyPluginOptions, NetlifyPluginConstants } from '@netlify/build'

import { getBlobStorage, isBlobStorageAvailable } from './helpers/blobs.js'
import { modifyNetlifyConfig, modifyNextConfig, revertNextConfig } from './helpers/config.js'
import { publishStaticAssets } from './helpers/files.js'
import { createServerHandler, createCacheHandler } from './helpers/functions.js'
import { checkNextSiteHasBuilt } from './helpers/verification.js'

type NetlifyPluginOptionsWithFlags = NetlifyPluginOptions & { featureFlags?: Record<string, unknown> }

type EnhancedNetlifyPluginConstants = NetlifyPluginConstants & {
  NETLIFY_API_HOST?: string
  NETLIFY_API_TOKEN?: string
}

type EnhancedNetlifyPluginOptions = NetlifyPluginOptions & { constants: EnhancedNetlifyPluginConstants } & {
  featureFlags?: Record<string, unknown>
}

export const onPreBuild = async () => {
  await createCacheHandler()
  modifyNextConfig()
}


export const onBuild = async ({ constants, netlifyConfig, utils: {build: { failBuild }
}}: EnhancedNetlifyPluginOptions) => {
  const { publish } = netlifyConfig.build
  // Need to check if site was built before we can proceed
  checkNextSiteHasBuilt({ publish, failBuild })

  publishStaticAssets(constants.PUBLISH_DIR)
  await createServerHandler(constants.PUBLISH_DIR, netlifyConfig)
  modifyNetlifyConfig(netlifyConfig)

  const { NETLIFY_API_HOST, NETLIFY_API_TOKEN, SITE_ID } = constants
  // Just the initial tests for the blob will remove in the future
  const testBlobStorage = await getBlobStorage({
    apiHost: NETLIFY_API_HOST,
    token: NETLIFY_API_TOKEN,
    siteID: SITE_ID,
    // Will need to manually add in deploy ID when testing locally
    deployId: process.env.DEPLOY_ID,
  })
  console.log('get blob storage', { available: await isBlobStorageAvailable(testBlobStorage) })
}

export const onEnd = () => {
  revertNextConfig()
}
