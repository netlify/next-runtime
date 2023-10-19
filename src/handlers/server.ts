/* eslint-disable n/prefer-global/buffer */
/* eslint-disable max-statements */
import { toComputeResponse, toReqRes } from '@fastly/http-compute-js'
import { HandlerEvent, type Handler, HandlerContext } from "@netlify/functions"
import type { WorkerRequestHandler } from 'next/dist/server/lib/types.js'

import { netliBlob } from '../helpers/blobs/blobs.cjs'
import { TASK_DIR } from '../helpers/constants.js'

let nextHandler: WorkerRequestHandler

export default async (request: Request) => {
  if (!nextHandler) {
    // set the server config
    const { setRequestConfig } = await import('../helpers/config.js')
    await setRequestConfig()

    // let Next.js initialize and create the request handler
    const { getRequestHandlers } = await import('next/dist/server/lib/start-server.js')
    ;[nextHandler] = await getRequestHandlers({
      port: 3000,
      hostname: 'localhost',
      dir: TASK_DIR,
      isDev: false,
    })
  }

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

  return toComputeResponse(res)
}
// Commenting out for now 
// export const handler: Handler = (event: HandlerEvent, context: HandlerContext): any => {
//   if (context?.clientContext?.custom?.blobs) {
//     const rawData = Buffer.from(context.clientContext.custom.blobs, 'base64')
//     const data = JSON.parse(rawData.toString('ascii'))
    
//     netliBlob(data.token, `deploy:${event.headers['x-nf-deploy-id']}`, `${event.headers['x-nf-site-id']}`, data.url)
//   }
// }
