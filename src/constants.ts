export const HANDLER_FUNCTION_NAME = '___netlify-handler'
export const ODB_FUNCTION_NAME = '___netlify-odb-handler'
export const IMAGE_FUNCTION_NAME = '_ipx'

// These are paths in .next that shouldn't be publicly accessible
export const HIDDEN_PATHS = [
  '/cache/*',
  '/server/*',
  '/serverless/*',
  '/traces',
  '/routes-manifest.json',
  '/build-manifest.json',
  '/prerender-manifest.json',
  '/react-loadable-manifest.json',
  '/BUILD_ID',
]

module.exports = {
  HIDDEN_PATHS,
  IMAGE_FUNCTION_NAME,
  HANDLER_FUNCTION_NAME,
  ODB_FUNCTION_NAME,
}
