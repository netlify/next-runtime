import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/middle')) {
    const response = NextResponse.next()

    response.headers.set('x-custom-1', 'value-1')
    response.headers.set('x-custom-2', 'value-2')
    response.headers.set('x-custom-3', 'value-3')
    response.headers.set('x-custom-4', 'value-4')

    return response
  }

  if (request.nextUrl.pathname.startsWith('/getStaticProps/withFallbackAndMiddleware')) {
    const res = NextResponse.next()
    res.headers.set('x-middleware-date', new Date().toISOString())
    return res
  }
}
