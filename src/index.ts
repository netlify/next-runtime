import { NetlifyPluginOptions } from '@netlify/build'
import { moveBuildOutput } from './build/cache.js'
import { setBuildConfig } from './build/config.js'
import { uploadPrerenderedContent } from './build/content/prerendered.js'
import { copyStaticContent } from './build/content/static.js'
import { createEdgeHandler } from './build/functions/edge.js'
import { createServerHandler } from './build/functions/server.js'

export const onPreBuild = () => {
  setBuildConfig()
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
