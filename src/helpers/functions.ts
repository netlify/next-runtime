import { NetlifyConfig } from '@netlify/build'
import { copySync, emptyDirSync } from 'fs-extra/esm'

import { SERVER_HANDLER_DIR, SERVER_HANDLER_NAME, SERVER_HANDLER_URL, __dirname } from './constants.js'

/**
 * Create a Netlify function to run the Next.js server
 * @param publishDir The publish directory
 * @param config Netlify config
 */
export const createServerHandler = (publishDir: string, config: NetlifyConfig) => {
  emptyDirSync(SERVER_HANDLER_DIR)

  copySync(`${__dirname}/../templates/server-handler.cjs`, `${SERVER_HANDLER_DIR}/${SERVER_HANDLER_NAME}.js`)
  copySync(`${__dirname}/../templates/headers.cjs`, `${SERVER_HANDLER_DIR}/headers.js`)
  copySync(`${__dirname}/../templates/cache-handler.cjs`, `${SERVER_HANDLER_DIR}/cache-handler.js`)
  copySync(
    `${__dirname}/../../node_modules/@vercel/node-bridge`,
    `${SERVER_HANDLER_DIR}/node_modules/@vercel/node-bridge`,
  )
  copySync(`${publishDir}/standalone/.next`, `${SERVER_HANDLER_DIR}/.next`)
  copySync(`${publishDir}/standalone/node_modules`, `${SERVER_HANDLER_DIR}/node_modules`)

  // all the following will be replaced by the upcoming server functions API

  config.functions[SERVER_HANDLER_NAME] ||= {}
  config.functions[SERVER_HANDLER_NAME].node_bundler = 'none'
  config.functions[SERVER_HANDLER_NAME].included_files ||= []
  config.functions[SERVER_HANDLER_NAME].included_files.push(`${SERVER_HANDLER_DIR}/${SERVER_HANDLER_NAME}.js`)
  config.functions[SERVER_HANDLER_NAME].included_files.push(`${SERVER_HANDLER_DIR}/.next/**/*`)
  config.functions[SERVER_HANDLER_NAME].included_files.push(`${SERVER_HANDLER_DIR}/node_modules/**/*`)

  config.redirects ||= []
  config.redirects.push({ from: `/*`, to: SERVER_HANDLER_URL, status: 200 })
}
