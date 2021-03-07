const { copySync } = require('fs-extra')
const { join } = require('path')
const getNextDistDir = require('./getNextDistDir')

// Copy the static asset from pages/inputPath to out_publish/outputPath
const setupStaticFileForPage = async ({ inputPath, outputPath = null, publishPath }) => {
  // If no outputPath is set, default to the same as inputPath
  outputPath = outputPath || inputPath

  const nextDistDir = await getNextDistDir()

  // Perform copy operation
  copySync(join(nextDistDir, 'serverless', 'pages', inputPath), join(publishPath, outputPath), {
    overwrite: false,
    errorOnExist: true,
  })
}

module.exports = setupStaticFileForPage
