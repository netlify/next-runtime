import type { NetlifyPluginOptions } from '@netlify/build'

import { setBuildConfig } from './helpers/config.js'
import { publishStaticAssets, stashBuildOutput } from './helpers/files.js'
import { createServerHandler } from './helpers/functions.js'

type NetlifyPluginOptionsWithFlags = NetlifyPluginOptions & { featureFlags?: Record<string, unknown> }

export const onPreBuild = () => {
  setBuildConfig()
}

export const onBuild = async ({ constants }: NetlifyPluginOptionsWithFlags) => {
  stashBuildOutput(constants)
  publishStaticAssets(constants)
  await createServerHandler()
}
