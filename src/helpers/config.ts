import { readFile } from 'node:fs/promises'

import { NextConfigComplete } from 'next/dist/server/config-shared.js'

import { RUN_DIR } from './constants.js'

/**
 * Enable Next.js standalone mode at build time
 */
export const setBuildConfig = () => {
  process.env.NEXT_PRIVATE_STANDALONE = 'true'
}

/**
 * Get Next.js config from the build output
 */
export const getRunConfig = async () => {
  // get config from the build output
  return JSON.parse(await readFile(`${RUN_DIR}/.next/required-server-files.json`, 'utf-8')).config
}

/**
 * Configure the custom cache handler at request time
 */
export const setRunConfig = (config: NextConfigComplete) => {
  // set the path to the cache handler
  config.experimental = {
    ...config.experimental,
    incrementalCacheHandlerPath: `${RUN_DIR}/dist/handlers/cache.cjs`,
  }

  // set config
  process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(config)
}
