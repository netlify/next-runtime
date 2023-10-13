import type { NetlifyPluginOptions } from '@netlify/build'

import { setBuildConfig } from './helpers/config.js'
import { moveStaticAssets, moveBuildOutput } from './helpers/files.js'
import { createServerHandler } from './helpers/functions.js'

type NetlifyPluginOptionsWithFlags = NetlifyPluginOptions & { featureFlags?: Record<string, unknown> }

export const onPreBuild = () => {
  setBuildConfig()
}

export const onBuild = async ({ constants }: NetlifyPluginOptionsWithFlags) => {
  moveBuildOutput(constants)
  moveStaticAssets(constants)
  await createServerHandler()
}
