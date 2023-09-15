import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions'

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // your server-side functionality
  const debugObject = {
    netlifyRequestId: event.multiValueHeaders?.['x-nf-request-id']?.[0],
    awsRequestId: context.awsRequestId,
    headers: event.multiValueHeaders,
  }
  console.log('debug', debugObject)

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'netlify-cdn-cache-control': 'max-age=10,stale-while-revalidate=60',
      'netlify-vary': 'header=x-test-group',
    },
    body: JSON.stringify(debugObject),
  }
}

export { handler }
