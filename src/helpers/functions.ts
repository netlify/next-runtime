import { NetlifyConfig } from '@netlify/build'
import { copySync, emptyDirSync } from 'fs-extra/esm'

import { HANDLER_DIR, HANDLER_NAME, HANDLER_URL, __dirname } from './constants.js'

/**
 * Create a Netlify function to run the Next.js server
 * @param publishDir The publish directory
 * @param config Netlify config
 */
export const createHandlerFunction = (publishDir: string, config: NetlifyConfig) => {
  emptyDirSync(HANDLER_DIR)

  copySync(`${__dirname}/../templates/handler.cjs`, `${HANDLER_DIR}/${HANDLER_NAME}.js`)
  copySync(`${__dirname}/../../node_modules/@vercel/node-bridge`, `${HANDLER_DIR}/node_modules/@vercel/node-bridge`)
  copySync(`${publishDir}/standalone/.next`, `${HANDLER_DIR}/.next`)
  copySync(`${publishDir}/standalone/node_modules`, `${HANDLER_DIR}/node_modules`)

  // all the following will be replaced by the upcoming serverless functions API

  config.functions[HANDLER_NAME] ||= {}
  config.functions[HANDLER_NAME].node_bundler = 'none'
  config.functions[HANDLER_NAME].included_files ||= []
  config.functions[HANDLER_NAME].included_files.push(`${HANDLER_DIR}/${HANDLER_NAME}.js`)
  config.functions[HANDLER_NAME].included_files.push(`${HANDLER_DIR}/.next/**/*`)
  config.functions[HANDLER_NAME].included_files.push(`${HANDLER_DIR}/node_modules/**/*`)

  config.redirects ||= []
  config.redirects.push({ from: `/*`, to: HANDLER_URL, status: 200 })
}
