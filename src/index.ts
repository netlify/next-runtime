import type { NetlifyPluginOptions } from '@netlify/build'

import { setBuildConfig } from './helpers/config.js'
import { stashBuildOutput, publishStaticAssets, storePrerenderedContent } from './helpers/files.js'
import { createServerHandler } from './helpers/functions.js'

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
  ])
}
