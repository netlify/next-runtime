import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { MiddlewareRequest } from '@netlify/next'

export async function middleware(req: NextRequest) {
  let response
  const { pathname } = req.nextUrl

  const request = new MiddlewareRequest(req)
  if (pathname.startsWith('/static')) {
    // Unlike NextResponse.next(), this actually sends the request to the origin
    const res = await request.next()
    const message = `This was static but has been transformed in ${req.geo?.city}`

    // Transform the response HTML and props
    res.replaceText('p[id=message]', message)
    res.setPageProp('message', message)
    res.setPageProp('showAd', true)

    res.headers.set('x-modified-edge', 'true')
    res.headers.set('x-is-deno', 'Deno' in globalThis ? 'true' : 'false')
    return res
  }

  if (pathname.startsWith('/api/hello')) {
    // Add a header to the request
    req.headers.set('x-hello', 'world')
    return request.next()
  }

  if (pathname.startsWith('/headers')) {
    // Add a header to the rewritten request
    req.headers.set('x-hello', 'world')
    return request.rewrite('/api/hello')
  }

  if (pathname.startsWith('/cookies')) {
    response = NextResponse.next()
    response.cookies.set('netlifyCookie', 'true')
    return response
  }

  if (pathname.startsWith('/conditional')) {
    response = NextResponse.next()
    response.headers.set('x-modified-edge', 'true')
    response.headers.set('x-is-deno', 'Deno' in globalThis ? 'true' : 'false')
    return response
  }

  if (pathname.startsWith('/shows')) {
    if (pathname.startsWith('/shows/rewrite-absolute')) {
      response = NextResponse.rewrite(new URL('/shows/100', req.url))
      response.headers.set('x-modified-in-rewrite', 'true')
    }
    if (pathname.startsWith('/shows/rewrite-external')) {
      response = NextResponse.rewrite('http://example.com/')
      response.headers.set('x-modified-in-rewrite', 'true')
    }
    if (pathname.startsWith('/shows/rewriteme')) {
      const url = req.nextUrl.clone()
      url.pathname = '/shows/100'
      response = NextResponse.rewrite(url)
      response.headers.set('x-modified-in-rewrite', 'true')
    }

    if (pathname.startsWith('/shows/redirectme')) {
      const url = req.nextUrl.clone()
      url.pathname = '/shows/100'
      response = NextResponse.redirect(url)
    }

    if (pathname.startsWith('/shows/redirectexternal')) {
      response = NextResponse.redirect('http://example.com/')
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

export const config = {
  matcher: [
    '/api/:all*',
    '/headers',
    { source: '/static' },
    { source: '/shows/:all*' },
    {
      source: '/conditional',
      has: [
        {
          type: 'header',
          key: 'x-my-header',
          value: 'my-value',
        },
      ],
    },
  ],
}
