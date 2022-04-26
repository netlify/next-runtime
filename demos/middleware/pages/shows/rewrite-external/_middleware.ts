import { NextResponse } from 'next/server'
import { NextFetchEvent, NextRequest } from 'next/server'

export function middleware(req: NextRequest, ev: NextFetchEvent) {
  const res = NextResponse.rewrite('http://example.com/')
  res.headers.set('x-modified-in-rewrite', 'true')
  return res
}
