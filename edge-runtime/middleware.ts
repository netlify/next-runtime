import type { Context } from '@netlify/edge-functions'

import { buildNextRequest, RequestData } from './lib/next-request.ts'
import { buildResponse } from './lib/response.ts'
import { FetchEventResult } from './lib/response.ts'

type NextHandler = (params: { request: RequestData }) => Promise<FetchEventResult>

/**
 * Runs a Next.js middleware as a Netlify Edge Function. It translates a web
 * platform Request into a NextRequest instance on the way in, and translates
 * a NextResponse into a web platform Response on the way out.
 *
 * @param request Incoming request
 * @param context Netlify-specific context object
 * @param nextHandler Next.js middleware handler
 */
export async function handleMiddleware(
  request: Request,
  context: Context,
  nextHandler: NextHandler,
) {
  // Don't run in dev
  if (Netlify.env.has('NETLIFY_DEV')) {
    return
  }

  const nextRequest = buildNextRequest(request, context)

  try {
    const result = await nextHandler({ request: nextRequest })
    const response = await buildResponse({ result, request: request, context })

    return response
  } catch (error) {
    console.error(error)

    return new Response(error.message, { status: 500 })
  }
}
