import { NetlifyPluginOptions } from '@netlify/build'
import { setBuildConfig } from './helpers/config.js'
import { publishStaticContent, stashBuildOutput, storePrerenderedContent } from './helpers/files.js'
import { createEdgeHandler, createServerHandler } from './helpers/functions.js'

export const onPreBuild = ({ constants, utils }: NetlifyPluginOptions) => {
  setBuildConfig()
}

export const onBuild = async ({ constants, utils }: NetlifyPluginOptions) => {
  await stashBuildOutput(constants, utils)

  return Promise.all([
    publishStaticContent(constants),
    storePrerenderedContent(constants),
    createServerHandler(),
    createEdgeHandler(),
  ])
}
