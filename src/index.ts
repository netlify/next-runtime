import type { NetlifyPluginOptions } from '@netlify/build'

import { setBuildtimeConfig } from './helpers/config.js'
import { moveStaticAssets, stashBuildOutput } from './helpers/files.js'
import { createServerHandler } from './helpers/functions.js'

type NetlifyPluginOptionsWithFlags = NetlifyPluginOptions & { featureFlags?: Record<string, unknown> }

export const onPreBuild = () => {
  setBuildtimeConfig()
}

export const onBuild = async ({ constants }: NetlifyPluginOptionsWithFlags) => {
  stashBuildOutput(constants)
  moveStaticAssets(constants)
  await createServerHandler()
}
