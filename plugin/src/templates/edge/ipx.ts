import { Accepts } from 'https://deno.land/x/accepts@2.1.1/mod.ts'
import type { Context } from 'https://edge.netlify.com'
// Available at build time
import imageconfig from './imageconfig.json' assert { type: 'json' }

const defaultFormat = 'webp'

interface ImageConfig extends Record<string, unknown> {
  formats?: string[]
}

/**
 * Implement content negotiation for images
 */

// deno-lint-ignore require-await
const handler = async (req: Request, context: Context) => {
  const { searchParams } = new URL(req.url)
  const accept = new Accepts(req.headers)
  const { formats = [defaultFormat] } = imageconfig as ImageConfig
  if (formats.length === 0) {
    formats.push(defaultFormat)
  }
  let type = accept.types(formats) || defaultFormat
  if (Array.isArray(type)) {
    type = type[0]
  }

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
    if (type.includes('/')) {
      // If this is a mimetype, strip "image/"
      type = type.split('/')[1]
    }
    modifiers.push(`f_${type}`)
  }
  const target = `/_ipx/${modifiers.join(',')}/${encodeURIComponent(source)}`
  return context.rewrite(target)
}

export default handler
