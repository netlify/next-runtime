import type { NetlifyConfig } from '@netlify/build/types'
import { yellowBright } from 'chalk'
import destr from 'destr'
import { readJSON } from 'fs-extra'
import type { NextConfig } from 'next'
import type { PrerenderManifest, SsgRoute } from 'next/dist/build'
import { outdent } from 'outdent'
import { join } from 'pathe'

import { HANDLER_FUNCTION_PATH, ODB_FUNCTION_PATH } from '../constants'

import { isAppDirRoute, loadAppPathRoutesManifest } from './edge'
import { getMiddleware } from './files'
import { APILambda } from './functions'
import { RoutesManifest } from './types'
import {
  getApiRewrites,
  getPreviewRewrites,
  is404Route,
  isApiRoute,
  redirectsForNextRoute,
  redirectsForNextRouteWithData,
  redirectsForNext404Route,
  routeToDataRoute,
} from './utils'

const matchesMiddleware = (middleware: Array<string>, route: string): boolean =>
  middleware.some((middlewarePath) => route.startsWith(middlewarePath))

const generateLocaleRedirects = ({
  i18n,
  basePath,
  trailingSlash,
}: Pick<NextConfig, 'i18n' | 'basePath' | 'trailingSlash'>): NetlifyConfig['redirects'] => {
  const redirects: NetlifyConfig['redirects'] = []
  // If the cookie is set, we need to redirect at the origin
  redirects.push({
    from: `${basePath}/`,
    to: HANDLER_FUNCTION_PATH,
    status: 200,
    force: true,
    conditions: {
      Cookie: ['NEXT_LOCALE'],
    },
  })
  i18n.locales.forEach((locale) => {
    if (locale === i18n.defaultLocale) {
      return
    }
    redirects.push({
      from: `${basePath}/`,
      to: `${basePath}/${locale}${trailingSlash ? '/' : ''}`,
      status: 301,
      conditions: {
        Language: [locale],
      },
      force: true,
    })
  })
  return redirects
}

export const generateStaticRedirects = ({
  netlifyConfig,
  nextConfig: { i18n, basePath },
}: {
  netlifyConfig: NetlifyConfig
  nextConfig: Pick<NextConfig, 'i18n' | 'basePath'>
}) => {
  // Static files are in `static`
  netlifyConfig.redirects.push({ from: `${basePath}/_next/static/*`, to: `/static/:splat`, status: 200 })

  if (i18n) {
    netlifyConfig.redirects.push({ from: `${basePath}/:locale/_next/static/*`, to: `/static/:splat`, status: 200 })
  }
}

/**
 * Routes that match origin middleware need to always use the SSR function
 * This generates a rewrite for every middleware in every locale, both with and without a splat
 */
const generateMiddlewareRewrites = ({ basePath, middleware, i18n, buildId }) => {
  const handlerRewrite = (from: string) => ({
    from: `${basePath}${from}`,
    to: HANDLER_FUNCTION_PATH,
    status: 200,
  })

  return (
    middleware
      .map((route) => {
        const unlocalized = [handlerRewrite(`${route}`), handlerRewrite(`${route}/*`)]
        if (i18n?.locales?.length > 0) {
          const localized = i18n.locales.map((locale) => [
            handlerRewrite(`/${locale}${route}`),
            handlerRewrite(`/${locale}${route}/*`),
            handlerRewrite(`/_next/data/${buildId}/${locale}${route}/*`),
          ])
          // With i18n, all data routes are prefixed with the locale, but the HTML also has the unprefixed default
          return [...unlocalized, ...localized]
        }
        return [...unlocalized, handlerRewrite(`/_next/data/${buildId}${route}/*`)]
      })
      // Flatten the array of arrays. Can't use flatMap as it might be 2 levels deep
      .flat(2)
  )
}

