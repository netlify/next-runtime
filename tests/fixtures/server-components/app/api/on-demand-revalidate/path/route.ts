import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  let pathToRevalidate = url.searchParams.get('path')

  if (pathToRevalidate) {
    pathToRevalidate = encodeURI(pathToRevalidate)
  } else {
    pathToRevalidate = '/static-fetch/[id]/page'
  }

  revalidatePath(pathToRevalidate)
  return NextResponse.json({
    revalidated: true,
    now: new Date().toISOString(),
  })
}

export const dynamic = 'force-dynamic'
