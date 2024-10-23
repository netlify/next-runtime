import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createServerRunner } from '@aws-amplify/adapter-nextjs'

export const { runWithAmplifyServerContext } = createServerRunner({
  config: {},
})

export async function middleware(request: NextRequest) {
  const response = getResponse(request)

  response.headers.append('Deno' in globalThis ? 'x-deno' : 'x-node', Date.now().toString())
  response.headers.set('x-hello-from-middleware-res', 'hello')

  await runWithAmplifyServerContext({
    nextServerContext: { request, response },
    operation: async () => {
      response.headers.set('x-cjs-module-works', 'true')
    },
  })

  return response
}

const getResponse = (request: NextRequest) => {
  const requestHeaders = new Headers(request.headers)

  requestHeaders.set('x-hello-from-middleware-req', 'hello')

  if (request.nextUrl.pathname === '/test/next') {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  if (request.nextUrl.pathname === '/test/redirect') {
    return NextResponse.redirect(new URL('/other', request.url))
  }

  if (request.nextUrl.pathname === '/test/redirect-with-headers') {
    return NextResponse.redirect(new URL('/other', request.url), {
      headers: { 'x-header-from-redirect': 'hello' },
    })
  }

  if (request.nextUrl.pathname === '/test/rewrite-target') {
    const response = NextResponse.next()
    response.headers.set('x-added-rewrite-target', 'true')
    return response
  }

  if (request.nextUrl.pathname === '/test/rewrite-internal') {
    return NextResponse.rewrite(new URL('/rewrite-target', request.url), {
      request: {
        headers: requestHeaders,
      },
    })
  }

  if (request.nextUrl.pathname === '/test/rewrite-loop-detect') {
    return NextResponse.rewrite(new URL('/test/rewrite-target', request.url), {
      request: {
        headers: requestHeaders,
      },
    })
  }

  if (request.nextUrl.pathname === '/test/rewrite-external') {
    const requestURL = new URL(request.url)
    const externalURL = new URL(requestURL.searchParams.get('external-url') as string)

    externalURL.searchParams.set('from', 'middleware')

    return NextResponse.rewrite(externalURL, {
      request: {
        headers: requestHeaders,
      },
    })
  }

  if (request.nextUrl.pathname === '/test/rewrite-and-redirect') {
    return NextResponse.redirect(new URL('/other', request.url), {
      status: 302,
      statusText: 'Found',
      headers: {
        'x-middleware-rewrite': new URL('/test/should-not-be-rewritten', request.url).toString(),
      },
    })
  }

  return NextResponse.json({ error: 'Error' }, { status: 500 })
}

export const config = {
  matcher: '/test/:path*',
}
