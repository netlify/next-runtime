// @ts-check
const path = require('path')

const { readJSON, writeFile } = require('fs-extra')

const ODB_FUNCTION_PATH = '/.netlify/functions/___netlify-odb-handler'
const HANDLER_FUNCTION_PATH = '/.netlify/functions/___netlify-handler'

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

const writeRedirects = async ({ siteRoot = process.cwd(), distDir, netlifyConfig }) => {
  const { dynamicRoutes } = await readJSON(path.join(siteRoot, distDir, 'prerender-manifest.json'))

  const redirects = []

  const dynamicRouteEntries = Object.entries(dynamicRoutes)
  dynamicRouteEntries.sort((a, b) => a[0].localeCompare(b[0]))

  dynamicRouteEntries.forEach(([route, { dataRoute, fallback }]) => {
    // Add redirects if fallback is "null" (aka blocking) or true/a string
    if (fallback === false) {
      return
    }
    redirects.push(...getNetlifyRoutes(route), ...getNetlifyRoutes(dataRoute))
  })

  // This is only used in prod, so dev uses `next dev` directly
  netlifyConfig.redirects.push(
    { from: '/_next/static/*', to: '/static/:splat', status: 200 },
    {
      from: '/*',
      to: HANDLER_FUNCTION_PATH,
      status: 200,
      force: true,
      conditions: { Cookie: ['__prerender_bypass', '__next_preview_data'] },
    },
    ...redirects.map((redirect) => ({
      from: redirect,
      to: ODB_FUNCTION_PATH,
      status: 200,
    })),
    { from: '/*', to: HANDLER_FUNCTION_PATH, status: 200 },
  )
}

module.exports = writeRedirects
