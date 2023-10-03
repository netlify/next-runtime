import type { NetlifyPluginOptions } from '@netlify/build'

import { modifyNetlifyConfig, modifyNextConfig, revertNextConfig } from './helpers/config.js'
import { publishStaticAssets } from './helpers/files.js'
import { createServerHandler } from './helpers/functions.js'

type NetlifyPluginOptionsWithFlags = NetlifyPluginOptions & { featureFlags?: Record<string, unknown> }

export const onPreBuild = () => {
  modifyNextConfig()
}

export const onBuild = ({ constants, netlifyConfig }: NetlifyPluginOptionsWithFlags) => {
  publishStaticAssets(constants.PUBLISH_DIR)
  createServerHandler(constants.PUBLISH_DIR, netlifyConfig)
  modifyNetlifyConfig(netlifyConfig)
}

export const onEnd = () => {
  revertNextConfig()
}
