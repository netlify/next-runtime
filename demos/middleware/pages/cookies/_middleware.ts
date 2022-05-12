import { NextResponse } from 'next/server'
import { NextFetchEvent, NextRequest } from 'next/server'

export function middleware(req: NextRequest, ev: NextFetchEvent) {
  let res = NextResponse.next()
  res.cookies.set('netlifyCookie', 'true')
  return res
}
