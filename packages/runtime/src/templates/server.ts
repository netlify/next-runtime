import { NodeRequestHandler } from 'next/dist/server/next-server'

import { getNextServer, NextServerType } from './handlerUtils'

const NextServer: NextServerType = getNextServer()

class NetlifyNextServer extends NextServer {
  public getRequestHandler(): NodeRequestHandler {
    const handler = super.getRequestHandler()
    return (req, res, parsedUrl) => {
      if (req.headers['x-prerender-revalidate']) {
        console.log('Revalidate request')
      }
      return handler(req, res, parsedUrl)
    }
  }
}

export { NetlifyNextServer }
