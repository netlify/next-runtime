export default function handler() {
  return new Response('Hello from /test/edge/integration-not-in-manifest', { status: 200 })
}

export const config = {
  path: '/test/edge/integration-not-in-manifest',
}
