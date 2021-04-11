const { join } = require('path')

const { copySync } = require('fs-extra')

const getNextDistDir = require('./getNextDistDir')

// Copy the static asset from pages/inputPath to out_publish/outputPath
const setupStaticFileForPage = async ({ inputPath, outputPath = null, publishPath }) => {
  const nextDistDir = await getNextDistDir()

  // Perform copy operation
  copySync(join(nextDistDir, 'serverless', 'pages', inputPath), join(publishPath, outputPath || inputPath), {
    overwrite: false,
    errorOnExist: true,
  })
}

module.exports = setupStaticFileForPage
