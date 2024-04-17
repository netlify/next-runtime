import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    message:
      'Route handler not using request and using force-static dynamic strategy with 15 seconds revalidate',
  })
}
export const revalidate = 15

export const dynamic = 'force-static'
