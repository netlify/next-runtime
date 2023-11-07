import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const MODULE_DIR = fileURLToPath(new URL('.', import.meta.url))
export const PLUGIN_DIR = join(MODULE_DIR, '../..')

/** A relative path where we store the build output */
export const BUILD_DIR = '.netlify'

export const SERVER_FUNCTIONS_DIR = join(BUILD_DIR, 'functions-internal')
export const SERVER_HANDLER_NAME = '___netlify-server-handler'
export const SERVER_HANDLER_DIR = join(SERVER_FUNCTIONS_DIR, SERVER_HANDLER_NAME)

export const EDGE_FUNCTIONS_DIR = join(BUILD_DIR, 'edge-functions')
export const EDGE_HANDLER_NAME = '___netlify-edge-handler'
export const EDGE_HANDLER_DIR = join(EDGE_FUNCTIONS_DIR, EDGE_HANDLER_NAME)
