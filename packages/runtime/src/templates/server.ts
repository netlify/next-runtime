// eslint-disable-next-line n/no-deprecated-api -- this is what Next.js uses as well
import { parse } from 'url'

import { NextConfig } from 'next'
import type { PrerenderManifest } from 'next/dist/build'
import type { BaseNextResponse } from 'next/dist/server/base-http'
import type { NodeRequestHandler, Options } from 'next/dist/server/next-server'

import {
  netlifyApiFetch,
  NextServerType,
  normalizeRoute,
  localizeRoute,
  localizeDataRoute,
  unlocalizeRoute,
  getMatchedRoute,
} from './handlerUtils'

interface NetlifyConfig {
  revalidateToken?: string
}

// eslint-disable-next-line max-lines-per-function
const getNetlifyNextServer = (NextServer: NextServerType) => {
  class NetlifyNextServer extends NextServer {
    private netlifyConfig: NetlifyConfig
    private netlifyPrerenderManifest: PrerenderManifest

    public getAppRouterReactVersion(): string {
      return this.nextConfig.experimental?.serverActions ? 'experimental' : 'next'
    }

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
        if (!parsedUrl && typeof req?.headers?.['x-middleware-rewrite'] === 'string') {
          parsedUrl = parse(req.headers['x-middleware-rewrite'], true)
        }

        // preserve the URL before Next.js mutates it for i18n
        const { url, headers } = req

        // conditionally use the prebundled React module
        this.netlifyPrebundleReact(url, this.nextConfig, parsedUrl)

        // intercept on-demand revalidation requests and handle with the Netlify API
        if (headers['x-prerender-revalidate'] && this.netlifyConfig.revalidateToken) {
          // handle on-demand revalidation by purging the ODB cache
          await this.netlifyRevalidate(url)

          res = res as unknown as BaseNextResponse
          res.statusCode = 200
          res.setHeader('x-nextjs-cache', 'REVALIDATED')
          res.send()
          return
        }

        // force Next to revalidate all requests so that we always have fresh content
        // for our ODBs and middleware is disabled at the origin
        // but ignore in preview mode (prerender_bypass is set to true in preview mode)
        // because otherwise revalidate will override preview mode
        if (!headers.cookie?.includes('__prerender_bypass')) {
          const isFirstODBRequest = headers['x-nf-builder-cache'] === 'miss'
          // first ODB request should NOT be revalidated and instead it should try to serve cached version
          if (!isFirstODBRequest) {
            // this header controls whether Next.js will revalidate the page
            // and needs to be set to the preview mode id to enable it
            headers['x-prerender-revalidate'] = this.renderOpts.previewProps.previewModeId
          }
        }

        return handler(req, res, parsedUrl)
      }
    }

    // doing what they do in https://github.com/vercel/vercel/blob/1663db7ca34d3dd99b57994f801fb30b72fbd2f3/packages/next/src/server-build.ts#L576-L580
    private async netlifyPrebundleReact(path: string, { basePath, trailingSlash }: NextConfig, parsedUrl) {
      const routesManifest = this.getRoutesManifest?.()
      const appPathsRoutes = this.getAppPathRoutes?.()
      const routes = routesManifest && [...routesManifest.staticRoutes, ...routesManifest.dynamicRoutes]
      const matchedRoute = await getMatchedRoute(path, routes, parsedUrl, basePath, trailingSlash)
      const isAppRoute = appPathsRoutes && matchedRoute ? appPathsRoutes[matchedRoute.page] : false

      if (isAppRoute) {
        // app routes should use prebundled React
        // eslint-disable-next-line no-underscore-dangle
        process.env.__NEXT_PRIVATE_PREBUNDLED_REACT = this.getAppRouterReactVersion()

        return
      }
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

    // eslint-disable-next-line class-methods-use-this, require-await
    async runMiddleware(): Promise<{ finished: boolean }> {
      return {
        finished: false,
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
