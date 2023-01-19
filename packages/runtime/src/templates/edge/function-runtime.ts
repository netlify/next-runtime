import type { Context } from 'https://edge.netlify.com'
// Available at build time
import edgeFunction from './bundle.js'
import { buildNextRequest, buildResponse, redirectTrailingSlash } from '../edge-shared/utils.ts'
import nextConfig from '../edge-shared/nextConfig.json' assert { type: 'json' }

const handler = async (req: Request, context: Context) => {
  const url = new URL(req.url)
  const redirect = redirectTrailingSlash(url, nextConfig.trailingSlash)
  if (redirect) {
    return redirect
  }
  const request = buildNextRequest(req, context, nextConfig)
  try {
    const result = await edgeFunction({ request })
    return buildResponse({ result, request: req, context })
  } catch (error) {
    console.error(error)
    return new Response(error.message, { status: 500 })
  }
}

export default handler
