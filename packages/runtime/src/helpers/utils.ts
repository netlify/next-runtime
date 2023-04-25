import type { NetlifyConfig } from '@netlify/build'
import type { Header } from '@netlify/build/types/config/netlify_config'
import globby from 'globby'
import type { ExperimentalConfig } from 'next/dist/server/config-shared'
import type { ImageConfigComplete, RemotePattern } from 'next/dist/shared/lib/image-config'
import { join } from 'pathe'

import { OPTIONAL_CATCH_ALL_REGEX, CATCH_ALL_REGEX, DYNAMIC_PARAMETER_REGEX, HANDLER_FUNCTION_PATH } from '../constants'

import { ApiRouteType } from './analysis'
import type { APILambda } from './functions'
import { I18n } from './types'

const RESERVED_FILENAME = /[^\w_-]/g

/**
 * Given a Next route, generates a valid Netlify function name.
 * If "background" is true then the function name will have `-background`
 * appended to it, meaning that it is executed as a background function.
 */
export const getFunctionNameForPage = (page: string, background = false) =>
  `${page
    .replace(CATCH_ALL_REGEX, '_$1-SPLAT')
    .replace(OPTIONAL_CATCH_ALL_REGEX, '-SPLAT')
    .replace(DYNAMIC_PARAMETER_REGEX, '_$1-PARAM')
    .replace(RESERVED_FILENAME, '_')}-${background ? 'background' : 'handler'}`

type ExperimentalConfigWithLegacy = ExperimentalConfig & {
  images?: Pick<ImageConfigComplete, 'remotePatterns'>
}

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

export const generateNetlifyRoutes = ({
  route,
  dataRoute,
  withData = true,
}: {
  route: string
  dataRoute: string
  withData: boolean
}) => [...(withData ? toNetlifyRoute(dataRoute) : []), ...toNetlifyRoute(route)]

export const routeToDataRoute = (route: string, buildId: string, locale?: string) =>
  `/_next/data/${buildId}${locale ? `/${locale}` : ''}${route === '/' ? (locale ? '' : '/index') : route}.json`

// Default locale is served from root, not localized
export const localizeRoute = (route: string, locale: string, defaultLocale: string) =>
  locale === defaultLocale ? route : `/${locale}${route}`

const netlifyRoutesForNextRoute = ({
  route,
  buildId,
  i18n,
  withData = true,
  dataRoute,
}: {
  route: string
  buildId: string
  i18n?: I18n
  withData?: boolean
  dataRoute?: string
}): Array<{ redirect: string; locale: string | false; dataRoute?: string }> => {
  if (!i18n?.locales?.length) {
    return generateNetlifyRoutes({ route, dataRoute: dataRoute || routeToDataRoute(route, buildId), withData }).map(
      (redirect) => ({
        redirect,
        locale: false,
      }),
    )
  }
  const { locales, defaultLocale } = i18n
  const routes = []
  locales.forEach((locale) => {
    // Data route is always localized, except for appDir
    const localizedDataRoute = dataRoute
      ? localizeRoute(dataRoute, locale, defaultLocale)
      : routeToDataRoute(route, buildId, locale)

    routes.push(
      ...generateNetlifyRoutes({
        route: localizeRoute(route, locale, defaultLocale),
        dataRoute: localizedDataRoute,
        withData,
      }).map((redirect) => ({
        redirect,
        locale,
      })),
    )
  })
  return routes
}

export const isApiRoute = (route: string) => route.startsWith('/api/') || route === '/api'

export const is404Route = (route: string, i18n?: I18n) =>
  i18n ? i18n.locales.some((locale) => route === `/${locale}/404`) : route === '/404'

export const redirectsForNextRoute = ({
  route,
  buildId,
  basePath,
  to,
  i18n,
  status = 200,
  force = false,
  withData = true,
  dataRoute,
}: {
  route: string
  buildId: string
  basePath: string
  to: string
  i18n: I18n
  status?: number
  force?: boolean
  withData?: boolean
  dataRoute?: string
}): NetlifyConfig['redirects'] =>
  netlifyRoutesForNextRoute({ route, buildId, i18n, withData, dataRoute }).map(({ redirect }) => ({
    from: `${basePath}${redirect}`,
    to,
    status,
    force,
  }))

export const redirectsForNext404Route = ({
  route,
  buildId,
  basePath,
  i18n,
  force = false,
}: {
  route: string
  buildId: string
  basePath: string
  i18n: I18n
  force?: boolean
}): NetlifyConfig['redirects'] =>
  netlifyRoutesForNextRoute({ route, buildId, i18n }).map(({ redirect, locale }) => ({
    from: `${basePath}${redirect}`,
    to: locale ? `${basePath}/server/pages/${locale}/404.html` : `${basePath}/server/pages/404.html`,
    status: 404,
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
  generateNetlifyRoutes({ route, dataRoute, withData: true }).map((redirect) => ({
    from: `${basePath}${redirect}`,
    to,
    status,
    force,
  }))

export const getApiRewrites = (basePath: string, apiLambdas: APILambda[]) => {
  const apiRewrites = apiLambdas.flatMap((lambda) =>
    lambda.routes.map((apiRoute) => {
      const [from] = toNetlifyRoute(`${basePath}${apiRoute.route}`)

      // Scheduled functions can't be invoked directly, so we 404 them.
      if (apiRoute.config.type === ApiRouteType.SCHEDULED) {
        return { from, to: '/404.html', status: 404 }
      }
      return {
        from,
        to: `/.netlify/functions/${lambda.functionName}`,
        status: 200,
      }
    }),
  )

  return [
    ...apiRewrites,
    {
      from: `${basePath}/api/*`,
      to: HANDLER_FUNCTION_PATH,
      status: 200,
    },
  ]
}

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
    // eslint-disable-next-line import/no-unassigned-import, import/no-extraneous-dependencies, n/no-extraneous-require
    require('next-auth')
    return true
  } catch {
    // Ignore the MODULE_NOT_FOUND error
    return false
  }
}

export const getCustomImageResponseHeaders = (headers: Header[]): Record<string, string> | null => {
  const customImageResponseHeaders = headers.find((header) => header.for?.startsWith('/_next/image/'))

  if (customImageResponseHeaders) {
    return customImageResponseHeaders?.values as Record<string, string>
  }
  return null
}

export const isBundleSizeCheckDisabled = () =>
  process.env.DISABLE_BUNDLE_ZIP_SIZE_CHECK === '1' || process.env.DISABLE_BUNDLE_ZIP_SIZE_CHECK === 'true'

// In v12.2.6-canary.12 the types had not yet been updated.
// Once this type is available from the next package, this should
// be removed
export type ImagesConfig = Partial<ImageConfigComplete> &
  Required<ImageConfigComplete> & {
    remotePatterns?: RemotePattern[]
  }
export const getRemotePatterns = (experimental: ExperimentalConfigWithLegacy, images: ImagesConfig) => {
  // Where remote patterns is configured pre-v12.2.5
  if (experimental.images?.remotePatterns) {
    return experimental.images.remotePatterns
  }

  // Where remote patterns is configured after v12.2.5
  if (images.remotePatterns) {
    return images.remotePatterns || []
  }
  return []
}

// Taken from next/src/shared/lib/escape-regexp.ts
const reHasRegExp = /[|\\{}()[\]^$+*?.-]/
const reReplaceRegExp = /[|\\{}()[\]^$+*?.-]/g
export const escapeStringRegexp = (str: string) => (reHasRegExp.test(str) ? str.replace(reReplaceRegExp, '\\$&') : str)
