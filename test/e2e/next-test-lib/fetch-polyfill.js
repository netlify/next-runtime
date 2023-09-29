if (!globalThis.fetch) {
  const fetch = require('node-fetch')

  globalThis.fetch = fetch
  globalThis.Headers = fetch.Headers
  globalThis.Request = fetch.Request
  globalThis.Response = fetch.Response
}
