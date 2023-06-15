import { PrerenderManifest } from 'next/dist/build'
import type { BaseNextResponse } from 'next/dist/server/base-http'
import type { NodeRequestHandler, Options } from 'next/dist/server/next-server'

import {
  netlifyApiFetch,
  NextServerType,
  normalizeRoute,
  localizeRoute,
  localizeDataRoute,
  unlocalizeRoute,
  joinPaths,
} from './handlerUtils'

interface NetlifyConfig {
  revalidateToken?: string
}

const getNetlifyNextServer = (NextServer: NextServerType) => {
  class NetlifyNextServer extends NextServer {
    private netlifyConfig: NetlifyConfig
    private netlifyPrerenderManifest: PrerenderManifest

    public constructor(options: Options, netlifyConfig: NetlifyConfig) {
      super(options)
      this.netlifyConfig = netlifyConfig
      // copy the prerender manifest so it doesn't get mutated by Next.js
      const manifest = this.getPrerenderManifest()
      this.netlifyPrerenderManifest = {
        ...manifest,
        routes: { ...manifest.routes },
        dynamicRoutes: { ...manifest.dynamicRoutes },
      }
    }

    public getRequestHandler(): NodeRequestHandler {
      const handler = super.getRequestHandler()
      return async (req, res, parsedUrl) => {
        // preserve the URL before Next.js mutates it for i18n
        const { url, headers } = req

        // conditionally use the prebundled React module
        this.netlifyPrebundleReact(url)

        // intercept on-demand revalidation requests and handler with the Netlify API
        if (headers['x-prerender-revalidate'] && this.netlifyConfig.revalidateToken) {
          // handle on-demand revalidation by purging the ODB cache
          await this.netlifyRevalidate(url)

          res = res as unknown as BaseNextResponse
          res.statusCode = 200
          res.setHeader('x-nextjs-cache', 'REVALIDATED')
          res.send()
          return
        }

        // force all standard requests to revalidate so that we always have fresh content
        // (we handle caching with ODBs instead of stale-while-revalidate)
        // eslint-disable-next-line no-underscore-dangle
        if (headers['x-nf-builder-cache'] === 'revalidate' && !headers.__prerender_bypass) {
          headers['x-prerender-revalidate'] = this.renderOpts.previewProps.previewModeId
        }

        return handler(req, res, parsedUrl)
      }
    }

    // doing what they do in https://github.com/vercel/vercel/blob/1663db7ca34d3dd99b57994f801fb30b72fbd2f3/packages/next/src/server-build.ts#L576-L580
    private netlifyPrebundleReact(path: string) {
      const routesManifest = this.getRoutesManifest()
      const appPathsManifest = this.getAppPathsManifest()

      const routes = [...routesManifest.staticRoutes, ...routesManifest.dynamicRoutes]
      const matchedRoute = routes.find((route) => new RegExp(route.regex).test(path))
      const isAppRoute =
        appPathsManifest && matchedRoute ? appPathsManifest[joinPaths(matchedRoute.page, 'page')] : false

      if (isAppRoute) {
        // app routes should use prebundled React
        // eslint-disable-next-line no-underscore-dangle
        process.env.__NEXT_PRIVATE_PREBUNDLED_REACT = this.nextConfig.experimental?.serverActions
          ? 'experimental'
          : 'next'
        return
      }

      // pages routes should use use node_modules React
      // eslint-disable-next-line no-underscore-dangle
      process.env.__NEXT_PRIVATE_PREBUNDLED_REACT = ''
    }

    private async netlifyRevalidate(route: string) {
      try {
        // call netlify API to revalidate the path
        const result = await netlifyApiFetch<{ ok: boolean; code: number; message: string }>({
          endpoint: `sites/${process.env.SITE_ID}/refresh_on_demand_builders`,
          payload: {
            paths: this.getNetlifyPathsForRoute(route),
            domain: this.hostname,
          },
          token: this.netlifyConfig.revalidateToken,
          method: 'POST',
        })
        if (!result.ok) {
          throw new Error(result.message)
        }
      } catch (error) {
        console.log(`Error revalidating ${route}:`, error.message)
        throw error
      }
    }

    private getNetlifyPathsForRoute(route: string): string[] {
      const { i18n } = this.nextConfig
      const { routes, dynamicRoutes } = this.netlifyPrerenderManifest

      // matches static routes
      const normalizedRoute = normalizeRoute(i18n ? localizeRoute(route, i18n) : route)
      if (normalizedRoute in routes) {
        const { dataRoute } = routes[normalizedRoute]
        const normalizedDataRoute = i18n ? localizeDataRoute(dataRoute, normalizedRoute) : dataRoute
        return [route, normalizedDataRoute]
      }

      // matches dynamic routes
      const unlocalizedRoute = i18n ? unlocalizeRoute(normalizedRoute, i18n) : normalizedRoute
      for (const dynamicRoute in dynamicRoutes) {
        const { dataRoute, routeRegex } = dynamicRoutes[dynamicRoute]
        const matches = unlocalizedRoute.match(routeRegex)
        if (matches?.length > 0) {
          // remove the first match, which is the full route
          matches.shift()
          // replace the dynamic segments with the actual values
          const interpolatedDataRoute = dataRoute.replace(/\[(.*?)]/g, () => matches.shift())
          const normalizedDataRoute = i18n
            ? localizeDataRoute(interpolatedDataRoute, normalizedRoute)
            : interpolatedDataRoute
          return [route, normalizedDataRoute]
        }
      }

      throw new Error(`not an ISR route`)
    }
  }

  return NetlifyNextServer
}

export type NetlifyNextServerType = ReturnType<typeof getNetlifyNextServer>

export { getNetlifyNextServer, NetlifyConfig }
