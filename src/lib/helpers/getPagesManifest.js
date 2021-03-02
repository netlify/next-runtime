const { join } = require('path')
const { existsSync, readJSONSync } = require('fs-extra')
const { NEXT_DIST_DIR } = require('../config')

const getPagesManifest = () => {
  const manifestPath = join(NEXT_DIST_DIR, 'serverless', 'pages-manifest.json')
  if (!existsSync(manifestPath)) return {}
  const contents = readJSONSync(manifestPath)
  // Next.js mistakenly puts backslashes in certain paths on Windows, replace
  Object.entries(contents).forEach(([key, value]) => {
    contents[key] = value.replace(/\\/g, '/')
  })
  return contents
}

module.exports = getPagesManifest
