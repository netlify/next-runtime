import type { Context } from '@netlify/edge-functions'
import type { NextURL } from 'next/dist/server/web/next-url'
import type { NextRequest as InternalNextRequest } from 'next/server'

import { MiddlewareResponse } from './response'

export type NextRequest = InternalNextRequest & {
  get geo(): {
    timezone?: string
  }
}

export interface NextOptions {
  /**
   * Include conditional request headers in the request to the origin.
   * If you do this, you must ensure you check the response for a 304 Not Modified response
   * and handle it and the missing bode accordingly.
   */
  sendConditionalRequest?: boolean
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
   * Passes the request to the origin, allowing you to access the response
   */
  async next(options?: NextOptions): Promise<MiddlewareResponse> {
    this.applyHeaders()
    let response = await this.context.next(options)

    // Because our cdn lowercases urls, this gets problematic when trying to add redirects
    // This intercepts that redirect loop and rewrites the lowercase version so that the i18n url serves the right content.
    const locationHeader = response.headers.get('location')
    if (response.status === 301 && locationHeader?.startsWith('/')) {
      response = await this.context.rewrite(locationHeader)
    }
    return new MiddlewareResponse(response)
  }

  async rewrite(destination: string | URL | NextURL, init?: ResponseInit) {
    if (typeof destination === 'string' && destination.startsWith('/')) {
      destination = new URL(destination, this.url)
    }
    this.applyHeaders()
    const response = await this.context.rewrite(destination)

    return new MiddlewareResponse(response, init)
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
    return this.nextRequest.nextUrl
  }

  get url() {
    return this.nextRequest.url.toString()
  }
}
