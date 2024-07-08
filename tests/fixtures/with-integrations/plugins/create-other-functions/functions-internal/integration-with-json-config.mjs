export default function handler() {
  return new Response('Hello from integration generated serverless function', { status: 200 })
}

export const config = {
  path: '/test/serverless/integration-with-json-config',
}
