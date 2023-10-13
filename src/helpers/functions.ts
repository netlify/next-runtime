import { writeFileSync } from 'fs'

import { nodeFileTrace } from '@vercel/nft'
import { copySync, emptyDirSync, readJsonSync, writeJSONSync } from 'fs-extra/esm'

import { NEXT_BUILD_DIR, SERVER_HANDLER_DIR, SERVER_HANDLER_NAME, PLUGIN_DIR } from './constants.js'
import { write } from 'fs-extra'

const pkg = readJsonSync(`${PLUGIN_DIR}/package.json`)

/**
 * Create a Netlify function to run the Next.js server
 * @param publishDir The publish directory
 * @param config Netlify config
 */
export const createServerHandler = async () => {
  // clear the server handler directory
  emptyDirSync(SERVER_HANDLER_DIR)

  // trace the server handler dependencies
  const { fileList } = await nodeFileTrace(
    [`${PLUGIN_DIR}/dist/templates/server-handler.js`, `${PLUGIN_DIR}/dist/templates/cache-handler.cjs`],
    { base: PLUGIN_DIR, ignore: ['package.json', 'node_modules/next/**'] },
  )

  // copy the handler dependencies
  fileList.forEach((path) => {
    copySync(`${PLUGIN_DIR}/${path}`, `${SERVER_HANDLER_DIR}/${path}`)
  })

  // copy the next.js standalone build output to the server handler directory
  copySync(`${NEXT_BUILD_DIR}/standalone/.next`, `${SERVER_HANDLER_DIR}/.next`)
  copySync(`${NEXT_BUILD_DIR}/standalone/node_modules`, `${SERVER_HANDLER_DIR}/node_modules`)

  // create the server handler metadata file
  writeJSONSync(`${SERVER_HANDLER_DIR}/${SERVER_HANDLER_NAME}.json`, {
    config: {
      name: 'Next.js Server Handler',
      generator: `${pkg.name}@${pkg.version}`,
      nodeBundler: 'none',
      includedFiles: [`${SERVER_HANDLER_NAME}*`, 'package.json', 'dist/**', '.next/**', 'node_modules/**'],
      includedFilesBasePath: SERVER_HANDLER_DIR,
    },
    version: 1,
  })

  writeFileSync(`${SERVER_HANDLER_DIR}/package.json`, JSON.stringify({ type: 'module' }))

  writeFileSync(
    `${SERVER_HANDLER_DIR}/${SERVER_HANDLER_NAME}.js`,
    `import handler from './dist/templates/server-handler.js';export default (request) => handler;export const config = { path: '/*' }`,
  )
}
