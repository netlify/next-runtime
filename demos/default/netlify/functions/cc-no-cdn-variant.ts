import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions'

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // your server-side functionality
  const debugObject = {
    netlifyRequestId: event.multiValueHeaders?.['X-Nf-Request-Id']?.[0],
    awsRequestId: context.awsRequestId,
    time: new Date().toString(),
    headers: event.multiValueHeaders,
  }
  console.log('EXECUTED', debugObject.netlifyRequestId, debugObject.time)

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'cache-control': 'max-age=10,stale-while-revalidate=60',
      'netlify-vary': 'header=x-test-group',
    },
    body: JSON.stringify(debugObject),
  }
}

export { handler }
