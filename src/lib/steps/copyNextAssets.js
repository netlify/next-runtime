const { join } = require('path')

const { copySync, existsSync } = require('fs-extra')

const getNextDistDir = require('../helpers/getNextDistDir')
const { logTitle } = require('../helpers/logger')

// Copy the NextJS static assets from NextJS distDir to Netlify publish folder.
// These need to be available for NextJS to work.
const copyNextAssets = async (publishPath) => {
  const nextDistDir = await getNextDistDir()
  const staticAssetsPath = join(nextDistDir, 'static')
  if (!existsSync(staticAssetsPath)) {
    throw new Error(
      `No static assets found in distDir "${staticAssetsPath}". Please check your project configuration. Your next.config.js must be one of "serverless" or "experimental-serverless-trace". Your build command should include "next build".`,
    )
  }
  logTitle('💼 Copying static NextJS assets to', publishPath)
  copySync(staticAssetsPath, join(publishPath, '_next', 'static'), {
    overwrite: false,
    errorOnExist: true,
  })
}

module.exports = copyNextAssets
