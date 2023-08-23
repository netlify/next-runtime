import { fileURLToPath } from 'node:url'

export const __dirname = fileURLToPath(new URL('.', import.meta.url))

export const PUBLISH_STAGING_DIR = '.netlify/publish'
export const FUNCTIONS_INTERNAL_DIR = '.netlify/functions-internal'
export const FUNCTIONS_URL = '/.netlify/functions'
