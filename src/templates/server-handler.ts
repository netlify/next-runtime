import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

import { toComputeResponse, toReqRes } from '@fastly/http-compute-js'

// use require to stop NFT from trying to trace these dependencies
const require = createRequire(import.meta.url)

/* these dependencies are generated during the build */
// eslint-disable-next-line import/order
const { getRequestHandlers } = require('next/dist/server/lib/start-server.js')
const requiredServerFiles = require('../../.next/required-server-files.json')

requiredServerFiles.config.experimental = {
  ...requiredServerFiles.config.experimental,
  incrementalCacheHandlerPath: '../dist/templates/cache-handler.cjs',
}

// read Next config from the build output
process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(requiredServerFiles.config)

// run the server in the root directory
const __dirname = fileURLToPath(new URL('../..', import.meta.url))
process.chdir(__dirname)

export default async (request: Request) => {
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
