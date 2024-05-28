import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.redirect('https://www.netlify.com/')
}

export const dynamic = 'force-dynamic'
