import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const MODULE_DIR = fileURLToPath(new URL('.', import.meta.url))
export const PLUGIN_DIR = resolve(`${MODULE_DIR}../..`)
export const WORKING_DIR = process.cwd()

export const BUILD_DIR = `${WORKING_DIR}/.netlify`
export const RUN_DIR = WORKING_DIR

export const SERVER_FUNCTIONS_DIR = `${WORKING_DIR}/.netlify/functions-internal`
export const SERVER_HANDLER_NAME = '___netlify-server-handler'
export const SERVER_HANDLER_DIR = `${SERVER_FUNCTIONS_DIR}/${SERVER_HANDLER_NAME}`

export const EDGE_FUNCTIONS_DIR = `${WORKING_DIR}/.netlify/edge-functions`
export const EDGE_HANDLER_NAME = '___netlify-edge-handler'
export const EDGE_HANDLER_DIR = `${EDGE_FUNCTIONS_DIR}/${EDGE_HANDLER_NAME}`
