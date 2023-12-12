import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const MODULE_DIR = fileURLToPath(new URL('.', import.meta.url))
export const PLUGIN_DIR = join(MODULE_DIR, '../..')

const pkg = JSON.parse(readFileSync(join(PLUGIN_DIR, 'package.json'), 'utf-8'))

export const PLUGIN_NAME = pkg.name
export const PLUGIN_VERSION = pkg.version

/** This directory is swapped with the publish dir and deployed to the Netlify CDN */
export const STATIC_DIR = '.netlify/static'

/** This directory will be deployed to the blob store */
export const BLOB_DIR = '.netlify/blobs/deploy'

/** This directory contains files for the serverless lambda function */
export const SERVER_FUNCTIONS_DIR = '.netlify/functions-internal'
export const SERVER_HANDLER_NAME = '___netlify-server-handler'
export const SERVER_HANDLER_DIR = join(SERVER_FUNCTIONS_DIR, SERVER_HANDLER_NAME)

/** This directory contains files for deno edge functions */
export const EDGE_FUNCTIONS_DIR = '.netlify/edge-functions'
export const EDGE_HANDLER_NAME = '___netlify-edge-handler'
export const EDGE_HANDLER_DIR = join(EDGE_FUNCTIONS_DIR, EDGE_HANDLER_NAME)
