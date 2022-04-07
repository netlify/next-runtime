import { NextResponse } from 'next/server'
import type { NextFetchEvent, NextRequest } from 'next/server'

export async function middleware(req: NextRequest, ev: NextFetchEvent) {
  const response = NextResponse.next()

  // Set custom header
  response.headers.set('x-modified-edge', 'true')
  response.headers.set('x-is-deno', 'Deno' in globalThis ? 'true' : 'false')

  // Return response
  return response
}
