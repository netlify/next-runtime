import type { NetlifyPluginOptions, NetlifyPluginConstants } from '@netlify/build'

import { setBuildConfig } from './helpers/config.js'
import { publishStaticAssets, stashBuildOutput, storePrerenderedContent } from './helpers/files.js'
import { createEdgeHandler, createServerHandler } from './helpers/functions.js'

type NetlifyPluginOptionsWithFlags = NetlifyPluginOptions & {
  featureFlags?: Record<string, unknown>
}

export const onPreBuild = () => {
  setBuildConfig()
}

export const onBuild = async ({ constants }: NetlifyPluginOptionsWithFlags) => {
  await stashBuildOutput(constants)

  return Promise.all([
    publishStaticAssets(constants),
    storePrerenderedContent(),
    createServerHandler(),
    createEdgeHandler(),
  ])
}
