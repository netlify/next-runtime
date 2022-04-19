import { Accepts } from 'https://deno.land/x/accepts/mod.ts'
import type { Context } from 'netlify:edge'

/**
 * Implement content negotiation for images
 */

const handler = async (req: Request, context: Context) => {
  const { searchParams } = new URL(req.url)
  const accept = new Accepts(req.headers)
  const type = accept.types(['avif', 'webp'])

  const source = searchParams.get('url')
  const width = searchParams.get('w')
  const quality = searchParams.get('q') ?? 75

  if (!source || !width) {
    return new Response('Invalid request', {
      status: 400,
    })
  }

  const modifiers = [`w_${width}`, `q_${quality}`]

  if (type) {
    modifiers.push(`f_${type}`)
  }

  return context.rewrite(`/_ipx/${modifiers.join(',')}/${encodeURIComponent(source)}`)
}

export default handler
