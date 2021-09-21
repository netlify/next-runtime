const path = require('path')

const verifyPublishDir = ({ netlifyConfig, siteRoot, distDir, failBuild }) => {
  const { publish } = netlifyConfig.build
  const nextSiteNotInProjectRoot = siteRoot !== process.cwd()

  // Publish dir needs to match distDir
  if (
    !publish ||
    (nextSiteNotInProjectRoot && publish !== path.join(siteRoot, distDir)) ||
    (!nextSiteNotInProjectRoot && publish !== path.join(process.cwd(), distDir))
  ) {
    return failBuild(
      `You set your publish directory to "${publish}". Your publish directory should be set to your distDir (defaults to .next or is configured in your next.config.js). If your site is rooted in a subdirectory, your publish directory should be {yourSiteRoot}/{distDir}.`,
    )
  }
}

module.exports = verifyPublishDir
