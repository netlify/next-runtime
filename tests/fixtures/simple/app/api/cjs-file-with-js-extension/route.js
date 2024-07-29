import { NextResponse } from 'next/server'
import { resolve } from 'node:path'

export async function GET() {
  return NextResponse.json({
    notBundledCJSModule: __non_webpack_require__(resolve('./cjs-file-with-js-extension.js')),
    bundledCJSModule: require('./bundled.cjs'),
  })
}

export const dynamic = 'force-dynamic'
