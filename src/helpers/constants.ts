import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const MODULE_DIR = fileURLToPath(new URL('.', import.meta.url))
export const PLUGIN_DIR = resolve(`${MODULE_DIR}../..`)
export const TASK_DIR = process.cwd()

export const BUILD_DIR = `${TASK_DIR}/.netlify/.next`
export const SERVER_DIR = `${BUILD_DIR}/server`
export const STANDALONE_BUILD_DIR = `${BUILD_DIR}/standalone`
export const FETCH_CACHE_DIR = `${BUILD_DIR}/cache/fetch-cache`

export const FUNCTIONS_DIR = `${TASK_DIR}/.netlify/functions-internal`
export const EDGE_FUNCTIONS_DIR = `${TASK_DIR}/.netlify/edge-functions`

export const SERVER_HANDLER_NAME = '___netlify-server-handler'
export const SERVER_HANDLER_DIR = `${FUNCTIONS_DIR}/${SERVER_HANDLER_NAME}`
