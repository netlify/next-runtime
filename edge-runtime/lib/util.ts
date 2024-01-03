// If the redirect is a data URL, we need to normalize it.
// https://github.com/vercel/next.js/blob/25e0988e7c9033cb1503cbe0c62ba5de2e97849c/packages/next/src/shared/lib/router/utils/get-next-pathname-info.ts#L69-L76
export function normalizeDataUrl(redirect: string) {
  if (redirect.startsWith('/_next/data/') && redirect.includes('.json')) {
    const paths = redirect
      .replace(/^\/_next\/data\//, '')
      .replace(/\.json/, '')
      .split('/')

    redirect = paths[1] !== 'index' ? `/${paths.slice(1).join('/')}` : '/'
  }

  return redirect
}

/**
 * This is how Next handles rewritten URLs.
 */
export function relativizeURL(url: string | string, base: string | URL) {
  const baseURL = typeof base === 'string' ? new URL(base) : base
  const relative = new URL(url, base)
  const origin = `${baseURL.protocol}//${baseURL.host}`
  return `${relative.protocol}//${relative.host}` === origin
    ? relative.toString().replace(origin, '')
    : relative.toString()
}
