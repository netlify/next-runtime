import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { toComputeResponse, toReqRes } from '@fastly/http-compute-js'

// these dependencies are generated during the build
const requiredServerFiles = JSON.parse(await readFile('./.next/required-server-files.json', 'utf-8'))

// read Next config from the build output
process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(requiredServerFiles.config)

// run the server in the root directory
const __dirname = fileURLToPath(new URL('.', import.meta.url))
process.chdir(__dirname)

export default async (request: Request) => {
  const { getRequestHandlers } = await import('next/dist/server/lib/start-server.js')

  // let Next.js initialize and create the request handler
  const [nextHandler] = await getRequestHandlers({
    port: 3000,
    hostname: 'localhost',
    dir: __dirname,
    isDev: false,
  })

  const { req, res } = toReqRes(request)

  try {
    console.log('Next server request:', req.url)
    await nextHandler(req, res)
  } catch (error) {
    console.error(error)
    res.statusCode = 500
    res.end('Internal Server Error')
  }

  // log the response from Next.js
  const response = { headers: res.getHeaders(), statusCode: res.statusCode }
  console.log('Next server response:', JSON.stringify(response, null, 2))

  return await toComputeResponse(res)
}
