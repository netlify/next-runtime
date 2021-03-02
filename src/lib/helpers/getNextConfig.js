// Get next.config.js
const { PHASE_PRODUCTION_BUILD } = require('next/constants')
const { default: loadConfig } = require('next/dist/next-server/server/config')
const { resolve } = require('path')

const getNextConfig = () => {
  // Load next.config.js
  // Use same code as https://github.com/vercel/next.js/blob/25488f4a03db30cade4d086ba49cd9a50a2ac02e/packages/next/build/index.ts#L114
  return loadConfig(PHASE_PRODUCTION_BUILD, resolve('.'))
}

module.exports = getNextConfig