const generateStaticIsrRewrites = ({
  staticRouteEntries,
  basePath,
  i18n,
  buildId,
  middleware,
  appPathRoutes,
}: {
  staticRouteEntries: Array<[string, SsgRoute]>
  basePath: string
  i18n: NextConfig['i18n']
  buildId: string
  middleware: Array<string>
  appPathRoutes: Record<string, string>
}): {
  staticRoutePaths: Set<string>
  staticIsrRoutesThatMatchMiddleware: Array<string>
  staticIsrRewrites: NetlifyConfig['redirects']
} => {
  const staticIsrRoutesThatMatchMiddleware: Array<string> = []
  const staticRoutePaths = new Set<string>()
  const staticIsrRewrites: NetlifyConfig['redirects'] = []
  staticRouteEntries.forEach(([route, { initialRevalidateSeconds, dataRoute, srcRoute }]) => {
    if (isApiRoute(route) || is404Route(route, i18n)) {
      return
    }
    staticRoutePaths.add(route)

    if (initialRevalidateSeconds === false) {
      // These can be ignored, as they're static files handled by the CDN
      return
    }
    // appDir routes are a different format, so we need to handle them differently
    const isAppDir = isAppDirRoute(srcRoute, appPathRoutes)
    // The default locale is served from the root, not the localised path
    if (i18n?.defaultLocale && (route.startsWith(`/${i18n.defaultLocale}/`) || route === `/${i18n.defaultLocale}`)) {
      route = route.slice(i18n.defaultLocale.length + 1) || '/'
      staticRoutePaths.add(route)
      if (matchesMiddleware(middleware, route)) {
        staticIsrRoutesThatMatchMiddleware.push(route)
      }

      staticIsrRewrites.push(
        ...redirectsForNextRouteWithData({
          route,
          dataRoute: isAppDir ? dataRoute : routeToDataRoute(route, buildId, i18n.defaultLocale),
          basePath,
          to: ODB_FUNCTION_PATH,
          force: true,
        }),
      )
    } else if (matchesMiddleware(middleware, route)) {
      //  Routes that match origin middleware can't use the ODB. Edge middleware will always return false
      staticIsrRoutesThatMatchMiddleware.push(route)
    } else {
      // ISR routes use the ODB handler
      staticIsrRewrites.push(
        // No i18n, because the route is already localized
        ...redirectsForNextRoute({
          route,
          basePath,
          to: ODB_FUNCTION_PATH,
          force: true,
          buildId,
          dataRoute: isAppDir ? dataRoute : null,
          i18n: null,
        }),
      )
    }
  })

  return {
    staticRoutePaths,
    staticIsrRoutesThatMatchMiddleware,
    staticIsrRewrites,
  }
}

/**
 * Generate rewrites for all dynamic routes
 */
export const generateDynamicRewrites = ({
  dynamicRoutes,
  prerenderedDynamicRoutes,
  middleware,
  basePath,
  buildId,
  i18n,
  is404Isr,
  appPathRoutes,
}: {
  dynamicRoutes: RoutesManifest['dynamicRoutes']
  prerenderedDynamicRoutes: PrerenderManifest['dynamicRoutes']
  basePath: string
  i18n: NextConfig['i18n']
  buildId: string
  middleware: Array<string>
  is404Isr: boolean
  appPathRoutes?: Record<string, string>
}): {
  dynamicRoutesThatMatchMiddleware: Array<string>
  dynamicRewrites: NetlifyConfig['redirects']
} => {
  const dynamicRewrites: NetlifyConfig['redirects'] = []
  const dynamicRoutesThatMatchMiddleware: Array<string> = []

  dynamicRoutes.forEach((route) => {
    if (isApiRoute(route.page) || is404Route(route.page, i18n)) {
      return
    }
    if (route.page in prerenderedDynamicRoutes) {
      if (matchesMiddleware(middleware, route.page)) {
        dynamicRoutesThatMatchMiddleware.push(route.page)
      } else if (isAppDirRoute(route.page, appPathRoutes)) {
        dynamicRewrites.push(
          ...redirectsForNextRoute({
            route: route.page,
            buildId,
            basePath,
            to: ODB_FUNCTION_PATH,
            i18n,
            dataRoute: prerenderedDynamicRoutes[route.page].dataRoute,
            withData: true,
          }),
        )
      } else if (
        prerenderedDynamicRoutes[route.page].fallback === false &&
        !is404Isr &&
        !destr(process.env.LEGACY_FALLBACK_FALSE)
      ) {
        dynamicRewrites.push(...redirectsForNext404Route({ route: route.page, buildId, basePath, i18n }))
      } else {
        dynamicRewrites.push(
          ...redirectsForNextRoute({ route: route.page, buildId, basePath, to: ODB_FUNCTION_PATH, i18n }),
        )
      }
    } else {
      // If the route isn't prerendered, it's SSR
      dynamicRewrites.push(
        ...redirectsForNextRoute({ route: route.page, buildId, basePath, to: HANDLER_FUNCTION_PATH, i18n }),
      )
    }
  })
  return {
    dynamicRoutesThatMatchMiddleware,
    dynamicRewrites,
  }
}

