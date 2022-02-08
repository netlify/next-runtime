import { NextResponse } from 'next/server'

export function middleware() {
  const res = NextResponse.next()
  res.headers.set('x-middleware-date', new Date().toISOString())
  return res
}
