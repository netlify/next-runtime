// deno-lint-ignore-file no-var prefer-const no-unused-vars no-explicit-any
import { decode as _base64Decode } from 'https://deno.land/std@0.175.0/encoding/base64.ts'
import { AsyncLocalStorage as ALSCompat } from 'https://deno.land/std@0.175.0/node/async_hooks.ts'

/**
 * These are the shims, polyfills and other kludges to make Next.js work in standards-compliant runtime.
 * This file isn't imported, but is instead inlined along with other chunks into the edge bundle.
 */

declare global {
  var process: {
    env: Record<string, string>
  }
  var EdgeRuntime: string
  var AsyncLocalStorage: typeof ALSCompat
  var _ASSETS: Record<string, string>
}

// Deno defines "window", but naughty libraries think this means it's a browser
delete (globalThis as Omit<typeof globalThis, 'window'> & Pick<Partial<typeof globalThis>, 'window'>).window
globalThis.process = {
  env: { ...Deno.env.toObject(), NEXT_RUNTIME: 'edge', NEXT_PRIVATE_MINIMAL_MODE: '1' },
}
globalThis.EdgeRuntime = 'netlify-edge'
let _ENTRIES = {}

// Next.js expects this as a global
globalThis.AsyncLocalStorage = ALSCompat

// Next.js uses this extension to the Headers API implemented by Cloudflare workerd
if (!('getAll' in Headers.prototype)) {
  ;(Headers as any).prototype.getAll = function getAll(name: string) {
    name = name.toLowerCase()
    if (name !== 'set-cookie') {
      throw new Error('Headers.getAll is only supported for Set-Cookie')
    }
    return [...this.entries()].filter(([key]) => key === name).map(([, value]) => value)
  }
}
//  Next uses blob: urls to refer to local assets, so we need to intercept these
const _fetch = globalThis.fetch
const fetch: typeof globalThis.fetch = async (url, init) => {
  try {
    if (url instanceof URL && url.href?.startsWith('blob:')) {
      const key = url.href.slice(5)
      if (key in _ASSETS) {
        return new Response(_base64Decode(_ASSETS[key]))
      }
    }
    return await _fetch(url, init)
  } catch (error) {
    console.error(error)
    throw error
  }
}

// Next edge runtime uses "self" as a function-scoped global-like object, but some of the older polyfills expect it to equal globalThis
// See https://nextjs.org/docs/basic-features/supported-browsers-features#polyfills
const self = { ...globalThis, fetch }
