import type { NetlifyConfig } from '@netlify/build'
import { copySync } from 'fs-extra/esm'

import { FUNCTIONS_INTERNAL_DIR, FUNCTIONS_URL, __dirname } from './constants.js'

const HANDLER_NAME = '___netlify-handler'
const HANDLER_DIR = `${FUNCTIONS_INTERNAL_DIR}/${HANDLER_NAME}`
const HANDLER_URL = `${FUNCTIONS_URL}/${HANDLER_NAME}`

const moveServerFiles = (publishDir: string) => {
  // TODO: consider caching here to avoid copying on every build
  // TODO: consider basepaths and monorepos, etc.
  // TODO: ensure functions internal dir is empty
  copySync(`${publishDir}/standalone/.next`, `${HANDLER_DIR}/.next`, { overwrite: true })
  copySync(`${__dirname}/../templates/handler.cjs`, `${HANDLER_DIR}/${HANDLER_NAME}.js`, { overwrite: true })
  copySync(`${__dirname}/../templates/bridge.cjs`, `${HANDLER_DIR}/bridge.js`, { overwrite: true })
  copySync(`${__dirname}/../templates/cache-handler.cjs`, `${HANDLER_DIR}/cache-handler.js`, {
    overwrite: true,
  })
}

const configureHandlerFunction = (config: NetlifyConfig) => {
  config.functions[HANDLER_NAME] ||= {}
  config.functions[HANDLER_NAME].included_files ||= []
  config.functions[HANDLER_NAME].included_files.push(`${HANDLER_DIR}/.next/**/*`)
}

const addCatchAllRedirect = (config: NetlifyConfig) => {
  config.redirects ||= []
  config.redirects.push({ from: `/*`, to: HANDLER_URL, status: 200 })
}

export const createHandlerFunction = (publishDir: string, config: NetlifyConfig) => {
  moveServerFiles(publishDir)
  configureHandlerFunction(config)
  addCatchAllRedirect(config)
}
