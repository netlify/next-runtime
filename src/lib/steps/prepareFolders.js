const { join } = require('path')

const findCacheDir = require('find-cache-dir')
const { emptyDirSync } = require('fs-extra')

const { NETLIFY_PUBLISH_PATH, NETLIFY_FUNCTIONS_PATH } = require('../config')
const handleFileTracking = require('../helpers/handleFileTracking')
const { logTitle, log } = require('../helpers/logger')

// Clean existing publish and functions folders
const prepareFolders = ({ functionsPath, publishPath }) => {
  logTitle('🚀 Next on Netlify 🚀')

  const isNotConfiguredFunctionsDir = functionsPath === NETLIFY_FUNCTIONS_PATH
  const isNotConfiguredPublishDir = publishPath === NETLIFY_PUBLISH_PATH

  if (isNotConfiguredFunctionsDir) {
    log('  ', 'Functions directory: ', functionsPath)
  }
  if (isNotConfiguredPublishDir) {
    log('  ', 'Publish directory: ', publishPath)
  }
  if (isNotConfiguredFunctionsDir || isNotConfiguredPublishDir) {
    log('  ', 'Make sure these are set in your netlify.toml file.')
  }

  // We can empty these dirs knowing there will only be stale NoN-generated files inside
  if (isNotConfiguredPublishDir) {
    emptyDirSync(publishPath)
  }
  if (isNotConfiguredFunctionsDir) {
    emptyDirSync(functionsPath)
  }

  // This returns a function that runs as the last step of nextOnNetlify()
  return handleFileTracking({ functionsPath, publishPath })
}

module.exports = prepareFolders
