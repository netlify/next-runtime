import { fileURLToPath } from 'node:url'

export const __dirname = fileURLToPath(new URL('.', import.meta.url))

export const NETLIFY_PUBLISH_DIR = '.netlify/publish'

export const FUNCTIONS_INTERNAL_DIR = '.netlify/functions-internal'
export const FUNCTIONS_URL = '/.netlify/functions'

export const SERVER_HANDLER_NAME = '___netlify-server-handler'
export const SERVER_HANDLER_DIR = `${FUNCTIONS_INTERNAL_DIR}/${SERVER_HANDLER_NAME}`
export const SERVER_HANDLER_URL = `${FUNCTIONS_URL}/${SERVER_HANDLER_NAME}`
