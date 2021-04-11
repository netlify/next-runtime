const { join } = require('path')

const { readJSONSync } = require('fs-extra')

const getNextDistDir = require('./getNextDistDir')

const getRoutesManifest = async () => {
  const nextDistDir = await getNextDistDir()
  return readJSONSync(join(nextDistDir, 'routes-manifest.json'))
}

module.exports = getRoutesManifest
