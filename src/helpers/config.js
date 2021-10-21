// @ts-check
const { readJSON } = require('fs-extra')
const { join, dirname, relative } = require('pathe')

const defaultFailBuild = (message, { error }) => {
  throw new Error(`${message}\n${error && error.stack}`)
}

const { HANDLER_FUNCTION_NAME, ODB_FUNCTION_NAME, HIDDEN_PATHS } = require('../constants')

const ODB_FUNCTION_PATH = `/.netlify/builders/${ODB_FUNCTION_NAME}`
const HANDLER_FUNCTION_PATH = `/.netlify/functions/${HANDLER_FUNCTION_NAME}`

const CATCH_ALL_REGEX = /\/\[\.{3}(.*)](.json)?$/
const OPTIONAL_CATCH_ALL_REGEX = /\/\[{2}\.{3}(.*)]{2}(.json)?$/
const DYNAMIC_PARAMETER_REGEX = /\/\[(.*?)]/g

const getNetlifyRoutes = (nextRoute) => {
  let netlifyRoutes = [nextRoute]

  // If the route is an optional catch-all route, we need to add a second
  // Netlify route for the base path (when no parameters are present).
  // The file ending must be present!
  if (OPTIONAL_CATCH_ALL_REGEX.test(nextRoute)) {
    let netlifyRoute = nextRoute.replace(OPTIONAL_CATCH_ALL_REGEX, '$2')

    // When optional catch-all route is at top-level, the regex on line 19 will
    // create an empty string, but actually needs to be a forward slash
    if (netlifyRoute === '') netlifyRoute = '/'

    // When optional catch-all route is at top-level, the regex on line 19 will
    // create an incorrect route for the data route. For example, it creates
    // /_next/data/%BUILDID%.json, but NextJS looks for
    // /_next/data/%BUILDID%/index.json
    netlifyRoute = netlifyRoute.replace(/(\/_next\/data\/[^/]+).json/, '$1/index.json')

    // Add second route to the front of the array
    netlifyRoutes.unshift(netlifyRoute)
  }

  // Replace catch-all, e.g., [...slug]
  netlifyRoutes = netlifyRoutes.map((route) => route.replace(CATCH_ALL_REGEX, '/:$1/*'))

  // Replace optional catch-all, e.g., [[...slug]]
  netlifyRoutes = netlifyRoutes.map((route) => route.replace(OPTIONAL_CATCH_ALL_REGEX, '/*'))

  // Replace dynamic parameters, e.g., [id]
  netlifyRoutes = netlifyRoutes.map((route) => route.replace(DYNAMIC_PARAMETER_REGEX, '/:$1'))

  return netlifyRoutes
}

exports.generateRedirects = async ({ netlifyConfig, basePath, i18n }) => {
  const { dynamicRoutes } = await readJSON(join(netlifyConfig.build.publish, 'prerender-manifest.json'))

  const redirects = []

  netlifyConfig.redirects.push(
    ...HIDDEN_PATHS.map((path) => ({
      from: `${basePath}${path}`,
      to: '/404.html',
      status: 404,
      force: true,
    })),
  )

  const dynamicRouteEntries = Object.entries(dynamicRoutes)
  dynamicRouteEntries.sort((a, b) => a[0].localeCompare(b[0]))

  dynamicRouteEntries.forEach(([route, { dataRoute, fallback }]) => {
    // Add redirects if fallback is "null" (aka blocking) or true/a string
    if (fallback === false) {
      return
    }
    redirects.push(...getNetlifyRoutes(route), ...getNetlifyRoutes(dataRoute))
  })

  if (i18n) {
    netlifyConfig.redirects.push({ from: `${basePath}/:locale/_next/static/*`, to: `/static/:splat`, status: 200 })
  }
  // This is only used in prod, so dev uses `next dev` directly
  netlifyConfig.redirects.push(
    { from: `${basePath}/_next/static/*`, to: `/static/:splat`, status: 200 },
    {
      from: `${basePath}/*`,
      to: HANDLER_FUNCTION_PATH,
      status: 200,
      force: true,
      conditions: { Cookie: ['__prerender_bypass', '__next_preview_data'] },
    },
    ...redirects.map((redirect) => ({
      from: `${basePath}${redirect}`,
      to: ODB_FUNCTION_PATH,
      status: 200,
    })),
    { from: `${basePath}/*`, to: HANDLER_FUNCTION_PATH, status: 200 },
  )
}

exports.getNextConfig = async function getNextConfig({ publish, failBuild = defaultFailBuild }) {
  try {
    const { config, appDir, ignore } = await readJSON(join(publish, 'required-server-files.json'))
    if (!config) {
      return failBuild('Error loading your Next config')
    }
    return { ...config, appDir, ignore }
  } catch (error) {
    return failBuild('Error loading your Next config', { error })
  }
}

const resolveModuleRoot = (moduleName) => {
  try {
    return dirname(relative(process.cwd(), require.resolve(`${moduleName}/package.json`, { paths: [process.cwd()] })))
  } catch (error) {
    return null
  }
}

exports.configureHandlerFunctions = ({ netlifyConfig, publish, ignore = [] }) => {
  /* eslint-disable no-underscore-dangle */
  netlifyConfig.functions._ipx ||= {}
  netlifyConfig.functions._ipx.node_bundler = 'nft'
  /* eslint-enable no-underscore-dangle */
  ;[HANDLER_FUNCTION_NAME, ODB_FUNCTION_NAME].forEach((functionName) => {
    netlifyConfig.functions[functionName] ||= { included_files: [], external_node_modules: [] }
    netlifyConfig.functions[functionName].node_bundler = 'nft'
    netlifyConfig.functions[functionName].included_files ||= []
    netlifyConfig.functions[functionName].included_files.push(
      `${publish}/server/**`,
      `${publish}/serverless/**`,
      `${publish}/*.json`,
      `${publish}/BUILD_ID`,
      ...ignore.map((path) => `!${path}`),
    )

    const nextRoot = resolveModuleRoot('next')
    if (nextRoot) {
      netlifyConfig.functions[functionName].included_files.push(
        `!${nextRoot}/dist/server/lib/squoosh/**/*.wasm`,
        `!${nextRoot}/dist/next-server/server/lib/squoosh/**/*.wasm`,
        `!${nextRoot}/dist/compiled/webpack/bundle4.js`,
        `!${nextRoot}/dist/compiled/webpack/bundle5.js`,
        `!${nextRoot}/dist/compiled/terser/bundle.min.js`,
      )
    }

    const sharpRoot = resolveModuleRoot('sharp')
    if (sharpRoot) {
      netlifyConfig.functions[functionName].included_files.push(`!${sharpRoot}/**/*`)
    }
  })
}
