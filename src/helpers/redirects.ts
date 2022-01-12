import { NetlifyConfig } from '@netlify/build'
import { readJSON } from 'fs-extra'
import { NextConfig } from 'next'
import { PrerenderManifest } from 'next/dist/build'
import { join } from 'pathe'

import { HANDLER_FUNCTION_PATH, HIDDEN_PATHS, ODB_FUNCTION_PATH } from '../constants'

import { RoutesManifest } from './types'
import {
  getApiRewrites,
  getPreviewRewrites,
  isApiRoute,
  redirectsForNextRoute,
  redirectsForNextRouteWithData,
  routeToDataRoute,
  targetForFallback,
} from './utils'

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

export const generateRedirects = async ({
  netlifyConfig,
  nextConfig: { i18n, basePath, trailingSlash, appDir },
  buildId,
}: {
  netlifyConfig: NetlifyConfig
  nextConfig: Pick<NextConfig, 'i18n' | 'basePath' | 'trailingSlash' | 'appDir'>
  buildId: string
}) => {
  const { dynamicRoutes: prerenderedDynamicRoutes, routes: prerenderedStaticRoutes }: PrerenderManifest =
    await readJSON(join(netlifyConfig.build.publish, 'prerender-manifest.json'))

  const { dynamicRoutes, staticRoutes }: RoutesManifest = await readJSON(
    join(netlifyConfig.build.publish, 'routes-manifest.json'),
  )

  netlifyConfig.redirects.push(
    ...HIDDEN_PATHS.map((path) => ({
      from: `${basePath}${path}`,
      to: '/404.html',
      status: 404,
      force: true,
    })),
  )

  if (i18n && i18n.localeDetection !== false) {
    netlifyConfig.redirects.push(...generateLocaleRedirects({ i18n, basePath, trailingSlash }))
  }

  // This is only used in prod, so dev uses `next dev` directly
  netlifyConfig.redirects.push(
    // API routes always need to be served from the regular function
    ...getApiRewrites(basePath),
    // Preview mode gets forced to the function, to bypass pre-rendered pages, but static files need to be skipped
    ...(await getPreviewRewrites({ basePath, appDir })),
  )

  const staticRouteEntries = Object.entries(prerenderedStaticRoutes)

  const staticRoutePaths = new Set<string>()

  // First add all static ISR routes
  staticRouteEntries.forEach(([route, { initialRevalidateSeconds }]) => {
    if (isApiRoute(route)) {
      return
    }
    staticRoutePaths.add(route)

    if (initialRevalidateSeconds === false) {
      // These can be ignored, as they're static files handled by the CDN
      return
    }
    // The default locale is served from the root, not the localised path
    if (i18n?.defaultLocale && route.startsWith(`/${i18n.defaultLocale}/`)) {
      route = route.slice(i18n.defaultLocale.length + 1)
      staticRoutePaths.add(route)

      netlifyConfig.redirects.push(
        ...redirectsForNextRouteWithData({
          route,
          dataRoute: routeToDataRoute(route, buildId, i18n.defaultLocale),
          basePath,
          to: ODB_FUNCTION_PATH,
          force: true,
        }),
      )
    } else {
      // ISR routes use the ODB handler
      netlifyConfig.redirects.push(
        // No i18n, because the route is already localized
        ...redirectsForNextRoute({ route, basePath, to: ODB_FUNCTION_PATH, force: true, buildId, i18n: null }),
      )
    }
  })
  // Add rewrites for all static SSR routes. This is Next 12+
  staticRoutes?.forEach((route) => {
    if (staticRoutePaths.has(route.page) || isApiRoute(route.page)) {
      // Prerendered static routes are either handled by the CDN or are ISR
      return
    }
    netlifyConfig.redirects.push(
      ...redirectsForNextRoute({ route: route.page, buildId, basePath, to: HANDLER_FUNCTION_PATH, i18n }),
    )
  })
  // Add rewrites for all dynamic routes (both SSR and ISR)
  dynamicRoutes.forEach((route) => {
    if (isApiRoute(route.page)) {
      return
    }
    if (route.page in prerenderedDynamicRoutes) {
      const { fallback } = prerenderedDynamicRoutes[route.page]

      const { to, status } = targetForFallback(fallback)

      netlifyConfig.redirects.push(...redirectsForNextRoute({ buildId, route: route.page, basePath, to, status, i18n }))
    } else {
      // If the route isn't prerendered, it's SSR
      netlifyConfig.redirects.push(
        ...redirectsForNextRoute({ route: route.page, buildId, basePath, to: HANDLER_FUNCTION_PATH, i18n }),
      )
    }
  })

  // Final fallback
  netlifyConfig.redirects.push({
    from: `${basePath}/*`,
    to: HANDLER_FUNCTION_PATH,
    status: 200,
  })
}
