import { createIPX, handleRequest, IPXOptions } from 'ipx'
import { builder, Handler } from '@netlify/functions'
//@ts-ignore injected at build time
import * as config from './imageconfig.json'

// 6MB is hard max Lambda response size
const MAX_RESPONSE_SIZE = 6291456
interface IPXHandlerOptions extends IPXOptions {
  prefix: string
}
export function createIPXHandler({ prefix = '', ...opts }: Partial<IPXHandlerOptions> = {}) {
  const ipx = createIPX({ ...opts })

  const handler: Handler = async (event) => {
    const host = event.headers.host
    const protocol = event.headers['x-forwarded-proto'] || 'http'

    const path = prefix ? event.path.replace(prefix, '') : event.path

    const [modifiers = '_', ...segments] = path.substr(1).split('/')
    let id = decodeURIComponent(segments.join('/')).replace('+', '%20')
    const isLocal = !id.startsWith('http://') && !id.startsWith('https://')
    if (isLocal) {
      id = `${protocol}://${host}/${id}`
    }

    const { statusCode, statusMessage, headers, body } = await handleRequest(
      {
        url: `/${modifiers}/${id}`,
        headers: event.headers,
        options: {
          bypassDomain: isLocal,
        },
      },
      ipx,
    )

    if (body.length > MAX_RESPONSE_SIZE) {
      return {
        statusCode: 400,
        body: 'Generated image is too large. Maximum size is 6MB.',
      }
    }

    return {
      statusCode,
      message: statusMessage,
      headers,
      isBase64Encoded: typeof body !== 'string',
      body: typeof body === 'string' ? body : body.toString('base64'),
    }
  }

  return builder(handler)
}

export const handler = createIPXHandler({
  prefix: '/_ipx',
  domains: config.domains || [],
  dir: false,
})
