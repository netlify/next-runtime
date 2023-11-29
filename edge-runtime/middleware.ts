import type { Config, Context } from '@netlify/edge-functions'

// import nextConfig from '../edge-shared/nextConfig.json' assert { type: 'json' }

export async function handleMiddleware(req: Request, context: Context, nextHandler: () => any) {
  // Don't run in dev
  if (Deno.env.get('NETLIFY_DEV')) {
    return
  }

  const url = new URL(req.url)
  console.log('from handleMiddleware', url)
  // const req = new IncomingMessage(internalEvent);
  // const res = new ServerlessResponse({
  //   method: req.method ?? "GET",
  //   headers: {},
  // });
  //
  // const request = buildNextRequest(req, context, nextConfig)

  return Response.json({ success: true })
}
