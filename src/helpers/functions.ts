import { NetlifyConfig } from '@netlify/build'
import { nodeFileTrace } from '@vercel/nft'
import { copySync, emptyDirSync, readJsonSync, writeJSONSync } from 'fs-extra/esm'

import { HANDLER_DIR, HANDLER_NAME, HANDLER_URL, __dirname } from './constants.js'

/**
 * Create a Netlify function to run the Next.js server
 * @param publishDir The publish directory
 * @param config Netlify config
 */
export const createHandlerFunction = async (publishDir: string, config: NetlifyConfig) => {
  emptyDirSync(HANDLER_DIR)

  const pluginDir = `${__dirname}../..`
  const pluginPkg = readJsonSync(`${pluginDir}/package.json`)

  const metadata = {
    config: {
      name: 'Next.js Server Handler',
      generator: `${pluginPkg.name}@${pluginPkg.version}`,
      nodeBundler: 'none',
      includedFiles: [`${HANDLER_DIR}/${HANDLER_NAME}.*`, `${HANDLER_DIR}/.next/**`, `${HANDLER_DIR}/node_modules/**`],
    },
    version: 1,
  }

  const { fileList } = await nodeFileTrace([`${pluginDir}/dist/templates/handler.js`], {
    base: pluginDir,
  })
  const [handler, ...dependencies] = [...fileList]

  dependencies.forEach((path) => {
    copySync(`${pluginDir}/${path}`, `${HANDLER_DIR}/${path}`)
  })

  copySync(`${publishDir}/standalone/.next`, `${HANDLER_DIR}/.next`)
  copySync(`${publishDir}/standalone/node_modules`, `${HANDLER_DIR}/node_modules`)

  copySync(`${pluginDir}/${handler}`, `${HANDLER_DIR}/${HANDLER_NAME}.mjs`)
  writeJSONSync(`${HANDLER_DIR}/${HANDLER_NAME}.json`, metadata, { spaces: 2 })

  config.redirects ||= []
  config.redirects.push({ from: `/*`, to: HANDLER_URL, status: 200 })
}
