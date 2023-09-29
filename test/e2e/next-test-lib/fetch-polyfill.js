if (!globalThis.fetch) {
  console.log(`injecting global fetch polyfill`)
  globalThis.fetch = require('node-fetch')
  console.log(`injected global fetch polyfill`, globalThis.fetch)
}
