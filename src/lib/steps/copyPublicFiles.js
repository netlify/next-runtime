const { existsSync, copySync } = require('fs-extra')

const { PUBLIC_PATH } = require('../config')
const { logTitle } = require('../helpers/logger')

// Copy files from public folder to Netlify publish folder
const copyPublicFiles = (publishPath) => {
  // Abort if no public/ folder
  if (!existsSync(PUBLIC_PATH)) return

  // Perform copy operation
  if (publishPath !== PUBLIC_PATH) {
    logTitle('🌍️ Copying', PUBLIC_PATH, 'folder to', publishPath)
    copySync(PUBLIC_PATH, publishPath)
  }
}

module.exports = copyPublicFiles
