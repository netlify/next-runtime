import { NodeRequestHandler, Options } from 'next/dist/server/next-server'

// import { netlifyRoutesForNextRoute } from '../helpers/utils'

import { netlifyApiFetch, getNextServer, NextServerType } from './handlerUtils'

const NextServer: NextServerType = getNextServer()

interface NetlifyNextServerOptions extends Options {
  netlifyRevalidateToken?: string
}

class NetlifyNextServer extends NextServer {
  private netlifyRevalidateToken?: string

  public constructor(options: NetlifyNextServerOptions) {
    super(options)
    this.netlifyRevalidateToken = options.netlifyRevalidateToken
  }

  public getRequestHandler(): NodeRequestHandler {
    const handler = super.getRequestHandler()
    return async (req, res, parsedUrl) => {
      // on-demand revalidation request
      if (req.headers['x-prerender-revalidate']) {
        await this.netlifyRevalidate(req.url)
      }
      return handler(req, res, parsedUrl)
    }
  }

  private async netlifyRevalidate(url: string) {
    try {
      // call netlify API to revalidate the path, including its data routes
      const result = await netlifyApiFetch<{ ok: boolean; code: number; message: string }>({
        endpoint: `sites/${process.env.SITE_ID}/refresh_on_demand_builders`,
        payload: {
          paths: [
            url,
            // ...netlifyRoutesForNextRoute({
            //   route: url,
            //   buildId: this.buildId,
            //   i18n: this.nextConfig.i18n,
            // }),
            // url.endsWith('/') ? `${url.slice(0, -1)}.rsc/` : `${url}.rsc`,
          ],
          domain: this.hostname,
        },
        token: this.netlifyRevalidateToken,
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
