import type { NetlifyPluginOptions, NetlifyPluginConstants } from '@netlify/build'
import type { NextConfigComplete } from 'next/dist/server/config-shared.js'


type NetlifyPluginOptionsWithFlags = NetlifyPluginOptions & { featureFlags?: Record<string, unknown> }

type EnhancedNetlifyPluginConstants = NetlifyPluginConstants & {
  NETLIFY_API_HOST: string
  NETLIFY_API_TOKEN: string
}

export type EnhancedNetlifyPluginOptions = NetlifyPluginOptions & { constants: EnhancedNetlifyPluginConstants } & {
  featureFlags?: Record<string, unknown>
}

export interface RequiredServerFiles {
  version?: number
  relativeAppDir?: string
  config?: NextConfigComplete
  appDir?: string
  files?: string[]
  ignore?: string[]
}