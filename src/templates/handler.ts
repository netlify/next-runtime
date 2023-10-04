import { createRequire } from 'module'
import { IncomingMessage, ServerResponse } from 'node:http'
import { fileURLToPath } from 'node:url'

import type { Context } from '@netlify/functions'

const require = createRequire(import.meta.url)
const { getRequestHandlers } = require('next/dist/server/lib/start-server.js')

// eslint-disable-next-line import/no-unresolved
const requiredServerFiles = require('./.next/required-server-files.json')

process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(requiredServerFiles.config)

const __dirname = fileURLToPath(new URL('.', import.meta.url))

process.chdir(__dirname)

// eslint-disable-next-line import/no-anonymous-default-export, @typescript-eslint/no-unused-vars
export default async (request: Request, context: Context) => {
  // let Next.js initialize and create the request handler
  const [nextHandler] = await getRequestHandlers({
    port: 3000,
    hostname: 'localhost',
    dir: __dirname,
    isDev: false,
  })

  const response = new ServerResponse(request)

  try {
    console.log('Next server request:', request.url)
    await nextHandler(request, response)
  } catch (error) {
    console.error(error)
    response.statusCode = 500
    response.end('Internal Server Error')
  }

  // log the response from Next.js
  console.log('Next server response:', JSON.stringify(response, null, 2))

  return response
}
