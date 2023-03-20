import { PrerenderManifest } from 'next/dist/build'
import { NodeRequestHandler, Options } from 'next/dist/server/next-server'

import {
  netlifyApiFetch,
  getNextServer,
  NextServerType,
  normalizeRoute,
  localizeRoute,
  localizeDataRoute,
  unlocalizeRoute,
} from './handlerUtils'

const NextServer: NextServerType = getNextServer()

interface NetlifyConfig {
  revalidateToken?: string
}

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
      // handle the original res.revalidate() request
      await handler(req, res, parsedUrl)
      // handle on-demand revalidation by purging the ODB cache
      if (res.statusCode === 200 && headers['x-prerender-revalidate'] && this.netlifyConfig.revalidateToken) {
        await this.netlifyRevalidate(url)
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

    // matches static non-i18n routes
    const normalizedRoute = normalizeRoute(route)
    if (normalizedRoute in routes) {
      const { dataRoute } = routes[normalizedRoute]
      return [route, dataRoute]
    }

    // matches static i18n routes
    if (i18n) {
      const localizedRoute = localizeRoute(normalizedRoute, i18n)
      if (localizedRoute in routes) {
        const dataRoute = localizeDataRoute(routes[localizedRoute].dataRoute, localizedRoute)
        return [route, dataRoute]
      }
    }

    // matches dynamic routes
    for (const dynamicRoute in dynamicRoutes) {
      const unlocalizedRoute = i18n ? unlocalizeRoute(normalizedRoute, i18n) : normalizedRoute
      const matches = unlocalizedRoute.match(dynamicRoutes[dynamicRoute].routeRegex)
      if (matches && matches.length !== 0) {
        // remove the first match, which is the full route
        matches.shift()
        // replace the dynamic segments with the actual values
        const interpolatedDataRoute = dynamicRoutes[dynamicRoute].dataRoute.replace(/\[(.*?)]/g, () => matches.shift())
        const dataRoute = i18n
          ? localizeDataRoute(interpolatedDataRoute, localizeRoute(normalizedRoute, i18n))
          : interpolatedDataRoute
        return [route, dataRoute]
      }
    }

    throw new Error(`not an ISR route`)
  }
}

export { NetlifyNextServer, NetlifyConfig }
