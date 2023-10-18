import { setBuildConfig } from './helpers/config.js'
import { publishStaticAssets, stashBuildOutput, storePrerenderedContent } from './helpers/files.js'
import { createEdgeHandler, createServerHandler } from './helpers/functions.js'
import { EnhancedNetlifyPluginOptions } from './helpers/types.js'

export const onPreBuild = () => {
  setBuildConfig()
}

export const onBuild = async ({ constants }: EnhancedNetlifyPluginOptions) => {
  await stashBuildOutput(constants)

  return Promise.all([
    publishStaticAssets(constants),
    storePrerenderedContent(constants),
    createServerHandler(),
    createEdgeHandler(),
  ])
}
