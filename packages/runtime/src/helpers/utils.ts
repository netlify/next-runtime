import type { NetlifyConfig } from '@netlify/build'
import globby from 'globby'
import { join } from 'pathe'

import { OPTIONAL_CATCH_ALL_REGEX, CATCH_ALL_REGEX, DYNAMIC_PARAMETER_REGEX, HANDLER_FUNCTION_PATH } from '../constants'

import { I18n } from './types'

export const toNetlifyRoute = (nextRoute: string): Array<string> => {
  const netlifyRoutes = [nextRoute]

  // If the route is an optional catch-all route, we need to add a second
  // Netlify route for the base path (when no parameters are present).
  // The file ending must be present!
  if (OPTIONAL_CATCH_ALL_REGEX.test(nextRoute)) {
    let netlifyRoute = nextRoute.replace(OPTIONAL_CATCH_ALL_REGEX, '$2')

    // create an empty string, but actually needs to be a forward slash
    if (netlifyRoute === '') {
      netlifyRoute = '/'
    }
    // When optional catch-all route is at top-level, the regex on line 19 will
    // create an incorrect route for the data route. For example, it creates
    // /_next/data/%BUILDID%.json, but NextJS looks for
    // /_next/data/%BUILDID%/index.json
    netlifyRoute = netlifyRoute.replace(/(\/_next\/data\/[^/]+).json/, '$1/index.json')

    // Add second route to the front of the array
    netlifyRoutes.unshift(netlifyRoute)
  }

  return netlifyRoutes.map((route) =>
    route
      // Replace catch-all, e.g., [...slug]
      .replace(CATCH_ALL_REGEX, '/:$1/*')
      // Replace optional catch-all, e.g., [[...slug]]
      .replace(OPTIONAL_CATCH_ALL_REGEX, '/*')
      // Replace dynamic parameters, e.g., [id]
      .replace(DYNAMIC_PARAMETER_REGEX, '/:$1'),
  )
}

export const netlifyRoutesForNextRouteWithData = ({ route, dataRoute }: { route: string; dataRoute: string }) => [
  ...toNetlifyRoute(dataRoute),
  ...toNetlifyRoute(route),
]

export const routeToDataRoute = (route: string, buildId: string, locale?: string) =>
  `/_next/data/${buildId}${locale ? `/${locale}` : ''}${route === '/' ? '/index' : route}.json`

const netlifyRoutesForNextRoute = (route: string, buildId: string, i18n?: I18n): Array<string> => {
  if (!i18n?.locales?.length) {
    return netlifyRoutesForNextRouteWithData({ route, dataRoute: routeToDataRoute(route, buildId) })
  }
  const { locales, defaultLocale } = i18n
  const routes = []
  locales.forEach((locale) => {
    // Data route is always localized
    const dataRoute = routeToDataRoute(route, buildId, locale)

    routes.push(
      // Default locale is served from root, not localized
      ...netlifyRoutesForNextRouteWithData({
        route: locale === defaultLocale ? route : `/${locale}${route}`,
        dataRoute,
      }),
    )
  })
  return routes
}

export const isApiRoute = (route: string) => route.startsWith('/api/') || route === '/api'

export const redirectsForNextRoute = ({
  route,
  buildId,
  basePath,
  to,
  i18n,
  status = 200,
  force = false,
}: {
  route: string
  buildId: string
  basePath: string
  to: string
  i18n: I18n
  status?: number
  force?: boolean
}): NetlifyConfig['redirects'] =>
  netlifyRoutesForNextRoute(route, buildId, i18n).map((redirect) => ({
    from: `${basePath}${redirect}`,
    to,
    status,
    force,
  }))

export const redirectsForNextRouteWithData = ({
  route,
  dataRoute,
  basePath,
  to,
  status = 200,
  force = false,
}: {
  route: string
  dataRoute: string
  basePath: string
  to: string
  status?: number
  force?: boolean
}): NetlifyConfig['redirects'] =>
  netlifyRoutesForNextRouteWithData({ route, dataRoute }).map((redirect) => ({
    from: `${basePath}${redirect}`,
    to,
    status,
    force,
  }))

export const getApiRewrites = (basePath) => [
  {
    from: `${basePath}/api`,
    to: HANDLER_FUNCTION_PATH,
    status: 200,
  },
  {
    from: `${basePath}/api/*`,
    to: HANDLER_FUNCTION_PATH,
    status: 200,
  },
]

export const getPreviewRewrites = async ({ basePath, appDir }) => {
  const publicFiles = await globby('**/*', { cwd: join(appDir, 'public') })

  // Preview mode gets forced to the function, to bypass pre-rendered pages, but static files need to be skipped
  return [
    ...publicFiles.map((file) => ({
      from: `${basePath}/${file}`,
      // This is a no-op, but we do it to stop it matching the following rule
      to: `${basePath}/${file}`,
      conditions: { Cookie: ['__prerender_bypass', '__next_preview_data'] },
      status: 200,
    })),
    {
      from: `${basePath}/*`,
      to: HANDLER_FUNCTION_PATH,
      status: 200,
      conditions: { Cookie: ['__prerender_bypass', '__next_preview_data'] },
      force: true,
    },
  ]
}

export const shouldSkip = (): boolean =>
  process.env.NEXT_PLUGIN_FORCE_RUN === 'false' ||
  process.env.NEXT_PLUGIN_FORCE_RUN === '0' ||
  process.env.NETLIFY_NEXT_PLUGIN_SKIP === 'true' ||
  process.env.NETLIFY_NEXT_PLUGIN_SKIP === '1'

/**
 * Given an array of base paths and candidate modules, return the first one that exists
 */
export const findModuleFromBase = ({ paths, candidates }): string | null => {
  for (const candidate of candidates) {
    try {
      const modulePath = require.resolve(candidate, { paths })
      if (modulePath) {
        return modulePath
      }
    } catch {
      // Ignore the error
    }
  }
  return null
}

export const isNextAuthInstalled = (): boolean => {
  try {
    // eslint-disable-next-line import/no-unassigned-import, import/no-unresolved, n/no-missing-require
    require('next-auth')
    return true
  } catch {
    // Ignore the MODULE_NOT_FOUND error
    return false
  }
}
