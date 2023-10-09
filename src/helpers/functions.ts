import { NetlifyConfig } from '@netlify/build'
import { nodeFileTrace } from '@vercel/nft'
import { copySync, emptyDirSync, readJsonSync, writeJSONSync } from 'fs-extra/esm'

import { SERVER_HANDLER_DIR, SERVER_HANDLER_NAME, SERVER_HANDLER_URL, __dirname } from './constants.js'

/**
 * Create a Netlify function to run the Next.js server
 * @param publishDir The publish directory
 * @param config Netlify config
 */
export const createHandlerFunction = async (publishDir: string, config: NetlifyConfig) => {
  emptyDirSync(SERVER_HANDLER_DIR)

  const pluginDir = `${__dirname}../..`
  const pluginPkg = readJsonSync(`${pluginDir}/package.json`)

  const metadata = {
    config: {
      name: 'Next.js Server Handler',
      generator: `${pluginPkg.name}@${pluginPkg.version}`,
      nodeBundler: 'none',
      includedFiles: [
        `${SERVER_HANDLER_DIR}/${SERVER_HANDLER_NAME}.*`,
        `${SERVER_HANDLER_DIR}/.next/**`,
        `${SERVER_HANDLER_DIR}/node_modules/**`,
      ],
    },
    version: 1,
  }

  const { fileList } = await nodeFileTrace([`${pluginDir}/dist/templates/handler.js`], {
    base: pluginDir,
  })
  const [handler, ...dependencies] = [...fileList]

  dependencies.forEach((path) => {
    copySync(`${pluginDir}/${path}`, `${SERVER_HANDLER_DIR}/${path}`)
  })

  copySync(`${publishDir}/standalone/.next`, `${SERVER_HANDLER_DIR}/.next`)
  copySync(`${publishDir}/standalone/node_modules`, `${SERVER_HANDLER_DIR}/node_modules`)

  copySync(`${pluginDir}/${handler}`, `${SERVER_HANDLER_DIR}/${SERVER_HANDLER_NAME}.mjs`)
  writeJSONSync(`${SERVER_HANDLER_DIR}/${SERVER_HANDLER_NAME}.json`, metadata, { spaces: 2 })

  config.redirects ||= []
  config.redirects.push({ from: `/*`, to: SERVER_HANDLER_URL, status: 200 })
}
