import { NetlifyPluginOptions } from '@netlify/build'
import { setBuildConfig } from './build/config.js'
import { uploadPrerenderedContent } from './build/content/prerendered.js'
import { copyStaticContent } from './build/content/static.js'
import { createEdgeHandler } from './build/functions/edge.js'
import { createServerHandler } from './build/functions/server.js'
import { moveBuildOutput } from './build/move-build-output.js'

export const onPreBuild = ({ netlifyConfig }: NetlifyPluginOptions) => {
  setBuildConfig(netlifyConfig)
}

export const onBuild = async ({ constants, utils }: NetlifyPluginOptions) => {
  await moveBuildOutput(constants, utils)

  return Promise.all([
    copyStaticContent(constants),
    uploadPrerenderedContent(constants),
    createServerHandler(),
    createEdgeHandler(),
  ])
}
