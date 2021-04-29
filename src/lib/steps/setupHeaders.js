const { join } = require('path')

const { existsSync, readFileSync, writeFileSync } = require('fs-extra')

const { CUSTOM_HEADERS_PATH } = require('../config')
const { logTitle, logItem } = require('../helpers/logger')

const indentNewLine = (s) => `\n  ${s}`

// Setup _headers file to override specific header rules for next assets
const setupHeaders = (publishPath) => {
  logTitle('🔀 Setting up headers')

  // Collect custom redirects defined by the user
  const headers = []
  if (existsSync(CUSTOM_HEADERS_PATH)) {
    logItem('# Prepending custom headers')
    headers.push(readFileSync(CUSTOM_HEADERS_PATH, 'utf8'))
  }

  // Add NoN section heading
  headers.push('# Next-on-Netlify Headers')

  // Add rule to override cache control for static chunks
  const staticChunkRule = [
    `/_next/static/chunks/*`,
    indentNewLine(`cache-control: public`),
    indentNewLine(`cache-control: max-age=31536000`),
    indentNewLine(`cache-control: immutable`),
  ].join('')
  headers.push(staticChunkRule)

  // Write redirects to _redirects file
  writeFileSync(join(publishPath, '_headers'), headers.join('\n'))
}

module.exports = setupHeaders
