import { readFile } from 'node:fs/promises'

import { TASK_DIR } from './constants.js'
import { loadManifest } from './files.js'
import type { RequiredServerFiles } from './types.js'

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
// to-do: add types and build error handling
export const getNextConfig = async function getNextConfig({
  publish,
}: {
  publish: string
}, netlifyConfig): Promise<NextConfig> {
  try {
    const { config, appDir, ignore }: RequiredServerFiles = JSON.parse(await readFile(`${publish}/required-server-files.json`, 'utf-8'))
    if (!config) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return new Error('Error loading your Next config')
    }

    const routesManifest = await loadManifest(netlifyConfig, 'routes-manifest.json')

    // If you need access to other manifest files, you can add them here as well
    return { ...config, appDir, ignore, routesManifest }
  } catch{
    return new Error('Error loading your Next config')
  }
}
