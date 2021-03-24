const { join } = require('path')
const { readJSONSync } = require('fs-extra')
const getNextDistDir = require('./getNextDistDir')

const getRoutesManifest = async ({ publishPath }) => {
  const nextDistDir = await getNextDistDir({ publishPath })
  return readJSONSync(join(nextDistDir, 'routes-manifest.json'))
}

module.exports = getRoutesManifest
