export const HANDLER_FUNCTION_NAME = '___netlify-handler'
export const ODB_FUNCTION_NAME = '___netlify-odb-handler'
export const IMAGE_FUNCTION_NAME = '_ipx'
export const NEXT_PLUGIN_NAME = '@netlify/next-runtime'
export const NEXT_PLUGIN = '@netlify/plugin-nextjs'
export const HANDLER_FUNCTION_TITLE = 'Next.js SSR handler'
export const ODB_FUNCTION_TITLE = 'Next.js ISR handler'
export const IMAGE_FUNCTION_TITLE = 'next/image handler'
// These are paths in .next that shouldn't be publicly accessible
export const HIDDEN_PATHS = [
  '/cache',
  '/server',
  '/serverless',
  '/trace',
  '/traces',
  '/routes-manifest.json',
  '/build-manifest.json',
  '/prerender-manifest.json',
  '/react-loadable-manifest.json',
  process.env.NODE_ENV === `test` ? false : '/BUILD_ID',
  '/app-build-manifest.json',
  '/app-path-routes-manifest.json',
  '/export-marker.json',
  '/images-manifest.json',
  '/next-server.js.nft.json',
  '/package.json',
  '/prerender-manifest.js',
  '/required-server-files.json',
  '/static-manifest.json',
].filter(Boolean)

export const ODB_FUNCTION_PATH = `/.netlify/builders/${ODB_FUNCTION_NAME}`
export const HANDLER_FUNCTION_PATH = `/.netlify/functions/${HANDLER_FUNCTION_NAME}`
export const DEFAULT_FUNCTIONS_SRC = 'netlify/functions'
export const CATCH_ALL_REGEX = /\/\[\.{3}(.*)](.json)?$/
export const OPTIONAL_CATCH_ALL_REGEX = /\/\[{2}\.{3}(.*)]{2}(.json)?$/
export const DYNAMIC_PARAMETER_REGEX = /\/\[(.*?)]/g
export const MINIMUM_REVALIDATE_SECONDS = 60
// 50MB, which is the warning max
export const LAMBDA_WARNING_SIZE = 1024 * 1024 * 50
// 250MB, which is the hard max
export const LAMBDA_MAX_SIZE = 1024 * 1024 * 250

export const DIVIDER = `
────────────────────────────────────────────────────────────────
`