export const generateRedirects = async ({
  netlifyConfig,
  nextConfig: { i18n, basePath, trailingSlash, appDir },
  buildId,
  apiLambdas,
}: {
  netlifyConfig: NetlifyConfig
  nextConfig: Pick<NextConfig, 'i18n' | 'basePath' | 'trailingSlash' | 'appDir'>
  buildId: string
  apiLambdas: APILambda[]
}) => {
  const { dynamicRoutes: prerenderedDynamicRoutes, routes: prerenderedStaticRoutes }: PrerenderManifest =
    await readJSON(join(netlifyConfig.build.publish, 'prerender-manifest.json'))

  const { dynamicRoutes, staticRoutes }: RoutesManifest = await readJSON(
    join(netlifyConfig.build.publish, 'routes-manifest.json'),
  )

  if (i18n && i18n.localeDetection !== false) {
    netlifyConfig.redirects.push(...generateLocaleRedirects({ i18n, basePath, trailingSlash }))
  }

  // This is only used in prod, so dev uses `next dev` directly
  netlifyConfig.redirects.push(
    // API routes always need to be served from the regular function
    ...getApiRewrites(basePath, apiLambdas),
    // Preview mode gets forced to the function, to bypass pre-rendered pages, but static files need to be skipped
    ...(await getPreviewRewrites({ basePath, appDir })),
  )

  const middleware = await getMiddleware(netlifyConfig.build.publish)

  netlifyConfig.redirects.push(...generateMiddlewareRewrites({ basePath, i18n, middleware, buildId }))

  const appPathRoutes = await loadAppPathRoutesManifest(netlifyConfig)

  const staticRouteEntries = Object.entries(prerenderedStaticRoutes)

  const is404Isr = staticRouteEntries.some(
    ([route, { initialRevalidateSeconds }]) => is404Route(route, i18n) && initialRevalidateSeconds !== false,
  )

  const routesThatMatchMiddleware: Array<string> = []

  const { staticRoutePaths, staticIsrRewrites, staticIsrRoutesThatMatchMiddleware } = generateStaticIsrRewrites({
    staticRouteEntries,
    basePath,
    i18n,
    buildId,
    middleware,
    appPathRoutes,
  })

  routesThatMatchMiddleware.push(...staticIsrRoutesThatMatchMiddleware)

  netlifyConfig.redirects.push(...staticIsrRewrites)

  // Add rewrites for all static SSR routes. This is Next 12+
  staticRoutes?.forEach((route) => {
    if (staticRoutePaths.has(route.page) || isApiRoute(route.page) || is404Route(route.page)) {
      // Prerendered static routes are either handled by the CDN or are ISR
      return
    }
    netlifyConfig.redirects.push(
      ...redirectsForNextRoute({ route: route.page, buildId, basePath, to: HANDLER_FUNCTION_PATH, i18n }),
    )
  })
  // Add rewrites for all dynamic routes (both SSR and ISR)
  const { dynamicRewrites, dynamicRoutesThatMatchMiddleware } = generateDynamicRewrites({
    dynamicRoutes,
    prerenderedDynamicRoutes,
    middleware,
    basePath,
    buildId,
    i18n,
    is404Isr,
    appPathRoutes,
  })
  netlifyConfig.redirects.push(...dynamicRewrites)
  routesThatMatchMiddleware.push(...dynamicRoutesThatMatchMiddleware)

  // Final fallback
  netlifyConfig.redirects.push({
    from: `${basePath}/*`,
    to: HANDLER_FUNCTION_PATH,
    status: 200,
  })

  const middlewareMatches = new Set(routesThatMatchMiddleware).size
  if (middlewareMatches > 0) {
    console.log(
      yellowBright(outdent`
        There ${
          middlewareMatches === 1
            ? `is one statically-generated or ISR route that matches`
            : `are ${middlewareMatches} statically-generated or ISR routes that match`
        } a middleware function. Matched routes will always be served from the SSR function and will not use ISR or be served from the CDN.
        If this was not intended, ensure that your middleware only matches routes that you intend to use SSR.
      `),
    )
  }
}
