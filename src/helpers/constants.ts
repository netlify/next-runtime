import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

let dir
try {
  dir = __dirname
} catch {
  dir = fileURLToPath(new URL('.', import.meta.url))
}

export const MODULE_DIR = dir
export const PLUGIN_DIR = resolve(`${MODULE_DIR}../..`)
export const RUNTIME_DIR = resolve(`${MODULE_DIR}../..`)

export const NEXT_BUILD_DIR = '.netlify/.next'

export const FUNCTIONS_INTERNAL_DIR = '.netlify/functions-internal'
export const FUNCTIONS_URL = '/.netlify/functions'

export const SERVER_HANDLER_NAME = '___netlify-server-handler'
export const SERVER_HANDLER_DIR = `${FUNCTIONS_INTERNAL_DIR}/${SERVER_HANDLER_NAME}`
export const SERVER_HANDLER_URL = `${FUNCTIONS_URL}/${SERVER_HANDLER_NAME}`
