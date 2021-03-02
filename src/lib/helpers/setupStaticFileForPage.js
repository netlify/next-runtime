const { copySync } = require('fs-extra')
const { join } = require('path')
const { NEXT_DIST_DIR } = require('../config')

// Copy the static asset from pages/inputPath to out_publish/outputPath
const setupStaticFileForPage = ({ inputPath, outputPath = null, publishPath }) => {
  // If no outputPath is set, default to the same as inputPath
  outputPath = outputPath || inputPath

  // Perform copy operation
  copySync(join(NEXT_DIST_DIR, 'serverless', 'pages', inputPath), join(publishPath, outputPath), {
    overwrite: false,
    errorOnExist: true,
  })
}

module.exports = setupStaticFileForPage
