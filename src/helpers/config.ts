import { readFile } from 'node:fs/promises'

import { TASK_DIR } from './constants.js'

/**
 * Enable standalone mode at build-time
 */
export const setBuildConfig = () => {
  process.env.NEXT_PRIVATE_STANDALONE = 'true'
}

/**
 * Configure the request-time custom cache handler
 */
export const setRequestConfig = async () => {
  // get config from the build output
  const runtimeConfig = JSON.parse(await readFile(`${TASK_DIR}/.next/required-server-files.json`, 'utf-8'))

  // set the path to the cache handler
  runtimeConfig.config.experimental = {
    ...runtimeConfig.config.experimental,
    incrementalCacheHandlerPath: `${TASK_DIR}/dist/handlers/cache.cjs`,
  }

  // set config
  process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(runtimeConfig.config)
}
