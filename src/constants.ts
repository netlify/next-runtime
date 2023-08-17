import path from 'path'

export const __dirpath = path.relative('.', __dirname)

export const PUBLISH_STAGING_DIR = '.netlify/publish'
export const FUNCTIONS_INTERNAL_DIR = '.netlify/functions-internal'
export const FUNCTIONS_URL = '/.netlify/functions'
