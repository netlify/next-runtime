import { PrerenderManifest } from 'next/dist/build'
import type { BaseNextResponse } from 'next/dist/server/base-http'
import { NodeRequestHandler, Options } from 'next/dist/server/next-server'

import {
  netlifyApiFetch,
  NextServerType,
  normalizeRoute,
  localizeRoute,
  localizeDataRoute,
  unlocalizeRoute,
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
        if (headers['x-prerender-revalidate'] && this.netlifyConfig.revalidateToken) {
          // handle on-demand revalidation by purging the ODB cache
          await this.netlifyRevalidate(url)

          res = res as unknown as BaseNextResponse
          res.statusCode = 200
          res.send()
        } else {
          await handler(req, res, parsedUrl)
        }
      }
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
