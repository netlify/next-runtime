import { writeFileSync } from 'fs'

import { NetlifyConfig } from '@netlify/build'
import { build } from 'esbuild'
import { copySync, emptyDirSync, readJsonSync, writeJSONSync } from 'fs-extra/esm'

import {
  NETLIFY_TEMP_DIR,
  SERVER_HANDLER_DIR,
  SERVER_HANDLER_NAME,
  SERVER_HANDLER_URL,
  MODULE_DIR,
} from './constants.js'

/**
 * Create a Netlify function to run the Next.js server
 * @param publishDir The publish directory
 * @param config Netlify config
 */
export const createServerHandler = async (publishDir: string, config: NetlifyConfig) => {
  const pluginDir = `${MODULE_DIR}../..`
  const pluginPkg = readJsonSync(`${pluginDir}/package.json`)

  // clear the server handler directory
  emptyDirSync(SERVER_HANDLER_DIR)

  // copy the next.js standalone build output to the server handler directory
  copySync(`${publishDir}/standalone/.next`, `${SERVER_HANDLER_DIR}/.next`)
  copySync(`${publishDir}/standalone/node_modules`, `${SERVER_HANDLER_DIR}/node_modules`)

  // create the server handler metadata file
  const metadata = {
    config: {
      name: 'Next.js Server Handler',
      generator: `${pluginPkg.name}@${pluginPkg.version}`,
      nodeBundler: 'none',
      // TODO: remove the final include when Netlify Functions v2 fixes the default exports bug
      includedFiles: ['.next/**', 'node_modules/**', `${SERVER_HANDLER_NAME}-actual.mjs`],
      includedFilesBasePath: SERVER_HANDLER_DIR,
    },
    version: 1,
  }
  writeJSONSync(`${SERVER_HANDLER_DIR}/${SERVER_HANDLER_NAME}.json`, metadata)

  // bundle the server handler to a single file
  await build({
    entryPoints: [`${pluginDir}/dist/templates/server-handler.mjs`],
    bundle: true,
    platform: 'node',
    target: ['node18'],
    format: 'esm',
    external: ['next'],
    outfile: `${SERVER_HANDLER_DIR}/${SERVER_HANDLER_NAME}-actual.mjs`,
  })

  // TODO: remove when Netlify Functions v2 fixes the default exports bug
  writeFileSync(
    `${SERVER_HANDLER_DIR}/${SERVER_HANDLER_NAME}.mjs`,
    `import handler from './${SERVER_HANDLER_NAME}-actual.mjs';export default (request) => handler(request);`,
  )

  // TODO: move to inline config when Netlify Functions v2 fixes the config bug
  config.redirects ||= []
  config.redirects.push({ from: `/*`, to: SERVER_HANDLER_URL, status: 200 })
}

export const createCacheHandler = () => {
  copySync(`${MODULE_DIR}/../templates/cache-handler.cjs`, `${NETLIFY_TEMP_DIR}/cache-handler.js`)
}
