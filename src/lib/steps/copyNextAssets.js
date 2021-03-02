const { join } = require('path')
const { copySync, existsSync } = require('fs-extra')
const { logTitle } = require('../helpers/logger')
const { NEXT_DIST_DIR } = require('../config')

// Copy the NextJS' static assets from NextJS distDir to Netlify publish folder.
// These need to be available for NextJS to work.
const copyNextAssets = (publishPath) => {
  const staticAssetsPath = join(NEXT_DIST_DIR, 'static')
  if (!existsSync(staticAssetsPath)) {
    throw new Error(
      'No static assets found in .next dist (aka no /.next/static). Please check your project configuration. Your next.config.js must be one of `serverless` or `experimental-serverless-trace`. Your build command should include `next build`.',
    )
  }
  logTitle('💼 Copying static NextJS assets to', publishPath)
  copySync(staticAssetsPath, join(publishPath, '_next', 'static'), {
    overwrite: false,
    errorOnExist: true,
  })
}

module.exports = copyNextAssets
