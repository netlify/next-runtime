import type { NextURL } from 'next/dist/server/web/next-url'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { MiddlewareResponse } from './response'

export interface NextOptions {
  /**
   * Include conditional request headers in the request to the origin.
   * If you do this, you must ensure you check the response for a 304 Not Modified response
   * and handle it and the missing bode accordingly.
   */
  sendConditionalRequest?: boolean
}

// TODO: add Context type
type Context = {
  next: (options?: NextOptions) => Promise<Response>
}

/**
 * Supercharge your Next middleware with Netlify Edge Functions
 */
export class MiddlewareRequest extends Request {
  context: Context
  originalRequest: Request

  constructor(private nextRequest: NextRequest) {
    super(nextRequest)
    if (!('Deno' in globalThis)) {
      throw new Error('MiddlewareRequest only works in a Netlify Edge Function environment')
    }
    const requestId = nextRequest.headers.get('x-nf-request-id')
    if (!requestId) {
      throw new Error('Missing x-nf-request-id header')
    }
    const requestContext = globalThis.NFRequestContextMap.get(requestId)
    if (!requestContext) {
      throw new Error(`Could not find request context for request id ${requestId}`)
    }
    this.context = requestContext.context
    this.originalRequest = requestContext.request
  }

  // Add the headers to the original request, which will be passed to the origin
  private applyHeaders() {
    this.headers.forEach((value, name) => {
      this.originalRequest.headers.set(name, value)
    })
  }

  /**
   *
   * @param options
   * @returns
   */
  async next(options?: NextOptions): Promise<MiddlewareResponse> {
    this.applyHeaders()
    const response = await this.context.next(options)
    return new MiddlewareResponse(response)
  }

  rewrite(destination: string | URL | NextURL, init?: ResponseInit): NextResponse {
    if (typeof destination === 'string' && destination.startsWith('/')) {
      destination = new URL(destination, this.url)
    }
    this.applyHeaders()
    return NextResponse.rewrite(destination, init)
  }

  get headers() {
    return this.nextRequest.headers
  }

  get cookies() {
    return this.nextRequest.cookies
  }

  get geo() {
    return this.nextRequest.geo
  }

  get ip() {
    return this.nextRequest.ip
  }

  get nextUrl() {
    return this.nextRequest.url
  }

  get url() {
    return this.nextRequest.url.toString()
  }
}
