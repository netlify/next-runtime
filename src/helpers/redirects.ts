import { NetlifyConfig } from '@netlify/build'
import { yellowBright } from 'chalk'
import { readJSON } from 'fs-extra'
import { NextConfig } from 'next'
import { PrerenderManifest } from 'next/dist/build'
import { outdent } from 'outdent'
import { join } from 'pathe'

import { HANDLER_FUNCTION_PATH, HIDDEN_PATHS, ODB_FUNCTION_PATH } from '../constants'

import { netlifyRoutesForNextRoute } from './utils'

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

export const generateRedirects = async ({
  netlifyConfig,
  nextConfig: { i18n, basePath, trailingSlash },
}: {
  netlifyConfig: NetlifyConfig
  nextConfig: Pick<NextConfig, 'i18n' | 'basePath' | 'trailingSlash'>
}) => {
  const { dynamicRoutes, routes: staticRoutes }: PrerenderManifest = await readJSON(
    join(netlifyConfig.build.publish, 'prerender-manifest.json'),
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

  const dataRedirects = []
  const pageRedirects = []
  const isrRedirects = []

  const dynamicRouteEntries = Object.entries(dynamicRoutes)

  const staticRouteEntries = Object.entries(staticRoutes)

  staticRouteEntries.forEach(([route, { dataRoute, initialRevalidateSeconds }]) => {
    // Only look for revalidate as we need to rewrite these to SSR rather than ODB
    if (initialRevalidateSeconds === false) {
      // These can be ignored, as they're static files handled by the CDN
      return
    }
    if (i18n?.defaultLocale && route.startsWith(`/${i18n.defaultLocale}/`)) {
      route = route.slice(i18n.defaultLocale.length + 1)
    }
    isrRedirects.push(...netlifyRoutesForNextRoute(dataRoute), ...netlifyRoutesForNextRoute(route))
  })

  dynamicRouteEntries.forEach(([route, { dataRoute, fallback }]) => {
    // Add redirects if fallback is "null" (aka blocking) or true/a string
    if (fallback === false) {
      return
    }
    pageRedirects.push(...netlifyRoutesForNextRoute(route))
    dataRedirects.push(...netlifyRoutesForNextRoute(dataRoute))
  })

  if (i18n) {
    netlifyConfig.redirects.push({ from: `${basePath}/:locale/_next/static/*`, to: `/static/:splat`, status: 200 })
  }

  // This is only used in prod, so dev uses `next dev` directly
  netlifyConfig.redirects.push(
    // Static files are in `static`
    { from: `${basePath}/_next/static/*`, to: `/static/:splat`, status: 200 },
    // API routes always need to be served from the regular function
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
    // Preview mode gets forced to the function, to bypess pre-rendered pages
    {
      from: `${basePath}/*`,
      to: HANDLER_FUNCTION_PATH,
      status: 200,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore The conditions type is incorrect
      conditions: { Cookie: ['__prerender_bypass', '__next_preview_data'] },
      force: true,
    },
    // ISR redirects are handled by the regular function. Forced to avoid pre-rendered pages
    ...isrRedirects.map((redirect) => ({
      from: `${basePath}${redirect}`,
      to: ODB_FUNCTION_PATH,
      status: 200,
      force: true,
    })),
    // These are pages with fallback set, which need an ODB
    // Data redirects go first, to avoid conflict with splat redirects
    ...dataRedirects.map((redirect) => ({
      from: `${basePath}${redirect}`,
      to: ODB_FUNCTION_PATH,
      status: 200,
    })),
    // ...then all the other fallback pages
    ...pageRedirects.map((redirect) => ({
      from: `${basePath}${redirect}`,
      to: ODB_FUNCTION_PATH,
      status: 200,
    })),
    // Everything else is handled by the regular function
    { from: `${basePath}/*`, to: HANDLER_FUNCTION_PATH, status: 200 },
  )
}
