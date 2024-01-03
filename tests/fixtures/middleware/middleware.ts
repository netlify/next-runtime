import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  let response: NextResponse

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-hello-from-middleware-req', 'hello')

  if (request.nextUrl.pathname.startsWith('/test/next')) {
    response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  } else if (request.nextUrl.pathname.startsWith('/test/redirect')) {
    response = NextResponse.redirect(new URL('/other', request.url))
  } else if (request.nextUrl.pathname.startsWith('/test/rewrite-internal')) {
    response = NextResponse.rewrite(new URL('/rewrite-target', request.url), {
      request: {
        headers: requestHeaders,
      },
    })
  } else if (request.nextUrl.pathname.startsWith('/test/rewrite-external')) {
    const requestURL = new URL(request.url)
    const externalURL = requestURL.searchParams.get('external-url') as string

    response = NextResponse.rewrite(externalURL, {
      request: {
        headers: requestHeaders,
      },
    })
  } else {
    response = NextResponse.json({ error: 'Error' }, { status: 500 })
  }

  response.headers.set('x-hello-from-middleware-res', 'hello')
  return response
}

export const config = {
  matcher: '/test/:path*',
}
