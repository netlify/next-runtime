import { NodeRequestHandler, Options } from 'next/dist/server/next-server'

import { netlifyApiFetch, getNextServer, NextServerType } from './handlerUtils'

const NextServer: NextServerType = getNextServer()

interface NetlifyNextServerOptions extends Options {
  netlifyRevalidateToken?: string
}

export default class NetlifyNextServer extends NextServer {
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
    const siteId = process.env.SITE_ID
    const trailingSlash = this.nextConfig.trailingSlash ? '/' : ''

    try {
      // call netlify API to revalidate the path, including its data routes
      const result = await netlifyApiFetch<{ code: number; message: string }>({
        endpoint: `sites/${siteId}/refresh_on_demand_builders`,
        payload: {
          paths: [url, `/_next/data/${this.buildId}${url}.json`, `${url}.rsc${trailingSlash}`],
          domain: this.hostname,
        },
        token: this.netlifyRevalidateToken,
        method: 'POST',
      })
      if (result.code !== 200) {
        throw result
      }
    } catch (error) {
      throw new Error(`Unsuccessful revalidate - ${error.message}`)
    }
  }
}
