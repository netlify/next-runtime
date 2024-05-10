// @ts-check
import { getDeployStore } from '@netlify/blobs'
import { encodeBase64 } from 'https://deno.land/std@0.223.0/encoding/base64.ts'

const pathToBlobKey = (path) => encodeBase64(path === '/' ? '/index' : path).replaceAll('=', '')

/**
 * @param {Request} request
 */
export default async function handler(request) {
  const timing = []
  const start = Date.now()
  const url = new URL(request.url)
  // Skip RSC requests
  if (request.headers.has('rsc')) {
    return
  }
  if (url.pathname === '/') {
    url.pathname = '/index'
  }
  console.log('Starting request for:', url.pathname)
  const deployStore = getDeployStore()
  const key = pathToBlobKey(url.pathname)
  console.time('get')
  const data = await deployStore.get(key, {
    type: 'json',
  })
  console.timeEnd('get')
  timing.push(`blob;dur=${Date.now() - start};desc="get blob"`)
  if (data?.value?.kind !== 'PAGE') {
    console.log('No prerendered HTML found for', url.pathname, key)
    return
  }

  const { html, headers, postponed } = data.value

  const postponedURL = new URL(`/_next/postponed/resume${url.pathname}`, url)

  const postponedHeaders = new Headers(headers)
  postponedHeaders.set('x-matched-path', postponedURL.pathname)
  const encoder = new TextEncoder()
  const combinedStream = new ReadableStream({
    async start(controller) {
      // Start the request to the postponed URL, but don't await it yet
      const postponedResponse = fetch(postponedURL, {
        method: 'POST',
        body: postponed,
        headers: postponedHeaders,
      })

      // First, send the shell
      controller.enqueue(encoder.encode(html))

      const shellTiming = `Shell sent in ${Date.now() - start}ms.`
      console.log(shellTiming)

      controller.enqueue(new TextEncoder().encode(`\n<!-- ${shellTiming}  -->\n`))

      // Now, handle the postponed body stream
      const postponedResult = await postponedResponse
      if (!postponedResult.body) {
        console.log('No postponed body found for', postponedURL.pathname)
        return
      }
      const postponedReader = postponedResult.body.getReader()
      const postponedTiming = `Postponed started to stream after ${Date.now() - start}ms.`
      console.log(postponedTiming)
      controller.enqueue(new TextEncoder().encode(`\n<!-- ${postponedTiming} -->\n`))
      while (true) {
        const { done, value } = await postponedReader.read()
        if (done) {
          controller.close()
          break
        }
        controller.enqueue(value)
      }
    },
  })
  console.log('Returning response for', url.pathname, 'after', Date.now() - start, 'ms')
  timing.push(`total;dur=${Date.now() - start};desc="total"`)

  return new Response(combinedStream, {
    headers: {
      ...headers,
      'Content-Type': 'text/html',
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'Server-Timing': timing.join(', '),
    },
  })
}
