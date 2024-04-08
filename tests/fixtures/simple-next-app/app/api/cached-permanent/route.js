import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    message:
      'Route handler not using request and using force-static dynamic strategy with permanent caching',
  })
}
export const revalidate = false

export const dynamic = 'force-static'
