import type { NetlifyPluginConstants, NetlifyPluginOptions } from '@netlify/build'
import type { PrerenderManifest } from 'next/dist/build/index.js'
import { MiddlewareManifest } from 'next/dist/build/webpack/plugins/middleware-plugin.js'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { SERVER_HANDLER_NAME } from './constants.js'

export const getPrerenderManifest = async ({
  PUBLISH_DIR,
}: Pick<NetlifyPluginConstants, 'PUBLISH_DIR'>): Promise<PrerenderManifest> => {
  return JSON.parse(await readFile(resolve(PUBLISH_DIR, 'prerender-manifest.json'), 'utf-8'))
}

/**
 * Get Next.js middleware config from the build output
 */
export const getMiddlewareManifest = async ({
  PUBLISH_DIR,
}: Pick<NetlifyPluginConstants, 'PUBLISH_DIR'>): Promise<MiddlewareManifest> => {
  return JSON.parse(
    await readFile(resolve(PUBLISH_DIR, 'server/middleware-manifest.json'), 'utf-8'),
  )
}

/**
 * Enable Next.js standalone mode at build time
 */
export const setPreBuildConfig = () => {
  process.env.NEXT_PRIVATE_STANDALONE = 'true'
}

export const setPostBuildConfig = ({
  netlifyConfig,
}: Pick<NetlifyPluginOptions, 'netlifyConfig'>) => {
  netlifyConfig.redirects ||= []
  netlifyConfig.redirects.push({
    from: '/*',
    to: `/.netlify/functions/${SERVER_HANDLER_NAME}`,
    status: 200,
  })
}

export const verifyBuildConfig = ({
  constants: { PUBLISH_DIR },
  utils: {
    build: { failBuild },
  },
}: Pick<NetlifyPluginOptions, 'constants' | 'utils'>) => {
  if (!existsSync(resolve(PUBLISH_DIR))) {
    failBuild('Publish directory not found, please check your netlify.toml')
  }
}
