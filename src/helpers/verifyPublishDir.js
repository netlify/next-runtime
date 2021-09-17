const path = require('path')

const verifyPublishDir = ({ netlifyConfig, siteRoot, distDir, failBuild }) => {
  const { publish } = netlifyConfig.build
  const nextSiteNotInProjectRoot = siteRoot !== process.cwd()

  // Publish dir needs to match distDir
  if (
    !publish ||
    (nextSiteNotInProjectRoot && publish !== `${siteRoot}/${distDir}`) ||
    (!nextSiteNotInProjectRoot && publish !== `${process.cwd()}/${distDir}`)
  ) {
    return failBuild(
      'Your publish directory should be set to `distDir` or `{yourSiteRoot}/{distDir}` - where `yourSiteRoot` only matters if you have a monorepo setup and `distDir` is either specifically configured by you in your next.config.js or defaulted to `.next`.',
    )
  }
}

module.exports = verifyPublishDir
