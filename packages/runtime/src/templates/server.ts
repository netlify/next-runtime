import { NodeRequestHandler, Options } from 'next/dist/server/next-server'

import {
  netlifyApiFetch,
  getNextServer,
  NextServerType,
  removeTrailingSlash,
  ensureLocalePrefix,
  normalizeDataRoute,
} from './handlerUtils'

const NextServer: NextServerType = getNextServer()

interface NetlifyOptions {
  revalidateToken?: string
}

class NetlifyNextServer extends NextServer {
  private netlifyOptions: NetlifyOptions

  public constructor(options: Options, netlifyOptions: NetlifyOptions) {
    super(options)
    this.netlifyOptions = netlifyOptions
  }

  public getRequestHandler(): NodeRequestHandler {
    const handler = super.getRequestHandler()
    return async (req, res, parsedUrl) => {
      // preserve the URL before Next.js mutates it for i18n
      const originalUrl = req.url

      // handle the original res.revalidate() request
      await handler(req, res, parsedUrl)

      // handle on-demand revalidation by purging the ODB cache
      if (res.statusCode === 200 && req.headers['x-prerender-revalidate']) {
        await this.netlifyRevalidate(originalUrl)
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
        token: this.netlifyOptions.revalidateToken,
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
    const { routes, dynamicRoutes } = this.getPrerenderManifest()

    // matches static appDir and non-i18n routes
    const normalizedRoute = removeTrailingSlash(route)
    if (normalizedRoute in routes) {
      const dataRoute = normalizeDataRoute(routes[normalizedRoute].dataRoute, this.buildId)
      return [route, dataRoute]
    }

    // matches static pageDir i18n routes
    const localizedRoute = ensureLocalePrefix(normalizedRoute, this.nextConfig?.i18n)
    if (localizedRoute in routes) {
      const dataRoute = normalizeDataRoute(routes[localizedRoute].dataRoute, this.buildId, this.nextConfig?.i18n)
      return [route, dataRoute]
    }

    // matches dynamic routes
    for (const dynamicRoute in dynamicRoutes) {
      const matches = normalizedRoute.match(dynamicRoutes[dynamicRoute].routeRegex)
      if (matches && matches.length !== 0) {
        // remove the first match, which is the full route
        matches.shift()
        // replace the dynamic segments with the actual values
        const dataRoute = normalizeDataRoute(
          dynamicRoutes[dynamicRoute].dataRoute.replace(/\[(.*?)]/g, () => matches.shift()),
          this.buildId,
        )
        return [route, dataRoute]
      }
    }

    throw new Error(`could not find a route to revalidate`)
  }
}

export { NetlifyNextServer }
