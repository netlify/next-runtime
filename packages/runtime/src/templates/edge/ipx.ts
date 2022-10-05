import { Accepts } from 'https://deno.land/x/accepts@2.1.1/mod.ts'
import type { Context } from 'https://edge.netlify.com'
// Available at build time
import imageconfig from './imageconfig.json' assert { type: 'json' }

const defaultFormat = 'webp'

interface ImageConfig extends Record<string, unknown> {
  formats?: string[]
}

// Checks if a URL param is numeric
const isNumeric = (value: string | null) => Number(value).toString() === value

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
  const quality = searchParams.get('q') ?? '75'

  const errors: Array<string> = []

  if (!source) {
    errors.push('Missing "url" parameter')
  } else if (!source.startsWith('http') && !source.startsWith('/')) {
    errors.push('The "url" parameter must be a valid URL or path')
  }

  if (!width) {
    errors.push('Missing "w" parameter')
  } else if (!isNumeric(width)) {
    errors.push('Invalid "w" parameter')
  }

  if (!isNumeric(quality)) {
    errors.push('Invalid "q" parameter')
  }

  if (!source || errors.length > 0) {
    return new Response(`Invalid request: \n${errors.join('\n')}`, {
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
