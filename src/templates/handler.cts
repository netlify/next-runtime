import { IncomingMessage, ServerResponse } from 'node:http'

import type { Context } from '@netlify/functions'
// @ts-ignore
import { getRequestHandlers } from 'next/dist/server/lib/start-server.js'

// @ts-ignore
import requiredServerFiles from './.next/required-server-files.json'

process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(requiredServerFiles.config)

process.chdir(__dirname)

// eslint-disable-next-line import/no-anonymous-default-export, @typescript-eslint/no-unused-vars
export default async (request: IncomingMessage, context: Context) => {
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
