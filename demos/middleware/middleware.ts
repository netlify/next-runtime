import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { NetlifyMiddleware } from '@netlify/plugin-nextjs/middleware'

export async function middleware(request: NextRequest) {
  let response
  const {
    nextUrl: { pathname },
  } = request

  if (pathname.startsWith('/static')) {
    // Unlike NextResponse.next(), this actually sends the request to the origin
    const res = await new NetlifyMiddleware(request).next()
    const message = `This was static but has been transformed in ${request.geo.city}`

    // Transform the response page data
    res.transformData((data) => {
      data.pageProps.message = message
      data.pageProps.showAd = true
      return data
    })

    // Transform the response HTML
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

  if (pathname.startsWith('/api/hello')) {
    // Add a header to the request
    request.headers.set('x-hello', 'world')
    return new NetlifyMiddleware(request).next()
  }

  if (pathname.startsWith('/headers')) {
    // Add a header to the rewritten request
    request.headers.set('x-hello', 'world')
    return new NetlifyMiddleware(request).rewrite('/api/hello')
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
