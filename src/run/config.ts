import type { NextConfigComplete } from 'next/dist/server/config-shared.js'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { PLUGIN_DIR } from './constants.js'

/**
 * Get Next.js config from the build output
 */
export const getRunConfig = async () => {
  return JSON.parse(await readFile(resolve('.next/required-server-files.json'), 'utf-8')).config
}

/**
 * Configure the custom cache handler at request time
 */
export const setRunConfig = (config: NextConfigComplete) => {
  // set the path to the cache handler
  config.experimental = {
    ...config.experimental,
    incrementalCacheHandlerPath: `${PLUGIN_DIR}/dist/run/handlers/cache.cjs`,
  }

  // set config
  process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(config)
}

export type TagsManifest = Record<string, string>

export const getTagsManifest = async (): Promise<TagsManifest> => {
  return JSON.parse(await readFile(resolve('.netlify/tags-manifest.json'), 'utf-8'))
}
