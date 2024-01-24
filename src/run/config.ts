import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import type { NextConfigComplete } from 'next/dist/server/config-shared.js'

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
  const cacheHandler = join(PLUGIN_DIR, 'dist/run/handlers/cache.cjs')
  if (!existsSync(cacheHandler)) {
    throw new Error(`Cache handler not found at ${cacheHandler}`)
  }

  // set the path to the cache handler
  config.experimental = {
    ...config.experimental,
    incrementalCacheHandlerPath: cacheHandler,
  }

  // Next.js 14.1.0 moved the cache handler from experimental to stable
  // https://github.com/vercel/next.js/pull/57953/files#diff-c49c4767e6ed8627e6e1b8f96b141ee13246153f5e9142e1da03450c8e81e96fL311
  config.cacheHandler = cacheHandler
  config.cacheMaxMemorySize = 0

  // set config
  process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(config)
}

export type TagsManifest = Record<string, string>

export const getTagsManifest = async (): Promise<TagsManifest> => {
  return JSON.parse(await readFile(resolve(PLUGIN_DIR, '.netlify/tags-manifest.json'), 'utf-8'))
}
