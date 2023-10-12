import { writeFileSync } from 'fs'

import { NetlifyConfig } from '@netlify/build'
import { build } from 'esbuild'
import { copySync, emptyDirSync, readJsonSync, writeJSONSync } from 'fs-extra/esm'

import {
  NETLIFY_TEMP_DIR,
  SERVER_HANDLER_DIR,
  SERVER_HANDLER_NAME,
  SERVER_HANDLER_URL,
  PLUGIN_DIR,
} from './constants.js'

/**
 * Create a Netlify function to run the Next.js server
 * @param publishDir The publish directory
 * @param config Netlify config
 */
export const createServerHandler = async (publishDir: string, config: NetlifyConfig) => {
  // clear the server handler directory
  emptyDirSync(SERVER_HANDLER_DIR)

  // copy the next.js standalone build output to the server handler directory
  copySync(`${publishDir}/standalone/.next`, `${SERVER_HANDLER_DIR}/.next`)
  copySync(`${publishDir}/standalone/node_modules`, `${SERVER_HANDLER_DIR}/node_modules`)

  const pkg = readJsonSync(`${PLUGIN_DIR}/package.json`)

  // create the server handler metadata file
  writeJSONSync(`${SERVER_HANDLER_DIR}/${SERVER_HANDLER_NAME}.json`, {
    config: {
      name: 'Next.js Server Handler',
      generator: `${pkg.name}@${pkg.version}`,
      nodeBundler: 'none',
      // TODO: remove the final include when Netlify Functions v2 fixes the default exports bug
      includedFiles: ['.next/**', 'node_modules/**', `${SERVER_HANDLER_NAME}*`],
      includedFilesBasePath: SERVER_HANDLER_DIR,
    },
    version: 1,
  })

  // bundle the cache handler
  await build({
    entryPoints: [`${PLUGIN_DIR}/dist/templates/cache-handler.js`],
    bundle: true,
    platform: 'node',
    target: ['node18'],
    format: 'cjs',
    outfile: `${SERVER_HANDLER_DIR}/${SERVER_HANDLER_NAME}-cache.js`,
  })

  // bundle the server handler
  await build({
    entryPoints: [`${PLUGIN_DIR}/dist/templates/server-handler.js`],
    bundle: true,
    platform: 'node',
    target: ['node18'],
    format: 'esm',
    external: ['next'],
    outfile: `${SERVER_HANDLER_DIR}/${SERVER_HANDLER_NAME}-actual.mjs`,
  })

  // TODO: remove when Netlify Functions v2 fixes the default exports bug
  // https://github.com/netlify/pod-dev-foundations/issues/599
  writeFileSync(
    `${SERVER_HANDLER_DIR}/${SERVER_HANDLER_NAME}.mjs`,
    `import handler from './${SERVER_HANDLER_NAME}-actual.mjs';export default (request) => handler(request);`,
  )

  // TODO: remove this when we can use inline config
  // https://github.com/netlify/next-runtime-minimal/issues/13
  config.redirects ||= []
  config.redirects.push({ from: `/*`, to: SERVER_HANDLER_URL, status: 200 })
}

export const createCacheHandler = async () => {
  await build({
    entryPoints: [`${PLUGIN_DIR}/dist/templates/cache-handler.js`],
    bundle: true,
    platform: 'node',
    target: ['node18'],
    format: 'cjs',
    outfile: `${NETLIFY_TEMP_DIR}/cache-handler.js`,
  })
}
