/* eslint-disable no-underscore-dangle */
import { NextURL } from 'next/dist/server/web/next-url'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { NextOriginResponse } from './next-origin-response'

// TODO: add Context type
type Context = {
  next: () => Promise<Response>
}

// We sneak our own request and context into the middleware using the geo object
type AugmentedGeo = NextRequest['geo'] & {
  // eslint-disable-next-line camelcase
  __nf_context: Context
  // eslint-disable-next-line camelcase
  __nf_request: Request
}

/**
 * Supercharge your Next middleware with Netlify Edge Functions
 */
export class MiddlewareRequest {
  context: Context
  originalRequest: Request

  constructor(public request: NextRequest) {
    if (!('Deno' in globalThis)) {
      throw new Error('NetlifyMiddleware only works in a Netlify Edge Function environment')
    }
    const geo = request.geo as AugmentedGeo
    if (!geo) {
      throw new Error('NetlifyMiddleware must be instantiated with a NextRequest object')
    }
    this.context = geo.__nf_context
    this.originalRequest = geo.__nf_request
  }

  // Add the headers to the original request, which will be passed to the origin
  private applyHeaders() {
    this.request.headers.forEach((value, name) => {
      this.originalRequest.headers.set(name, value)
    })
  }

  async next(): Promise<NextOriginResponse> {
    this.applyHeaders()
    const response = await this.context.next()
    return new NextOriginResponse(response)
  }

  rewrite(destination: string | URL | NextURL, init?: ResponseInit): NextResponse {
    if (typeof destination === 'string' && destination.startsWith('/')) {
      destination = new URL(destination, this.request.url)
    }
    this.applyHeaders()
    return NextResponse.rewrite(destination, init)
  }

  redirect(destination: string | URL | NextURL, init?: number | ResponseInit) {
    if (typeof destination === 'string' && destination.startsWith('/')) {
      destination = new URL(destination, this.request.url)
    }
    return NextResponse.redirect(destination, init)
  }
}
/* eslint-enable no-underscore-dangle */
