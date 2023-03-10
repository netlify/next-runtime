import { NodeRequestHandler, Options } from 'next/dist/server/next-server'

import { netlifyApiFetch, getNextServer, NextServerType, getPathsForRoute } from './handlerUtils'

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
      if (req.headers['x-prerender-revalidate']) {
        // handle on-demand revalidation by purging the ODB cache
        await this.netlifyRevalidate(req.url)
      }
      // handle the original res.revalidate() request
      return handler(req, res, parsedUrl)
    }
  }

  private async netlifyRevalidate(route: string) {
    try {
      // call netlify API to revalidate the path
      const result = await netlifyApiFetch<{ ok: boolean; code: number; message: string }>({
        endpoint: `sites/${process.env.SITE_ID}/refresh_on_demand_builders`,
        payload: {
          paths: getPathsForRoute(route, this.buildId, this.nextConfig?.i18n),
          domain: this.hostname,
        },
        token: this.netlifyOptions.revalidateToken,
        method: 'POST',
      })
      if (result.ok !== true) {
        throw new Error(result.message)
      }
    } catch (error) {
      console.log('Error revalidating', error.message)
      throw error
    }
  }
}

export { NetlifyNextServer }
