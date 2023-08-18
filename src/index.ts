import type { NetlifyPluginOptions } from '@netlify/build'

import { overrideNextJsConfig, revertNextJsConfig } from './helpers/config.js'
import { createHandlerFunction } from './helpers/functions.js'
import { publishStaticAssets, revertStaticAssets } from './helpers/static.js'

type NetlifyPluginOptionsWithFlags = NetlifyPluginOptions & { featureFlags?: Record<string, unknown> }

export const onPreBuild = () => {
  overrideNextJsConfig()
}

export const onBuild = ({ constants, netlifyConfig }: NetlifyPluginOptionsWithFlags) => {
  // createHandlerFunction(constants.PUBLISH_DIR, netlifyConfig)
  // publishStaticAssets(constants.PUBLISH_DIR)
}

export const onEnd = ({ constants }) => {
  // revertStaticAssets(constants.PUBLISH_DIR)
  // revertNextJsConfig()
}
