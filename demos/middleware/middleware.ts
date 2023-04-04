import { NextResponse } from 'next/server'
import { MiddlewareRequest, NextRequest } from '@netlify/next'

// Next.js replaces this with a stub polyfill. This import is just to test that stub.
import pointlessFetch from 'isomorphic-unfetch'

export async function middleware(req: NextRequest) {
  let response
  const { pathname } = req.nextUrl

  if (pathname.startsWith('/api/hello')) {
    // Next 13 request header mutation functionality
    const headers = new Headers(req.headers)

    headers.set('x-hello', 'world')
    return NextResponse.next({
      request: {
        headers
      }
    })
  }
  
  const request = new MiddlewareRequest(req)
  if (pathname.startsWith('/static')) {
    // Unlike NextResponse.next(), this actually sends the request to the origin
    const res = await request.next()
    const message = `This was static (& escaping test &amp;) but has been transformed in ${req.geo?.city}`

    // Transform the response HTML and props
    res.replaceText('p[id=message]', message)
    res.setPageProp('message', message)
    res.setPageProp('showAd', true)

    res.headers.set('x-modified-edge', 'true')
    res.headers.set('x-is-deno', 'Deno' in globalThis ? 'true' : 'false')
    return res
  }

  if (pathname.startsWith('/api/geo')) {
    req.headers.set('x-geo-country', req.geo.country)
    req.headers.set('x-geo-region', req.geo.region)
    req.headers.set('x-geo-city', req.geo.city)
    req.headers.set('x-geo-longitude', req.geo.longitude)
    req.headers.set('x-geo-latitude', req.geo.latitude)
    req.headers.set('x-geo-timezone', req.geo.timezone)

    return request.next()
  }

  if (pathname.startsWith('/headers')) {
    // Add a header to the rewritten request
    req.headers.set('x-hello', 'world')
    return request.rewrite('/api/hello')
  }

  if (pathname.startsWith('/cookies/middleware')) {
    const response = await new MiddlewareRequest(req).next()
    response.cookies.set('middlewareCookie', 'true')
    return response
  }

  if (pathname.startsWith('/cookies')) {
    response = NextResponse.next()
    response.cookies.set('netlifyCookie', 'true')
    return response
  }

  if(pathname.startsWith('/matcher-cookie')) {
    response = NextResponse.next()
    response.cookies.set('missingCookie', 'true')
    return response
  }

  if (pathname.startsWith('/conditional')) {
    response = NextResponse.next()
    response.headers.set('x-modified-edge', 'true')
    response.headers.set('x-is-deno', 'Deno' in globalThis ? 'true' : 'false')
    return response
  }

  if (pathname.startsWith('/missing')) {
    response = NextResponse.next()
    response.headers.set('x-cookie-missing', 'true')
    return response
  }

  if (pathname.startsWith('/shows')) {
    if (pathname.startsWith('/shows/222')) {
      response = NextResponse.next()
      const res = await pointlessFetch('http://www.example.com/')
      response.headers.set('x-example-server', res.headers.get('server'))
    }

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
    { source: '/cookies' },
    { source: '/matcher-cookie'},
    { source: '/shows/((?!99|88).*)' },
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
    {
      source: '/missing',
      missing: [
        {
          type: 'cookie',
          key: 'missingCookie',
        }
      ],
    },
  ],
}
