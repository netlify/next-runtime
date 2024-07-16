import { NextResponse } from 'next/server'

export function middleware() {
  const response: NextResponse = NextResponse.next()

  response.headers.set('x-hello-from-middleware', 'hello')

  return response
}
