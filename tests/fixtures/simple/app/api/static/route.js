import { NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'

export async function GET(request) {
  const words = await readFile('static/words.txt', 'utf-8')
  return NextResponse.json({ words })
}

export const dynamic = 'force-dynamic'
