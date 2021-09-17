const { satisfies } = require('semver')

// This is when the esbuild dynamic import support was added
const REQUIRED_BUILD_VERSION = '>=15.11.5'

const verifyNetlifyBuildVersion = ({ IS_LOCAL, NETLIFY_BUILD_VERSION, failBuild }) => {
  // We check for build version because that's what's available to us, but prompt about the cli because that's what they can upgrade
  if (IS_LOCAL && !satisfies(NETLIFY_BUILD_VERSION, REQUIRED_BUILD_VERSION, { includePrerelease: true })) {
    return failBuild(
      `This version of the Essential Next.js plugin requires netlify-cli@4.4.2 or higher. Please upgrade and try again.
You can do this by running: "npm install -g netlify-cli@latest" or "yarn global add netlify-cli@latest"`,
    )
  }
}

module.exports = verifyNetlifyBuildVersion
