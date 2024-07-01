export default function handler() {
  return new Response('Hello from /test/serverless/integration-with-json-config', { status: 200 })
}

export const config = {
  path: '/test/serverless/integration-with-json-config',
}
