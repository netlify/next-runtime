import { NextResponse } from 'next/server'

export async function middleware() {
  return NextResponse.next()
}
