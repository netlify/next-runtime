import type { NetlifyPluginOptions } from '@netlify/build'

import { createHandlerFunction } from './function.js'
import { moveStaticAssets } from './static.js'

type NetlifyPluginOptionsWithFlags = NetlifyPluginOptions & { featureFlags?: Record<string, unknown> }

export const onPreBuild = () => {
  // TODO: enable stadalone mode
}

export const onBuild = ({ constants, netlifyConfig }: NetlifyPluginOptionsWithFlags) => {
  createHandlerFunction(constants.PUBLISH_DIR, netlifyConfig)
  moveStaticAssets(constants.PUBLISH_DIR)
}

export const onEnd = () => {
  // TODO: clean up
}
