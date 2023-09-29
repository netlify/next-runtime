if (!globalThis.fetch) {
  console.log(`injecting global fetch polyfill`)

  const fetch = require('node-fetch')

  globalThis.fetch = fetch
  globalThis.Headers = fetch.Headers
  globalThis.Request = fetch.Request
  globalThis.Response = fetch.Response

  console.log(`injected global fetch polyfill`, globalThis.fetch)
}
