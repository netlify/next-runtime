import { setBuildConfig } from './helpers/config.js'
import { publishStaticContent, stashBuildOutput, storePrerenderedContent } from './helpers/files.js'
import { createEdgeHandler, createServerHandler } from './helpers/functions.js'
import { EnhancedNetlifyPluginOptions } from './helpers/types.js'

export const onPreBuild = () => {
  setBuildConfig()
}

export const onBuild = async ({ constants }: EnhancedNetlifyPluginOptions) => {
  await stashBuildOutput(constants)

  return Promise.all([
    publishStaticContent(constants),
    storePrerenderedContent(constants),
    createServerHandler(),
    createEdgeHandler(),
  ])
}
