import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { ElementHandlers } from './html_rewriter'

/**
 * Supercharge your Next middleware with Netlify Edge Functions
 */
class NetlifyResponse {
  static async next(request: NextRequest): Promise<NetlifyNextResponse> {
    const context = (request.geo as any).__nf_context
    if (!context) {
      throw new Error('NetlifyResponse can only be used with Netlify Edge Functions')
    }
    const response: Response = await context.next()
    return new NetlifyNextResponse(response)
  }
}

type NextDataTransform = <T extends Record<string, any>>(props: T) => T

// A NextReponse that will pass through the Netlify origin response
// We can't pass it through directly, because Next disallows returning a response body
class NetlifyNextResponse extends NextResponse {
  private originResponse: Response
  private dataTransforms: NextDataTransform[]

  private elementHandlers: Array<[selector: string, handlers: ElementHandlers]>
  constructor(originResponse: Response) {
    super()
    this.originResponse = originResponse
    Object.defineProperty(this, 'dataTransforms', {
      value: [],
      enumerable: false,
      writable: false,
    })
    Object.defineProperty(this, 'elementHandlers', {
      value: [],
      enumerable: false,
      writable: false,
    })
  }

  /**
   * Transform the page props before they are passed to the client.
   * This works for both HTML pages and JSON data
   */
  transformData(transform: NextDataTransform) {
    // The transforms are evaluated after the middleware is returned
    this.dataTransforms.push(transform)
  }

  rewriteHTML(selector: string, handlers: ElementHandlers) {
    this.elementHandlers.push([selector, handlers])
  }

  get headers(): Headers {
    // If we have the origin response, we should use its headers
    return this.originResponse?.headers || super.headers
  }
}

export async function middleware(request: NextRequest) {
  let response
  const {
    nextUrl: { pathname },
  } = request

  if (pathname.startsWith('/static')) {
    // Unlike NextResponse.next(), this actually sends the request to the origin
    const res = await NetlifyResponse.next(request)
    const message = `This was static but has been transformed in ${request.geo.city}`

    res.transformData((data) => {
      data.pageProps.message = message
      data.pageProps.showAd = true
      return data
    })
    res.rewriteHTML('p[id=message]', {
      text(textChunk) {
        if (textChunk.lastInTextNode) {
          textChunk.replace(message)
        } else {
          textChunk.remove()
        }
      },
    })

    return res
  }

  if (pathname.startsWith('/cookies')) {
    response = NextResponse.next()
    response.cookies.set('netlifyCookie', 'true')
    return response
  }

  if (pathname.startsWith('/shows')) {
    if (pathname.startsWith('/shows/rewrite-absolute')) {
      response = NextResponse.rewrite(new URL('/shows/100', request.url))
      response.headers.set('x-modified-in-rewrite', 'true')
    }
    if (pathname.startsWith('/shows/rewrite-external')) {
      response = NextResponse.rewrite('http://example.com/')
      response.headers.set('x-modified-in-rewrite', 'true')
    }
    if (pathname.startsWith('/shows/rewriteme')) {
      const url = request.nextUrl.clone()
      url.pathname = '/shows/100'
      response = NextResponse.rewrite(url)
      response.headers.set('x-modified-in-rewrite', 'true')
    }

    if (!response) {
      response = NextResponse.next()
    }

    if (pathname.startsWith('/shows/static')) {
      response.headers.set('x-middleware-date', new Date().toISOString())
    }

    response.headers.set('x-modified-edge', 'true')
    response.headers.set('x-is-deno', 'Deno' in globalThis ? 'true' : 'false')

    return response
  }
}
