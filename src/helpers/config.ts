import { readFile } from 'node:fs/promises'

import { RUNTIME_DIR } from './constants.js'

/**
 * Enable Next.js standalone mode
 */
export const setBuildtimeConfig = () => {
  process.env.NEXT_PRIVATE_STANDALONE = 'true'
}

export const setRuntimeConfig = async () => {
  const runtimeConfig = JSON.parse(await readFile('./.next/required-server-files.json', 'utf-8'))

  // set the path to the cache handler
  runtimeConfig.config.experimental = {
    ...runtimeConfig.config.experimental,
    incrementalCacheHandlerPath: `${RUNTIME_DIR}/dist/templates/cache-handler.cjs`,
  }

  // set config from the build output
  process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(runtimeConfig.config)
}
