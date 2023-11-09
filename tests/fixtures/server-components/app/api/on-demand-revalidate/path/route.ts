import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export async function GET(request: NextRequest) {
  revalidatePath('/static-fetch/[id]', 'page')
  return NextResponse.json({ revalidated: true, now: new Date().toISOString() })
}

export const dynamic = 'force-dynamic'
