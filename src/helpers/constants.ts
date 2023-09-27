import { fileURLToPath } from 'node:url'

export const __dirname = fileURLToPath(new URL('.', import.meta.url))

export const NETLIFY_PUBLISH_DIR = '.netlify/publish'

export const FUNCTIONS_INTERNAL_DIR = '.netlify/functions-internal'
export const FUNCTIONS_URL = '/.netlify/functions'

export const HANDLER_NAME = '___netlify-handler'
export const HANDLER_DIR = `${FUNCTIONS_INTERNAL_DIR}/${HANDLER_NAME}`
export const HANDLER_URL = `${FUNCTIONS_URL}/${HANDLER_NAME}`
