export default function netlifyLoader({ src, width, quality }) {
  // origin is not used to construct image url, but is needed to use URL, we will discard it later
  const placeholderOrigin = `http://netlify.com`
  const baseURL = new URL(`${placeholderOrigin}/.netlify/images`)
  baseURL.searchParams.set('url', src)
  baseURL.searchParams.set('w', width)
  if (quality) {
    baseURL.searchParams.set('q', quality)
  }

  return `${baseURL.pathname}${baseURL.search}`
}
