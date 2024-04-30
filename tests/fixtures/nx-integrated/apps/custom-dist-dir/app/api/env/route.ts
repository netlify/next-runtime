import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ 
    '.env': process.env.FROM_DOT_ENV ?? 'undefined',
    '.env.local': process.env.FROM_DOT_ENV_DOT_LOCAL ?? 'undefined',
    '.env.production': process.env.FROM_DOT_ENV_DOT_PRODUCTION ?? 'undefined',
    '.env.production.local': process.env.FROM_DOT_ENV_DOT_PRODUCTION_DOT_LOCAL ?? 'undefined',
  })
}

export const dynamic = 'force-dynamic'
