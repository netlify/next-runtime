import type { NextConfigComplete } from 'next/dist/server/config-shared.js'
import { readFile } from 'node:fs/promises'
import { PLUGIN_DIR, RUN_DIR } from './constants.js'

/**
 * Get Next.js config from the build output
 */
export const getRunConfig = async () => {
  // get config from the build output
  const file = await readFile(`${RUN_DIR}/.next/required-server-files.json`, 'utf-8')
  const json = JSON.parse(file)
  return json.config
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
