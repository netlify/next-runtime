import type { NetlifyPluginOptions, NetlifyPluginConstants } from '@netlify/build'


type NetlifyPluginOptionsWithFlags = NetlifyPluginOptions & { featureFlags?: Record<string, unknown> }

type EnhancedNetlifyPluginConstants = NetlifyPluginConstants & {
  NETLIFY_API_HOST: string
  NETLIFY_API_TOKEN: string
}

export type EnhancedNetlifyPluginOptions = NetlifyPluginOptions & { constants: EnhancedNetlifyPluginConstants } & {
  featureFlags?: Record<string, unknown>
}