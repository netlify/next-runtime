import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.rewrite(new URL('/', req.url))
  res.headers.set('x-response-header', 'set in middleware')
  res.headers.set('x-is-deno', 'Deno' in globalThis ? 'true' : 'false')
  return res
}

export const config = {
  matcher: ['/foo'],
}
