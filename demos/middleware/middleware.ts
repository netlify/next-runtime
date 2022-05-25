import { NextResponse } from 'next/server'
import { NextFetchEvent, NextRequest } from 'next/server'

export function middleware(req: NextRequest, ev: NextFetchEvent) {
  if (req.nextUrl.pathname.startsWith('/cookies')) {
    let res = NextResponse.next()
    res.cookies.set('netlifyCookie', 'true')
    return res
  }

  if (req.nextUrl.pathname.startsWith('/shows')) {
    let response

    if (req.nextUrl.pathname.startsWith('/shows/rewrite-absolute')) {
      response = NextResponse.rewrite(new URL('/shows/100', req.url))
      response.headers.set('x-modified-in-rewrite', 'true')
    }
    if (req.nextUrl.pathname.startsWith('/shows/rewrite-external')) {
      response = NextResponse.rewrite('http://example.com/')
      response.headers.set('x-modified-in-rewrite', 'true')
    }
    if (req.nextUrl.pathname.startsWith('/shows/rewriteme')) {
      const url = req.nextUrl.clone()
      url.pathname = '/shows/100'
      response = NextResponse.rewrite(url)
      response.headers.set('x-modified-in-rewrite', 'true')
    }

    if (!response) {
      response = NextResponse.next()
    }
    response.headers.set('x-modified-edge', 'true')
    response.headers.set('x-is-deno', 'Deno' in globalThis ? 'true' : 'false')

    return response
  }

}
