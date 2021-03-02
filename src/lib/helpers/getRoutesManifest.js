const { join } = require('path')
const { readJSONSync } = require('fs-extra')
const { NEXT_DIST_DIR } = require('../config')

const getRoutesManifest = () => {
  return readJSONSync(join(NEXT_DIST_DIR, 'routes-manifest.json'))
}

module.exports = getRoutesManifest
