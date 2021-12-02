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

export const ODB_FUNCTION_PATH = `/.netlify/builders/${ODB_FUNCTION_NAME}`
export const HANDLER_FUNCTION_PATH = `/.netlify/functions/${HANDLER_FUNCTION_NAME}`

export const CATCH_ALL_REGEX = /\/\[\.{3}(.*)](.json)?$/
export const OPTIONAL_CATCH_ALL_REGEX = /\/\[{2}\.{3}(.*)]{2}(.json)?$/
export const DYNAMIC_PARAMETER_REGEX = /\/\[(.*?)]/g
