import { NextResponse } from 'next/server'
import { NextFetchEvent, NextRequest } from 'next/server'

export function middleware(req: NextRequest, ev: NextFetchEvent) {
  const url = req.nextUrl.clone()
  url.pathname = '/shows/100'
  const res = NextResponse.rewrite(url)
  res.headers.set('x-modified-in-rewrite', 'true')
  return res
}
