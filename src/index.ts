import { NetlifyPluginOptions } from '@netlify/build'
import { setBuildConfig } from './build/config.js'
import { uploadPrerenderedContent } from './build/content/prerendered.js'
import { copyStaticContent } from './build/content/static.js'
import { createEdgeHandler } from './build/functions/edge.js'
import { createServerHandler } from './build/functions/server.js'
import { moveBuildOutput } from './build/move-build-output.js'
import { getDeployStore } from '@netlify/blobs'

export const onPreBuild = ({ netlifyConfig }: NetlifyPluginOptions) => {
  setBuildConfig(netlifyConfig)
}

export const onBuild = async ({ constants, utils }: NetlifyPluginOptions) => {
  const blob = getDeployStore({
    deployID: process.env.DEPLOY_ID,
    siteID: constants.SITE_ID,
    token: constants.NETLIFY_API_TOKEN,
    apiURL: `https://${constants.NETLIFY_API_HOST}`,
  })
  await moveBuildOutput(constants, utils)

  return Promise.all([
    copyStaticContent(constants, blob),
    uploadPrerenderedContent(constants),
    createServerHandler(),
    createEdgeHandler(),
  ])
}
